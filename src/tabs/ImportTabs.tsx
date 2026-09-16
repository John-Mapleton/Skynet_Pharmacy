import { useRef, useState } from 'react';
import type { AppState, Product, ShowToast, TabProps } from '../types';
import { api } from '../lib/api';
import { extractInvoice, type InvoiceLine } from '../lib/ai';
import { fileToBase64, imageToJpegBase64, formatCurrency, findMatches, searchProducts, skuLabel } from '../lib/util';
import { primeAudio } from '../lib/fun';
import { Empty, ProductRow, Sheet } from '../components/ui';

interface ImportLine { name: string; action: 'added' | 'updated' | 'skipped'; product_id?: string; product_name?: string; error?: string }
interface ImportResult { added: number; updated: number; skipped: number; priceChanges: number; errors: string[]; lines?: ImportLine[] }

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
      {r.lines && r.lines.length > 0 && (
        <div className="card" style={{ textAlign: 'left', marginTop: 12, padding: '6px 14px', fontSize: 12 }}>
          {r.lines.slice(0, 40).map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ flexShrink: 0 }}>{l.action === 'added' ? '✨' : l.action === 'updated' ? '📦' : '⚠️'}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}{l.action === 'updated' && l.product_name && l.product_name !== l.name ? <span className="muted"> → {l.product_name}</span> : null}{l.error ? <span style={{ color: 'var(--orange)' }}> — {l.error}</span> : null}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 20 }} />
      <button className="btn btn-p btn-full" onClick={onAgain}>{label}</button>
    </div>
  );
}

// ── AI INVOICE ───────────────────────────────────────────────────────
/** What the reviewer decided for one invoice line. productId null = create a new product. */
interface Decision { productId: string | null; confidence: 'exact' | 'likely' | 'manual' | 'new'; how?: string }

function decide(products: Product[], line: InvoiceLine, focus?: Product): Decision {
  const m = findMatches(products, line);
  if (m.exact) return { productId: m.exact.id, confidence: 'exact', how: m.how };
  if (focus && m.candidates.some(c => c.p.id === focus.id && c.score >= 0.6)) return { productId: focus.id, confidence: 'likely', how: 'name' };
  if (m.candidates[0] && m.candidates[0].score >= 0.75) return { productId: m.candidates[0].p.id, confidence: 'likely', how: 'name' };
  return { productId: null, confidence: 'new' };
}

