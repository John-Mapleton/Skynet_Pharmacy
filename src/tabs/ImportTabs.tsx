import { useRef, useState } from 'react';
import type { TabProps } from '../types';
import { api } from '../lib/api';
import { extractInvoice, type InvoiceLine } from '../lib/ai';
import { fileToBase64, imageToJpegBase64, formatCurrency, cleanBarcode } from '../lib/util';
import { Empty } from '../components/ui';

interface ImportResult { added: number; updated: number; skipped: number; priceChanges: number; errors: string[] }

function ImportDone({ r, onAgain, label }: { r: ImportResult; onAgain: () => void; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 8px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Import complete</div>
      <div className="muted" style={{ fontSize: 14, marginBottom: 4 }}>{r.added} new product{r.added === 1 ? '' : 's'} added</div>
      <div className="muted" style={{ fontSize: 14, marginBottom: 4 }}>{r.updated} existing product{r.updated === 1 ? '' : 's'} updated</div>
      {r.priceChanges > 0 && <div style={{ fontSize: 14, color: 'var(--purple)', fontWeight: 600, marginBottom: 4 }}>💲 {r.priceChanges} price change{r.priceChanges === 1 ? '' : 's'} detected — see Reports</div>}
      {r.skipped > 0 && <div style={{ fontSize: 13, color: 'var(--orange)', marginBottom: 4 }}>{r.skipped} row{r.skipped === 1 ? '' : 's'} skipped</div>}
      {r.errors.length > 0 && <div className="notice warn" style={{ textAlign: 'left', marginTop: 10 }}>{r.errors.slice(0, 5).map((e, i) => <div key={i}>• {e}</div>)}</div>}
      <div style={{ height: 20 }} />
      <button className="btn btn-p btn-full" onClick={onAgain}>{label}</button>
    </div>
  );
}

