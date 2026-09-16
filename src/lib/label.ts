// Printable barcode labels for products that have no barcode of their own.
// Every product carries a SKYNET code (a real EAN-13 number in the 200…
// in-store range), rendered here as an SVG barcode any scanner can read.

import type { Product } from '../types';
import { skuLabel } from './util';

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** Bit pattern (95 modules) of an EAN-13 number. */
export function ean13Modules(code: string): string {
  if (!/^\d{13}$/.test(code)) throw new Error('EAN-13 needs 13 digits');
  const d = code.split('').map(Number);
  const parity = PARITY[d[0]];
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  bits += '101';
  return bits;
}

/** SVG barcode with the human-readable digits below. */
export function ean13Svg(code: string, opts: { height?: number; module?: number; text?: boolean } = {}): string {
  const module = opts.module ?? 2, height = opts.height ?? 60, text = opts.text ?? true;
  const bits = ean13Modules(code);
  const w = bits.length * module + 20 * module;
  const h = height + (text ? 16 : 0);
  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue;
    // guard bars extend lower than the digit bars
    const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
    rects += `<rect x="${10 * module + i * module}" y="0" width="${module}" height="${guard || !text ? height : height - 6}" fill="#000"/>`;
  }
  const label = text ? `<text x="${w / 2}" y="${h - 3}" font-family="ui-monospace,Menlo,monospace" font-size="11" text-anchor="middle" fill="#000">${code.slice(0, 1)} ${code.slice(1, 7)} ${code.slice(7)}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${rects}${label}</svg>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** HTML page of labels — 2 columns, sized to fit Avery-style 2⅝" × 1" sheets or plain paper cut by hand. */
export function labelsHtml(products: Product[]): string {
  const cards = products.filter(p => p.sku).map(p => `
    <div class="label">
      <div class="name">${esc(p.name)}</div>
      <div class="meta">${esc(p.vendor || '')}${p.vendor && p.unit ? ' · ' : ''}${esc(p.unit || '')}</div>
      ${ean13Svg(p.sku, { height: 44, module: 1.6 })}
      <div class="sku">SKYNET ${esc(skuLabel(p.sku))}</div>
    </div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>SKYNET labels</title>
<style>
  @page { margin: 10mm; }
  body { font-family: -apple-system, Inter, Segoe UI, sans-serif; margin: 0; padding: 10mm; color: #000; }
  .sheet { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; }
  .label { border: 0.4px dashed #999; border-radius: 3mm; padding: 4mm 4mm 3mm; text-align: center; break-inside: avoid; }
  .name { font-weight: 700; font-size: 13px; line-height: 1.2; min-height: 2.4em; display: flex; align-items: center; justify-content: center; }
  .meta { font-size: 10px; color: #444; margin: 2px 0 6px; min-height: 1.2em; }
  svg { max-width: 100%; height: auto; }
  .sku { font-family: ui-monospace, Menlo, monospace; font-size: 11px; font-weight: 600; margin-top: 3px; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 8px 0 12px; display: flex; gap: 10px; align-items: center; }
  .toolbar button { font: inherit; padding: 8px 16px; border-radius: 8px; border: 1px solid #ccc; background: #007AFF; color: #fff; }
  @media print { .toolbar { display: none; } body { padding: 0; } }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">🖨️ Print ${products.length} label${products.length === 1 ? '' : 's'}</button><span style="font-size:12px;color:#666">Stick the label on the bin, shelf or container — then it scans like any barcode.</span></div>
<div class="sheet">${cards}</div>
<script>setTimeout(function(){ try { window.print(); } catch (e) {} }, 400);</script>
</body></html>`;
}

/** Open the labels in a new tab / window (iPad: share sheet → Print). Falls back to a download. */
export function printLabels(products: Product[]): boolean {
  const html = labelsHtml(products);
  const win = window.open('', '_blank');
  if (win) {
    win.document.open(); win.document.write(html); win.document.close();
    return true;
  }
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'skynet-labels.html'; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  return false;
}
