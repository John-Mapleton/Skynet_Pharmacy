import { useState } from 'react';
import type { AppState, Product, ShowToast, TabProps, Transaction } from '../types';
import { api } from '../lib/api';
import { formatCurrency, searchProducts, timeAgo, formatDate, stockStatus, skuLabel, normCode } from '../lib/util';
import { printLabels } from '../lib/label';
import { Sheet, ProductRow, Empty, SkullAlarm, ProductSummary } from '../components/ui';
import { BarcodeScannerSheet } from '../components/BarcodeScanner';
import { TxCard } from './ReportsTab';
import { ReceiveForm, UseForm, alarmOf, type AlarmInfo } from './StockTabs';
import { CountForm } from './ScanTab';
import { InvoiceFlow } from './ImportTabs';

type Form = { name: string; upc: string; ndc: string; codes: string; vendor: string; category: string; unit: string; cost_per_unit: string; reorder_threshold: string; on_hand: string };
const blank: Form = { name: '', upc: '', ndc: '', codes: '', vendor: '', category: '', unit: 'each', cost_per_unit: '', reorder_threshold: '10', on_hand: '0' };

/**
 * "No barcode" = nothing on the package that scans: no UPC, no NDC/DIN, and no
 * extra code that is itself a barcode (8–14 digits). Vendor item numbers like
 * "S13894BXX" don't count — they're learned from invoices, not printed as a
 * scannable barcode, so those products still need a SKYNET label.
 */
const isBarcodeLike = (c: string) => /^\d{8,14}$/.test(normCode(c));
export const hasNoBarcode = (p: Product) => !p.upc && !p.ndc && !(p.codes || []).some(isBarcodeLike);