/** Choose which product an invoice line belongs to (or "new"). */
function MatchPicker({ line, products, current, onPick, onClose }: { line: InvoiceLine; products: Product[]; current: Decision; onPick: (d: Decision) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const suggestions = findMatches(products, line).candidates;
  const list = q.trim() ? searchProducts(products, q, 30) : [];
  return (
    <Sheet title="Which product is this?" onClose={onClose}>
      <div className="notice info" style={{ fontSize: 12 }}>Invoice line: <strong>{line.name}</strong>{line.item_code ? <span className="muted"> · item # {line.item_code}</span> : null}</div>
      <button className={`btn btn-full ${current.productId === null ? 'btn-p' : 'btn-s'}`} style={{ marginBottom: 12 }} onClick={() => onPick({ productId: null, confidence: 'new' })}>✨ Create as a NEW product</button>
      {suggestions.length > 0 && !q.trim() && (
        <>
          <div className="sec-label" style={{ margin: '0 0 6px' }}>Similar products</div>
          <div className="card-row" style={{ marginBottom: 12 }}>
            {suggestions.map(({ p, score }) => <ProductRow key={p.id} p={p} icon="🔗" sub={`${Math.round(score * 100)}% similar · ${p.on_hand} on hand · ${p.vendor || '—'}`} onClick={() => onPick({ productId: p.id, confidence: 'manual' })} />)}
          </div>
        </>
      )}
      <input className="inp" placeholder="Search all products…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 8 }} />
      {q.trim() && (list.length ? <div className="card-row">{list.map(p => <ProductRow key={p.id} p={p} icon="🔗" onClick={() => onPick({ productId: p.id, confidence: 'manual' })} />)}</div> : <Empty icon="🔍" title="No products match" />)}
    </Sheet>
  );
}

/**
 * The whole invoice flow: upload → Claude reads it → review matches → import.
 * With `focus` it runs inside a product's file: lines that belong to that
 * product are pre-selected and any line can be linked to it with one tap.
 */
export function InvoiceFlow({ products, applyState, showToast, focus, onFinished }: {
  products: Product[]; applyState: (s: AppState) => void; showToast: ShowToast; focus?: Product; onFinished?: () => void;
}) {
  const [stage, setStage] = useState<'upload' | 'processing' | 'review' | 'importing' | 'done'>('upload');
  const [items, setItems] = useState<InvoiceLine[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const byId = (id: string | null) => (id ? products.find(p => p.id === id) : undefined);

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
      const ds = lines.map(l => decide(products, l, focus));
      setItems(lines); setDecisions(ds);
      setChecked(focus ? ds.map(d => d.productId === focus.id) : lines.map(() => true));
      setStage('review');
      if (focus && !ds.some(d => d.productId === focus.id)) showToast(`No line obviously matched ${focus.name} — tap "This is ${focus.name}" on the right line`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Could not read invoice', 'error'); setStage('upload');
    }
  }

  const edit = (i: number, k: keyof InvoiceLine, v: string) => {
    setItems(list => list.map((it, j) => j === i ? { ...it, [k]: k === 'quantity' || k === 'unit_cost' ? (parseFloat(v) || 0) : v } : it));
    // re-evaluate automatic matches when the name is corrected
    if (k === 'name') setDecisions(ds => ds.map((d, j) => j === i && d.confidence !== 'manual' ? decide(products, { ...items[i], name: v }, focus) : d));
  };

  async function importSelected() {
    const toImport = items.map((it, i) => ({ it, d: decisions[i] })).filter((_, i) => checked[i]);
    if (!toImport.length) return;
    primeAudio();
    setStage('importing');
    try {
      const payload = toImport.map(({ it, d }) => ({ ...it, product_id: d.productId || undefined, create: d.productId ? undefined : true }));
      const r = await api.op<ImportResult>({ op: 'import', mode: 'invoice', items: payload });
      applyState(r.state); setResult(r); setStage('done');
    } catch (e: any) { showToast(e.message, 'error'); setStage('review'); }
  }

  const selectedCount = checked.filter(Boolean).length;
  const newCount = decisions.filter((d, i) => checked[i] && !d.productId).length;

  function matchLabel(it: InvoiceLine, d: Decision) {
    const m = byId(d.productId);
    if (!m) return { text: '✨ NEW product will be created', cls: 'var(--accent)' };
    const priceUp = it.unit_cost > 0 && Math.abs(it.unit_cost - m.cost_per_unit) > 0.001;
    const head = d.confidence === 'exact' ? '✓ Matches' : d.confidence === 'likely' ? '≈ Probably' : '🔗 Linked to';
    return {
      text: `${head} "${m.name}" (${m.on_hand} on hand)${priceUp ? ` · price ${formatCurrency(m.cost_per_unit)} → ${formatCurrency(it.unit_cost)}` : ''}`,
      cls: d.confidence === 'likely' ? 'var(--orange)' : priceUp ? 'var(--purple)' : 'var(--green)',
    };
  }

  return (
    <div>
      {stage === 'upload' && (
        <>
          <div className="scanbox" onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{focus ? `Upload an invoice with ${focus.name}` : 'Upload an invoice'}</div>
            <div className="muted">PDF or photo — Claude reads the line items, you confirm the matches, then import</div>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFile} style={{ display: 'none' }} />
          <div className="hint">Lines are matched to your products by barcode, DIN, vendor item number or name. Anything uncertain is shown for you to confirm — nothing is duplicated silently. Vendor item numbers are remembered so the next invoice matches automatically.</div>
        </>
      )}
      {stage === 'processing' && <div className="loader" style={{ padding: 48, flexDirection: 'column' }}><div className="spin lg" /><div>Reading {fileName}…</div><div className="muted">This can take 10–20 seconds</div></div>}
      {stage === 'review' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Found <strong>{items.length}</strong> line{items.length === 1 ? '' : 's'} · <strong>{selectedCount}</strong> selected{newCount ? <> · <strong style={{ color: 'var(--accent)' }}>{newCount} new</strong></> : null} · tap a value to fix it, tap the match to change it
          </div>
          <div className="flex" style={{ marginBottom: 12 }}>
            <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setChecked(items.map(() => true))}>Select all</button>
            <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setChecked(items.map(() => false))}>Clear</button>
          </div>
          {items.map((it, i) => {
            const d = decisions[i];
            const m = matchLabel(it, d);
            return (
              <div key={i} className="inv-item" style={focus && d.productId === focus.id ? { boxShadow: '0 0 0 2px var(--accent-border)' } : undefined}>
                <input type="checkbox" className="inv-chk" checked={!!checked[i]} onChange={e => setChecked(c => c.map((v, j) => j === i ? e.target.checked : v))} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input className="inp" style={{ padding: '6px 8px', fontSize: 13, fontWeight: 600, marginBottom: 6, background: 'var(--surface2)' }} value={it.name} onChange={e => edit(i, 'name', e.target.value)} />
                  <div className="flex" style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>
                    <span className="muted">Qty</span><input className="inp mono" style={{ width: 64, padding: '4px 6px', fontSize: 13, background: 'var(--surface2)' }} type="number" value={it.quantity} onChange={e => edit(i, 'quantity', e.target.value)} />
                    <span className="muted">$/unit</span><input className="inp mono" style={{ width: 84, padding: '4px 6px', fontSize: 13, background: 'var(--surface2)' }} type="number" step="0.01" value={it.unit_cost} onChange={e => edit(i, 'unit_cost', e.target.value)} />
                  </div>
                  <button className="match-btn" style={{ color: m.cls }} onClick={() => setPicking(i)}>{m.text} <span style={{ opacity: .6 }}>· change</span></button>
                  {focus && d.productId !== focus.id && (
                    <button className="btn-link" style={{ padding: '2px 0', fontSize: 12 }} onClick={() => { setDecisions(ds => ds.map((x, j) => j === i ? { productId: focus.id, confidence: 'manual' } : x)); setChecked(c => c.map((v, j) => j === i ? true : v)); }}>→ This is {focus.name}</button>
                  )}
                  {(it.upc || it.ndc || it.item_code || it.vendor) && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{[it.upc && `UPC ${it.upc}`, it.ndc && `DIN ${it.ndc}`, it.item_code && `item # ${it.item_code}`, it.vendor].filter(Boolean).join(' · ')}</div>}
                </div>
              </div>
            );
          })}
          <div className="flex" style={{ marginTop: 14 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={importSelected} disabled={selectedCount === 0}>Import {selectedCount} line{selectedCount === 1 ? '' : 's'}</button>
            <button className="btn btn-w" onClick={() => { setStage('upload'); setItems([]); }}>Cancel</button>
          </div>
          {picking != null && (
            <MatchPicker line={items[picking]} products={products} current={decisions[picking]} onClose={() => setPicking(null)}
              onPick={d => { setDecisions(ds => ds.map((x, j) => j === picking ? d : x)); setPicking(null); }} />
          )}
        </>
      )}
      {stage === 'importing' && <div className="loader" style={{ padding: 48 }}><div className="spin lg" /><div>Saving…</div></div>}
      {stage === 'done' && result && <ImportDone r={result} label={focus ? `Back to ${focus.name}` : 'Import another invoice'} onAgain={() => { if (onFinished) onFinished(); else { setStage('upload'); setItems([]); setResult(null); } }} />}
    </div>
  );
}

