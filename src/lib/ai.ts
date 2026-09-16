// All AI calls go through the server proxy (/api/claude) — the API key lives
// only in Netlify's environment variables, never on a device.

import { api, ApiError } from './api';

export async function callClaude(messages: any[], maxTokens = 1000): Promise<string> {
  let res: Response;
  try {
    res = await api.claudeStream(messages, maxTokens);
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 503) throw new Error('AI not set up yet — add ANTHROPIC_API_KEY in Netlify (see Settings → AI)');
    throw e;
  }
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('text/event-stream')) {
    // Non-streamed (error) body
    const data = await res.json().catch(() => ({}));
    if (data?.error) throw new Error(data.error?.message || data.error || 'AI error');
    return (data?.content?.[0]?.text || '').trim();
  }
  return (await readAnthropicStream(res.body!)).trim();
}

/** Accumulate the text from an Anthropic Messages SSE stream. Pure — unit-tested in scripts/test-api.mjs. */
export async function readAnthropicStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '';
  const handle = (chunk: string) => {
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue;
      let evt: any;
      try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') text += evt.delta.text;
      else if (evt.type === 'error') throw new Error(evt.error?.message || 'AI error');
      else if (evt.type === 'message_delta' && evt.delta?.stop_reason === 'max_tokens') console.warn('[ai] response truncated at max_tokens');
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) { handle(buffer.slice(0, idx)); buffer = buffer.slice(idx + 2); }
  }
  if (buffer.trim()) handle(buffer);
  return text;
}

/** Ask Claude to read a barcode from a photo. Returns digits or '' if none. */
export async function readBarcodeWithAI(jpegBase64: string): Promise<string> {
  const text = await callClaude([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
      { type: 'text', text: 'Read the barcode number (UPC/EAN/NDC) printed under or near the barcode in this image. Reply with ONLY the digits, no spaces or dashes. If there is no barcode, reply exactly: NONE' },
    ],
  }], 100);
  if (!text || /NONE/i.test(text)) return '';
  return text.replace(/[^0-9]/g, '');
}

export interface InvoiceLine { name: string; quantity: number; upc: string; ndc: string; item_code: string; vendor: string; category: string; unit: string; unit_cost: number }

/** Extract line items from an invoice PDF or photo. */
export async function extractInvoice(base64: string, isPdf: boolean): Promise<InvoiceLine[]> {
  const instructions =
    'You are reading a supplier invoice for a compounding pharmacy in Canada. Extract every product line item. ' +
    'Return ONLY a JSON array (no markdown, no commentary). Each element: ' +
    '{"name": string, "quantity": number, "upc": string, "ndc": string, "item_code": string, "vendor": string, "category": string, "unit": string, "unit_cost": number}. ' +
    'Rules: "name" is the product description INCLUDING strength and pack size (e.g. "Lidocaine HCl USP 100 g"). ' +
    '"quantity" is the number of units shipped (not ordered/back-ordered). ' +
    '"upc" is a 12–14 digit barcode number if printed; "ndc" is an NDC or Canadian DIN number if printed; ' +
    '"item_code" is the supplier\'s own item / catalogue / product number for that line (e.g. "0245-01", "MED12345") — this is very important for matching future invoices. ' +
    '"unit" is the pack unit (each, bottle, 100 g, 500 mL…). Use "" for unknown text fields and 0 for unknown numbers. ' +
    '"vendor" is the supplier who issued the invoice. "unit_cost" is the price per unit before tax. Ignore shipping, tax, deposits and subtotal lines.';
  const content = isPdf
    ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }, { type: 'text', text: instructions }]
    : [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } }, { type: 'text', text: instructions }];
  const text = await callClaude([{ role: 'user', content }], 4000);
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('Could not find any line items in that file');
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed) || !parsed.length) throw new Error('No items found in invoice');
  return parsed.map((x: any) => ({
    name: String(x.name || '').trim(),
    quantity: Math.max(0, Math.round(parseFloat(x.quantity) || 0)),
    upc: String(x.upc || '').replace(/[^0-9]/g, ''),
    ndc: String(x.ndc || x.din || '').trim(),
    item_code: String(x.item_code || x.sku || x.code || '').trim(),
    vendor: String(x.vendor || '').trim(),
    category: String(x.category || '').trim(),
    unit: String(x.unit || '').trim(),
    unit_cost: Math.max(0, parseFloat(x.unit_cost) || 0),
  })).filter((x: InvoiceLine) => x.name);
}
