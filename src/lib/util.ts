import type { Product, StockStatus } from '../types';
import { cleanBarcode, normCode, findByCode, skuLabel, nameKey, findMatches, nameSimilarity, scanCandidates, isSku } from '../../netlify/lib/match';

// Matching / identity helpers are shared with the server so both sides agree.
export { cleanBarcode, normCode, findByCode, skuLabel, nameKey, findMatches, nameSimilarity, scanCandidates, isSku };

export function stockStatus(p: Product): StockStatus {
  if (p.on_hand <= 0) return 'd';
  if (p.on_hand <= (p.reorder_threshold ?? 10)) return 'w';
  return 'a';
}

export const formatCurrency = (n: number) =>
  '$' + (Number(n) || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

/** The one-line identifier shown under a product name. */
export function productCodeLine(p: Product): string {
  const parts: string[] = [];
  if (p.upc) parts.push(p.upc);
  if (p.ndc) parts.push(`DIN ${p.ndc}`);
  if (!parts.length) parts.push(`SKYNET ${skuLabel(p.sku) || '—'} · no barcode`);
  return parts.join(' · ');
}

/** Search products by name / any code / vendor / category. "#42" or "42" finds SKYNET code #0042. */
export function searchProducts(products: Product[], q: string, limit = Infinity): Product[] {
  const s = q.trim().toLowerCase();
  if (!s) return products.slice(0, limit);
  const code = normCode(s);
  const digits = cleanBarcode(s);
  const byCode = findByCode(products, s);
  const key = nameKey(s);
  const out = products.filter(p =>
    p === byCode ||
    p.name.toLowerCase().includes(s) ||
    (key && nameKey(p.name).includes(key)) ||
    (p.vendor || '').toLowerCase().includes(s) ||
    (p.category || '').toLowerCase().includes(s) ||
    (p.ndc || '').toLowerCase().includes(s) ||
    (code.length >= 3 && (normCode(p.upc).includes(code) || normCode(p.ndc).includes(code) || p.codes.some(c => c.includes(code)))) ||
    (digits.length >= 2 && s.startsWith('#') && skuLabel(p.sku).includes(digits)));
  return out.slice(0, limit);
}

/** @deprecated use findByCode — kept so older call sites keep working */
export const findByBarcode = findByCode;

/** Convert any image file (incl. iPhone HEIC) to a downscaled JPEG base64 string. */
export function imageToJpegBase64(file: File, max = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsDataURL(file);
  });
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}

export function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function productsToCsv(products: Product[]): string {
  const cols: (keyof Product)[] = ['name', 'sku', 'upc', 'ndc', 'codes', 'vendor', 'category', 'unit', 'cost_per_unit', 'on_hand', 'reorder_threshold', 'last_counted', 'last_updated'];
  const head = ['Product Name', 'SKYNET Code', 'UPC', 'NDC/DIN', 'Other Codes', 'Vendor', 'Category', 'Unit', 'Unit Cost', 'On Hand', 'Reorder At', 'Last Counted', 'Last Updated'];
  return [head.join(','), ...products.map(p => cols.map(c => csvEscape(Array.isArray(p[c]) ? (p[c] as string[]).join(' ') : p[c])).join(','))].join('\n');
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