export function ProductsTab({ products, applyState, showToast }: TabProps) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'nocode'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);

  const list = searchProducts(products, q).filter(p =>
    filter === 'all' ? true : filter === 'nocode' ? hasNoBarcode(p) : stockStatus(p) === (filter === 'low' ? 'w' : 'd'));
  const noCodeCount = products.filter(hasNoBarcode).length;
  // keep the open detail in sync with fresh state
  const liveDetail = detail ? products.find(p => p.id === detail.id) || null : null;

  return (
    <div className="tab-in">
      <div className="sbar">
        <div className="flex">
          <input className="inp" placeholder="Search name, barcode, vendor, #…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-p btn-sm" style={{ flexShrink: 0, padding: '12px 16px' }} onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
        <div className="chips" style={{ marginTop: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {([['all', `All · ${products.length}`], ['low', 'Low'], ['out', 'Out'], ['nocode', `No barcode${noCodeCount ? ` · ${noCodeCount}` : ''}`]] as const).map(([k, l]) => (
            <button key={k} className={`chip ${filter === k ? 'on' : ''}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setFilter(k)}>{l}</button>
          ))}
          {list.length > 0 && (filter === 'nocode' || q) && (
            <button className="chip" style={{ whiteSpace: 'nowrap', marginLeft: 'auto' }} title="Print SKYNET barcode labels for these products"
              onClick={() => { if (!printLabels(list.slice(0, 200))) showToast('Labels saved as a file — open it and print', 'info'); }}>🏷️ Labels · {Math.min(list.length, 200)}</button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty icon={filter === 'nocode' ? '🏷️' : '🔍'} title={q || filter !== 'all' ? (filter === 'nocode' && !q ? 'Every product has a barcode' : 'No results') : 'No products yet'}
          sub={!q && filter === 'all' && 'Tap + Add, or use the Invoice / Import tabs to bulk-add.'} />
      ) : (
        <div className="card-row" style={{ margin: '8px 16px 0' }}>
          {list.map(p => <ProductRow key={p.id} p={p} onClick={() => { setDetail(p); setEditing(false); }} />)}
        </div>
      )}
      {filter === 'nocode' && list.length > 0 && <div className="hint" style={{ padding: '0 24px' }}>These products have no manufacturer barcode. Each one still has a SKYNET code — tap 🏷️ Labels to print stickers, or open the product and tap "Print label".</div>}
      <div className="tab-spacer" />

      {showAdd && <ProductFormSheet mode="add" applyState={applyState} showToast={showToast} onClose={() => setShowAdd(false)} />}
      {liveDetail && !editing && <ProductDetailSheet p={liveDetail} products={products} applyState={applyState} showToast={showToast} onClose={() => setDetail(null)} onEdit={() => setEditing(true)} />}
      {liveDetail && editing && (
        <ProductFormSheet mode="edit" product={liveDetail} applyState={applyState} showToast={showToast} onClose={() => { setEditing(false); setDetail(null); }} />
      )}
    </div>
  );
}

// ── Detail (the product's "file") ────────────────────────────────────
type DetailMode = 'view' | 'count' | 'receive' | 'use' | 'invoice';

export function ProductDetailSheet({ p, products, applyState, showToast, onClose, onEdit }: {
  p: Product; products: Product[]; applyState: (s: AppState) => void; showToast: ShowToast; onClose: () => void; onEdit: () => void;
}) {
  const [history, setHistory] = useState<Transaction[] | null>(null);
  const [mode, setMode] = useState<DetailMode>('view');
  const [alarm, setAlarm] = useState<AlarmInfo | null>(null);
  async function loadHistory() {
    try { setHistory((await api.transactions({ product_id: p.id, limit: 30 })).transactions); } catch { setHistory([]); }
  }
  const st = stockStatus(p);
  const back = () => { setMode('view'); if (history) loadHistory(); };
  const titles: Record<DetailMode, string> = { view: p.name, count: 'Count', receive: 'Receive', use: 'Use / dispense', invoice: 'Receive from invoice' };

  if (mode === 'invoice') {
    return (
      <Sheet title={titles.invoice} onClose={back}>
        <InvoiceFlow products={products} applyState={applyState} showToast={showToast} focus={p} onFinished={back} />
      </Sheet>
    );
  }

  return (
    <Sheet title={titles[mode]} onClose={mode === 'view' ? onClose : back}
      right={mode === 'view' ? <button className="btn btn-s btn-sm" style={{ color: 'var(--accent)' }} onClick={onEdit}>✏️ Edit</button> : undefined}>
      {mode !== 'view' && (
        <>
          <ProductSummary p={p} />
          {mode === 'count' && <CountForm p={p} applyState={applyState} showToast={showToast} onDone={r => { setAlarm(alarmOf(r)); back(); }} onBack={back} />}
          {mode === 'receive' && <ReceiveForm p={p} applyState={applyState} showToast={showToast} onDone={back} onBack={back} />}
          {mode === 'use' && <UseForm p={p} applyState={applyState} showToast={showToast} onDone={r => { setAlarm(alarmOf(r)); back(); }} onBack={back} />}
        </>
      )}
      {mode === 'view' && (
        <>
          <div className="grid2" style={{ gap: 10, marginBottom: 14 }}>
            {([
              ['On hand', p.on_hand, st === 'd' ? 'var(--red)' : st === 'w' ? 'var(--orange)' : 'var(--accent)'],
              ['Unit cost', formatCurrency(p.cost_per_unit), null],
              ['Reorder at', p.reorder_threshold, 'var(--orange)'],
              ['Total value', formatCurrency(p.on_hand * p.cost_per_unit), null],
            ] as [string, string | number, string | null][]).map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--surface2)', padding: 12, borderRadius: 10 }}>
                <div className="kv-lbl" style={{ marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: c || 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>
          {st !== 'a' && <div className={`notice ${st === 'd' ? 'err' : 'warn'}`} style={{ marginBottom: 12 }}>{st === 'd' ? '🚨 Out of stock — reorder' : `⚠️ Low stock — ${p.on_hand} left, reorder at ${p.reorder_threshold}`}</div>}

          <div className="sec-label" style={{ margin: '0 0 8px' }}>Actions</div>
          <div className="actions" style={{ marginBottom: 14 }}>
            {([['count', '📋', 'Count'], ['receive', '📦', 'Receive'], ['use', '➖', 'Use'], ['invoice', '🧾', 'From invoice']] as [DetailMode, string, string][]).map(([m, ico, l]) => (
              <button key={m} className="action" onClick={() => setMode(m)} disabled={m === 'use' && p.on_hand <= 0}><span className="action-ico">{ico}</span>{l}</button>
            ))}
            <button className="action" onClick={() => { if (!printLabels([p])) showToast('Label saved as a file — open it and print', 'info'); }}><span className="action-ico">🏷️</span>Print label</button>
          </div>

          <div className="sec-label" style={{ margin: '0 0 4px' }}>Identifiers</div>
          {([['SKYNET code', `${skuLabel(p.sku)}  ·  ${p.sku}`], ['UPC', p.upc], ['NDC / DIN', p.ndc], ['Other codes', (p.codes || []).join(', ')]] as [string, string | null][]).filter(([, v]) => v).map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: 13 }}>{l}</span>
              <span style={{ fontSize: 13, textAlign: 'right', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
          {!p.upc && !p.ndc && <div className="hint" style={{ textAlign: 'left', marginTop: 6 }}>No manufacturer barcode. Scan it with the 📷 on the Edit form when you find it, or print the SKYNET label and scan that.</div>}

          <div className="sec-label" style={{ margin: '14px 0 4px' }}>Details</div>
          {([['Vendor', p.vendor], ['Category', p.category], ['Unit', p.unit],
            ['Last counted', p.last_counted ? `${timeAgo(p.last_counted)} · ${formatDate(p.last_counted)}` : 'Never'],
            ['Last updated', timeAgo(p.last_updated)]] as [string, string | null][]).filter(([, v]) => v).map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: 13 }}>{l}</span>
              <span style={{ fontSize: 13, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            {history === null ? (
              <button className="btn-link" onClick={loadHistory}>Show recent history ↓</button>
            ) : history.length === 0 ? <div className="muted">No history yet</div> : (
              <>
                <div className="sec-label" style={{ margin: '0 0 8px' }}>Recent history</div>
                {history.map(tx => <TxCard key={tx.id} tx={tx} />)}
              </>
            )}
          </div>
          <button className="btn btn-s btn-full" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
        </>
      )}
      {alarm && <SkullAlarm productName={alarm.name} newQty={alarm.qty} threshold={alarm.threshold} onClose={() => setAlarm(null)} />}
    </Sheet>
  );
}

// ── Add / Edit form ──────────────────────────────────────────────────
export function ProductFormSheet({ mode, product, applyState, showToast, onClose, onSaved, initialUpc, initial }: {
  mode: 'add' | 'edit'; product?: Product; applyState: (s: AppState) => void; showToast: ShowToast; onClose: () => void; onSaved?: (p: Product) => void; initialUpc?: string; initial?: Partial<Form>;
}) {
  const [form, setForm] = useState<Form>(product ? {
    name: product.name, upc: product.upc || '', ndc: product.ndc || '', codes: (product.codes || []).join(', '), vendor: product.vendor || '', category: product.category || '',
    unit: product.unit || 'each', cost_per_unit: String(product.cost_per_unit ?? ''), reorder_threshold: String(product.reorder_threshold ?? 10), on_hand: String(product.on_hand),
  } : { ...blank, ...(initial || {}), ...(initialUpc ? (/^\d{8,14}$/.test(normCode(initialUpc)) ? { upc: normCode(initialUpc) } : { codes: normCode(initialUpc) }) : {}) });
  const [saving, setSaving] = useState(false);
  const [scan, setScan] = useState<null | 'upc' | 'codes'>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name.trim()) { showToast('Product name is required', 'error'); return; }
    setSaving(true);
    try {
      const fields = { name: form.name, upc: form.upc, ndc: form.ndc, codes: form.codes, vendor: form.vendor, category: form.category, unit: form.unit, cost_per_unit: form.cost_per_unit, reorder_threshold: form.reorder_threshold };
      const r = mode === 'add'
        ? await api.op<{ product: Product }>({ op: 'product.add', product: { ...fields, on_hand: form.on_hand } })
        : await api.op<{ product: Product }>({ op: 'product.update', id: product!.id, patch: fields });
      applyState(r.state);
      showToast(mode === 'add' ? `${r.product.name} added · SKYNET ${skuLabel(r.product.sku)}` : 'Product updated', 'success');
      onSaved?.(r.product);
      onClose();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  async function remove() {
    if (!product || !window.confirm(`Delete "${product.name}"?\n\nIts history stays in the audit log.`)) return;
    setSaving(true);
    try {
      const r = await api.op({ op: 'product.delete', id: product.id });
      applyState(r.state);
      showToast(`${product.name} deleted`, 'success');
      onClose();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  return (
    <Sheet title={mode === 'add' ? 'Add product' : 'Edit product'} onClose={onClose}
      right={<button className="btn btn-p btn-sm" onClick={save} disabled={!form.name.trim() || saving}>{saving ? <><div className="spin" />Saving</> : '✓ Save'}</button>}>
      <div className="ig"><label className="lbl">Product name *</label>
        <input className="inp" value={form.name} onChange={set('name')} autoFocus={mode === 'add'} placeholder="e.g. Lidocaine 2% 50 mL" /></div>
      <div className="grid2">
        <div className="field-box"><label className="lbl">Reorder at</label><input type="number" inputMode="numeric" value={form.reorder_threshold} onChange={set('reorder_threshold')} style={{ color: 'var(--orange)' }} /></div>
        <div className="field-box"><label className="lbl">Unit cost $</label><input type="number" step="0.01" inputMode="decimal" value={form.cost_per_unit} onChange={set('cost_per_unit')} placeholder="0.00" /></div>
      </div>
      {mode === 'add' && (
        <div className="ig" style={{ marginTop: 14 }}><label className="lbl">Opening quantity on hand</label>
          <input className="inp mono" type="number" inputMode="numeric" value={form.on_hand} onChange={set('on_hand')} /></div>
      )}
      <div className="ig" style={{ marginTop: mode === 'add' ? 0 : 14 }}><label className="lbl">UPC barcode <span className="muted">(optional — no barcode? leave blank, a SKYNET code is assigned)</span></label>
        <div className="flex">
          <input className="inp mono" style={{ flex: 1, fontSize: 14 }} inputMode="numeric" value={form.upc} onChange={set('upc')} placeholder="Scan or type" />
          <button type="button" className="btn btn-s" style={{ padding: '12px 14px', flexShrink: 0 }} onClick={() => setScan('upc')}>📷</button>
          {form.upc && <button type="button" className="btn btn-d btn-sm" style={{ flexShrink: 0 }} onClick={() => setForm(f => ({ ...f, upc: '' }))}>Clear</button>}
        </div></div>
      <div className="ig"><label className="lbl">NDC / DIN</label><input className="inp mono" style={{ fontSize: 14 }} value={form.ndc} onChange={set('ndc')} /></div>
      <div className="ig"><label className="lbl">Other codes <span className="muted">(vendor item #, second pack-size barcode — comma separated)</span></label>
        <div className="flex">
          <input className="inp mono" style={{ flex: 1, fontSize: 14 }} value={form.codes} onChange={set('codes')} placeholder="e.g. MED12345, 0245-01" />
          <button type="button" className="btn btn-s" style={{ padding: '12px 14px', flexShrink: 0 }} onClick={() => setScan('codes')}>📷</button>
        </div></div>
      {product?.sku && <div className="ig"><label className="lbl">SKYNET code</label><div className="inp mono" style={{ fontSize: 14, color: 'var(--text3)' }}>{skuLabel(product.sku)} · {product.sku} <span className="muted">(automatic, printable)</span></div></div>}
      <div className="ig"><label className="lbl">Vendor / supplier</label><input className="inp" value={form.vendor} onChange={set('vendor')} placeholder="e.g. Medisca" /></div>
      <div className="grid2">
        <div className="ig"><label className="lbl">Category</label><input className="inp" value={form.category} onChange={set('category')} /></div>
        <div className="ig"><label className="lbl">Unit</label><input className="inp" value={form.unit} onChange={set('unit')} placeholder="each" /></div>
      </div>
      <div className="flex">
        <button className="btn btn-p" style={{ flex: 1 }} onClick={save} disabled={!form.name.trim() || saving}>{saving ? <><div className="spin" />Saving</> : mode === 'add' ? '✓ Add product' : '✓ Save changes'}</button>
        <button className="btn btn-w" onClick={onClose}>Cancel</button>
      </div>
      {mode === 'edit' && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--border)' }}>
          <button className="btn btn-d btn-full" disabled={saving} onClick={remove}>Delete product</button>
        </div>
      )}
      {scan && <BarcodeScannerSheet onClose={() => setScan(null)} onCode={c => {
        setScan(null);
        if (scan === 'upc') { setForm(f => ({ ...f, upc: c })); showToast(`UPC scanned: ${c}`, 'success'); }
        else { setForm(f => ({ ...f, codes: f.codes ? `${f.codes}, ${c}` : c })); showToast(`Code added: ${c}`, 'success'); }
      }} />}
    </Sheet>
  );
}

/** Small add form used from the Scan tab when a code isn't recognised. */
export function QuickAddSheet({ upc, applyState, showToast, onAdded, onClose }: {
  upc: string; applyState: (s: AppState) => void; showToast: ShowToast; onAdded: (p: Product) => void; onClose: () => void;
}) {
  return <ProductFormSheet mode="add" initialUpc={upc} applyState={applyState} showToast={showToast} onClose={onClose} onSaved={onAdded} />;
}