// ── AI INVOICE ───────────────────────────────────────────────────────
export function InvoiceTab({ products, applyState, showToast }: TabProps) {
  const [stage, setStage] = useState<'upload' | 'processing' | 'review' | 'importing' | 'done'>('upload');
  const [items, setItems] = useState<InvoiceLine[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setFileName(file.name); setStage('processing');
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (isPdf && file.size > 4.5 * 1024 * 1024) throw new Error('PDF is too large (max 4.5 MB) — take a photo of it instead');
      const base64 = isPdf ? await fileToBase64(file) : await imageToJpegBase64(file);
      const lines = await extractInvoice(base64, isPdf);
      setItems(lines); setChecked(lines.map(() => true)); setStage('review');
    } catch (err: any) {
      showToast(err?.message || 'Could not read invoice', 'error'); setStage('upload');
    }
  }

  const edit = (i: number, k: keyof InvoiceLine, v: string) => setItems(list => list.map((it, j) => j === i ? { ...it, [k]: k === 'quantity' || k === 'unit_cost' ? (parseFloat(v) || 0) : v } : it));

  async function importSelected() {
    const toImport = items.filter((_, i) => checked[i]);
    if (!toImport.length) return;
    setStage('importing');
    try {
      const r = await api.op<ImportResult>({ op: 'import', mode: 'invoice', items: toImport });
      applyState(r.state); setResult(r); setStage('done');
    } catch (e: any) { showToast(e.message, 'error'); setStage('review'); }
  }

  const selectedCount = checked.filter(Boolean).length;
  const matchInfo = (it: InvoiceLine) => {
    const m = products.find(p => (it.upc && cleanBarcode(p.upc) === cleanBarcode(it.upc)) || (it.ndc && p.ndc === it.ndc) || p.name.toLowerCase() === it.name.toLowerCase());
    if (!m) return { text: 'NEW product', cls: 'var(--accent)' };
    const priceUp = it.unit_cost > 0 && Math.abs(it.unit_cost - m.cost_per_unit) > 0.001;
    return { text: `Matches "${m.name}" (${m.on_hand} on hand)${priceUp ? ` · price ${formatCurrency(m.cost_per_unit)} → ${formatCurrency(it.unit_cost)}` : ''}`, cls: priceUp ? 'var(--purple)' : 'var(--green)' };
  };

  return (
    <div className="tab-in pad">
      <div className="sec-label">AI invoice import</div>
      {stage === 'upload' && (
        <>
          <div className="scanbox" onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Upload an invoice</div>
            <div className="muted">PDF or photo — Claude reads the line items, you review, then import</div>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFile} style={{ display: 'none' }} />
          <div className="hint">Matching products get the quantity added and the new price recorded. Unknown products are created.</div>
        </>
      )}
      {stage === 'processing' && <div className="loader" style={{ padding: 48, flexDirection: 'column' }}><div className="spin lg" /><div>Reading {fileName}…</div><div className="muted">This can take 10–20 seconds</div></div>}
      {stage === 'review' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Found <strong>{items.length}</strong> items · <strong>{selectedCount}</strong> selected · tap a value to fix it</div>
          <div className="flex" style={{ marginBottom: 12 }}>
            <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setChecked(items.map(() => true))}>Select all</button>
            <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setChecked(items.map(() => false))}>Clear</button>
          </div>
          {items.map((it, i) => {
            const m = matchInfo(it);
            return (
              <div key={i} className="inv-item">
                <input type="checkbox" className="inv-chk" checked={!!checked[i]} onChange={e => setChecked(c => c.map((v, j) => j === i ? e.target.checked : v))} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input className="inp" style={{ padding: '6px 8px', fontSize: 13, fontWeight: 600, marginBottom: 6, background: 'var(--surface2)' }} value={it.name} onChange={e => edit(i, 'name', e.target.value)} />
                  <div className="flex" style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>
                    <span className="muted">Qty</span><input className="inp mono" style={{ width: 64, padding: '4px 6px', fontSize: 13, background: 'var(--surface2)' }} type="number" value={it.quantity} onChange={e => edit(i, 'quantity', e.target.value)} />
                    <span className="muted">$/unit</span><input className="inp mono" style={{ width: 84, padding: '4px 6px', fontSize: 13, background: 'var(--surface2)' }} type="number" step="0.01" value={it.unit_cost} onChange={e => edit(i, 'unit_cost', e.target.value)} />
                  </div>
                  <div style={{ fontSize: 11, marginTop: 6, color: m.cls, fontWeight: 600 }}>{m.text}</div>
                  {(it.upc || it.ndc || it.vendor) && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{[it.upc && `UPC ${it.upc}`, it.ndc && `NDC ${it.ndc}`, it.vendor].filter(Boolean).join(' · ')}</div>}
                </div>
              </div>
            );
          })}
          <div className="flex" style={{ marginTop: 14 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={importSelected} disabled={selectedCount === 0}>Import {selectedCount} item{selectedCount === 1 ? '' : 's'}</button>
            <button className="btn btn-w" onClick={() => { setStage('upload'); setItems([]); }}>Cancel</button>
          </div>
        </>
      )}
      {stage === 'importing' && <div className="loader" style={{ padding: 48 }}><div className="spin lg" /><div>Saving…</div></div>}
      {stage === 'done' && result && <ImportDone r={result} label="Import another invoice" onAgain={() => { setStage('upload'); setItems([]); setResult(null); }} />}
      <div className="tab-spacer" />
    </div>
  );
}

// ── EXCEL / CSV ──────────────────────────────────────────────────────
const FIELDS = [
  { key: 'name', label: 'Product name *', required: true, kws: ['name', 'product', 'description', 'item'] },
  { key: 'upc', label: 'UPC barcode', kws: ['upc', 'barcode', 'ean'] },
  { key: 'ndc', label: 'NDC / DIN', kws: ['ndc', 'din'] },
  { key: 'vendor', label: 'Vendor', kws: ['vendor', 'supplier', 'manufacturer'] },
  { key: 'category', label: 'Category', kws: ['category', 'type', 'class'] },
  { key: 'unit', label: 'Unit', kws: ['unit', 'uom'] },
  { key: 'cost_per_unit', label: 'Unit cost', kws: ['cost', 'price'] },
  { key: 'on_hand', label: 'On hand quantity', kws: ['on hand', 'onhand', 'quantity', 'qty', 'stock', 'inventory', 'count'] },
  { key: 'reorder_threshold', label: 'Reorder at', kws: ['reorder', 'threshold', 'min', 'minimum', 'par'] },
];


/** Guess which spreadsheet column feeds each field. Exact header matches win,
 *  then "contains" matches; specific fields (cost) are claimed before generic
 *  ones (unit) so "Unit Cost" never lands in the Unit column. */