export function InvoiceTab({ products, applyState, showToast }: TabProps) {
  return (
    <div className="tab-in pad">
      <div className="sec-label">AI invoice import</div>
      <InvoiceFlow products={products} applyState={applyState} showToast={showToast} />
      <div className="tab-spacer" />
    </div>
  );
}

// ── EXCEL / CSV ──────────────────────────────────────────────────────
const FIELDS = [
  { key: 'name', label: 'Product name *', required: true, kws: ['name', 'product', 'description', 'item'] },
  { key: 'upc', label: 'UPC barcode', kws: ['upc', 'barcode', 'ean'] },
  { key: 'ndc', label: 'NDC / DIN', kws: ['ndc', 'din'] },
  { key: 'item_code', label: 'Vendor item # / other code', kws: ['item code', 'item number', 'item #', 'sku', 'code', 'catalog', 'catalogue', 'part'] },
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
  const order = ['name', 'upc', 'ndc', 'cost_per_unit', 'on_hand', 'reorder_threshold', 'vendor', 'category', 'unit', 'item_code'];
  const used = new Set<string>();
  const out: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[_\-]+/g, ' ').trim();
  for (const key of order) {
    const f = FIELDS.find(x => x.key === key)!;
    const cands = headers.filter(h => !used.has(h));
    const exact = cands.find(h => f.kws.includes(norm(h)));
    const partial = cands.find(h => f.kws.some(k => norm(h).includes(k)) && !(key === 'unit' && /cost|price/.test(norm(h))) && !(key === 'item_code' && /skynet/.test(norm(h))));
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
          <div className="hint">Products are matched by barcode, NDC/DIN, vendor item # or name — re-importing an updated sheet updates existing products instead of duplicating them. An "On hand" column sets the count. Products without a barcode automatically get a SKYNET code ({skuLabel('2000000000017')}-style) you can print as a label.</div>
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