export function guessMapping(headers: string[]): Record<string, string> {
  const order = ['name', 'upc', 'ndc', 'cost_per_unit', 'on_hand', 'reorder_threshold', 'vendor', 'category', 'unit'];
  const used = new Set<string>();
  const out: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[_\-]+/g, ' ').trim();
  for (const key of order) {
    const f = FIELDS.find(x => x.key === key)!;
    const cands = headers.filter(h => !used.has(h));
    const exact = cands.find(h => f.kws.includes(norm(h)));
    const partial = cands.find(h => f.kws.some(k => norm(h).includes(k)) && !(key === 'unit' && /cost|price/.test(norm(h))));
    const pick = exact || partial;
    if (pick) { out[key] = pick; used.add(pick); }
  }
  return out;
}

export function ExcelTab({ applyState, showToast }: TabProps) {
  const [stage, setStage] = useState<'upload' | 'map' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setReading(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const h = (data[0] || []).map((x: any) => String(x ?? '').trim());
      const r = data.slice(1).filter(row => row.some((c: any) => String(c ?? '').trim() !== ''));
      if (!h.length || !r.length) throw new Error('That file has no data rows');
      setHeaders(h); setRows(r);
      setMapping(guessMapping(h)); setStage('map');
    } catch (err: any) { showToast('Could not read file: ' + (err?.message || 'Unknown'), 'error'); }
    setReading(false);
  }

  async function doImport() {
    if (!mapping.name) { showToast('Map at least the Product name column', 'error'); return; }
    setStage('importing');
    const items = rows.map(row => {
      const item: Record<string, any> = {};
      for (const f of FIELDS) {
        const col = mapping[f.key]; if (!col) continue;
        const idx = headers.indexOf(col); if (idx < 0) continue;
        const v = row[idx];
        if (v === '' || v == null) continue;
        item[f.key] = v;
      }
      return item;
    });
    try {
      const r = await api.op<ImportResult>({ op: 'import', mode: 'excel', items });
      applyState(r.state); setResult(r); setStage('done');
    } catch (e: any) { showToast(e.message, 'error'); setStage('map'); }
  }

  return (
    <div className="tab-in pad">
      <div className="sec-label">Spreadsheet import</div>
      {stage === 'upload' && (
        <>
          <div className="scanbox" onClick={() => !reading && fileRef.current?.click()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{reading ? <div className="spin lg" style={{ margin: '0 auto' }} /> : '📊'}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{reading ? 'Reading…' : 'Upload a spreadsheet'}</div>
            <div className="muted">.xlsx, .xls or .csv — columns are auto-detected</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          <div className="hint">Products are matched by barcode, NDC or name — re-importing an updated sheet updates existing products instead of duplicating them. An "On hand" column sets the count.</div>
        </>
      )}
      {stage === 'map' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Found <strong>{rows.length}</strong> rows · match your columns:</div>
          {FIELDS.map(f => (
            <div key={f.key} className="ig">
              <label className="lbl">{f.label}</label>
              <select className="inp" value={mapping[f.key] || ''} onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}>
                <option value="">— not in file —</option>
                {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
          <div className="card" style={{ marginBottom: 14, fontSize: 12 }}>
            <div className="kv-lbl" style={{ marginBottom: 6 }}>Preview (first row)</div>
            {FIELDS.filter(f => mapping[f.key]).map(f => <div key={f.key}><span className="muted">{f.label.replace(' *', '')}:</span> {String(rows[0]?.[headers.indexOf(mapping[f.key])] ?? '')}</div>)}
          </div>
          <div className="flex">
            <button className="btn btn-p" style={{ flex: 1 }} onClick={doImport} disabled={!mapping.name}>Import {rows.length} rows</button>
            <button className="btn btn-w" onClick={() => setStage('upload')}>Cancel</button>
          </div>
        </>
      )}
      {stage === 'importing' && <div className="loader" style={{ padding: 48 }}><div className="spin lg" /><div>Importing {rows.length} rows…</div></div>}
      {stage === 'done' && result && <ImportDone r={result} label="Import another file" onAgain={() => { setStage('upload'); setRows([]); setHeaders([]); setResult(null); }} />}
      {stage === 'done' && !result && <Empty icon="📊" title="Nothing imported" />}
      <div className="tab-spacer" />
    </div>
  );
}
