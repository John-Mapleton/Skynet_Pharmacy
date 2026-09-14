import { useState } from 'react';
import type { Product, TabProps } from '../types';
import { api } from '../lib/api';
import { findByBarcode, formatCurrency } from '../lib/util';
import { ProductPicker, ProductSummary, SkullAlarm } from '../components/ui';
import { BarcodeScannerSheet } from '../components/BarcodeScanner';

// ── RECEIVE ──────────────────────────────────────────────────────────
export function ReceiveTab({ products, applyState, showToast }: TabProps) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [scan, setScan] = useState(false);
  const live = selected ? products.find(p => p.id === selected.id) || selected : null;

  async function receive() {
    if (!live) return;
    const n = parseInt(qty);
    if (!Number.isFinite(n) || n <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    setSaving(true);
    try {
      const r = await api.op<{ product: Product; priceChange: { from: number; to: number } | null }>({ op: 'stock.receive', id: live.id, qty: n, cost: cost || undefined });
      applyState(r.state);
      showToast(`+${n} received · ${r.product.name} now ${r.product.on_hand}${r.priceChange ? ` · price ${formatCurrency(r.priceChange.from)} → ${formatCurrency(r.priceChange.to)}` : ''}`, 'success');
      setSelected(null); setQty(''); setCost('');
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  const newCost = parseFloat(cost);
  const costDelta = live && cost && Number.isFinite(newCost) && newCost > 0 && Math.abs(newCost - live.cost_per_unit) > 0.001
    ? { up: newCost > live.cost_per_unit, pct: live.cost_per_unit > 0 ? ((newCost - live.cost_per_unit) / live.cost_per_unit) * 100 : null } : null;

  return (
    <div className="tab-in pad">
      <div className="sec-label">Receive stock</div>
      {!live ? (
        <>
          <ProductPicker products={products} onPick={setSelected} icon="📦"
            extra={<button className="btn btn-s" style={{ padding: '12px 14px', flexShrink: 0 }} onClick={() => setScan(true)} title="Scan barcode">📷</button>} />
          {scan && (
            <BarcodeScannerSheet onClose={() => setScan(false)} onCode={c => {
              setScan(false);
              const m = findByBarcode(products, c);
              if (m) setSelected(m); else showToast(`No product with barcode ${c} — add it in Products first`, 'error');
            }} />
          )}
        </>
      ) : (
        <>
          <ProductSummary p={live} />
          <div className="ig">
            <label className="lbl">Quantity received *</label>
            <input className="inp big" type="number" inputMode="numeric" pattern="[0-9]*" min="1" placeholder="How many?" value={qty} onChange={e => setQty(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && receive()} />
          </div>
          <div className="ig">
            <label className="lbl">New unit cost (optional — leave blank if unchanged)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>$</span>
              <input className="inp mono" type="number" step="0.01" inputMode="decimal" placeholder={`Current: ${formatCurrency(live.cost_per_unit)}`} value={cost} onChange={e => setCost(e.target.value)} style={{ paddingLeft: 28, fontSize: 18 }} />
            </div>
            {costDelta && (
              <div className={`notice ${costDelta.up ? 'err' : 'ok'}`} style={{ marginTop: 8, marginBottom: 0, fontWeight: 600 }}>
                {costDelta.up ? '⬆ Price increase' : '⬇ Price decrease'}: {formatCurrency(live.cost_per_unit)} → {formatCurrency(newCost)}{costDelta.pct != null ? ` (${costDelta.pct > 0 ? '+' : ''}${costDelta.pct.toFixed(1)}%)` : ''}
              </div>
            )}
          </div>
          <div className="flex">
            <button className="btn btn-p" style={{ flex: 1 }} onClick={receive} disabled={!qty || saving}>{saving ? <><div className="spin" />Saving</> : '+ Receive stock'}</button>
            <button className="btn btn-w" onClick={() => { setSelected(null); setQty(''); setCost(''); }}>Back</button>
          </div>
        </>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ── USE / DISPENSE ───────────────────────────────────────────────────
const REASONS = [
  { id: 'Compounding', label: '🧪 Compounding' },
  { id: 'Dispensed', label: '💊 Dispensed' },
  { id: 'Expired', label: '⏰ Expired' },
  { id: 'Damaged', label: '💥 Damaged' },
  { id: 'Sample', label: '🎁 Sample' },
  { id: 'Other', label: '📝 Other' },
];

export function DispenseTab({ products, applyState, showToast }: TabProps) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('Compounding');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [alarm, setAlarm] = useState<{ name: string; qty: number; threshold: number } | null>(null);
  const [scan, setScan] = useState(false);
  const live = selected ? products.find(p => p.id === selected.id) || selected : null;

  function clear() { setSelected(null); setQty(''); setReason('Compounding'); setNote(''); }

  async function use() {
    if (!live) return;
    const n = parseInt(qty);
    if (!Number.isFinite(n) || n <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    if (n > live.on_hand) { showToast(`Only ${live.on_hand} in stock`, 'error'); return; }
    setSaving(true);
    try {
      const r = await api.op<{ product: Product; crossedThreshold: boolean }>({ op: 'stock.use', id: live.id, qty: n, reason: reason === 'Other' && note ? `Other: ${note}` : reason });
      applyState(r.state);
      if (r.crossedThreshold) setAlarm({ name: r.product.name, qty: r.product.on_hand, threshold: r.product.reorder_threshold });
      else showToast(`−${n} used · ${r.product.on_hand} left`, 'success');
      clear();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  return (
    <div className="tab-in pad">
      <div className="sec-label">Use / dispense stock</div>
      {!live ? (
        <>
          <ProductPicker products={products} onPick={p => p.on_hand > 0 ? setSelected(p) : showToast('Out of stock', 'error')} icon="💊"
            extra={<button className="btn btn-s" style={{ padding: '12px 14px', flexShrink: 0 }} onClick={() => setScan(true)} title="Scan barcode">📷</button>} />
          {scan && (
            <BarcodeScannerSheet onClose={() => setScan(false)} onCode={c => {
              setScan(false);
              const m = findByBarcode(products, c);
              if (!m) showToast(`No product with barcode ${c}`, 'error');
              else if (m.on_hand <= 0) showToast(`${m.name} is out of stock`, 'error');
              else setSelected(m);
            }} />
          )}
        </>
      ) : (
        <>
          <ProductSummary p={live} />
          <div className="ig">
            <label className="lbl">Reason</label>
            <div className="grid2">
              {REASONS.map(r => <button key={r.id} onClick={() => setReason(r.id)} className={`chip ${reason === r.id ? 'on' : ''}`} style={{ justifyContent: 'center', padding: '12px 8px' }}>{r.label}</button>)}
            </div>
            {reason === 'Other' && <input className="inp" style={{ marginTop: 8 }} placeholder="What happened? (optional)" value={note} onChange={e => setNote(e.target.value)} />}
          </div>
          <div className="ig">
            <label className="lbl">Quantity used</label>
            <input className="inp big" type="number" inputMode="numeric" pattern="[0-9]*" min="1" max={live.on_hand} placeholder="How many?" value={qty} onChange={e => setQty(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && use()} />
            {qty && parseInt(qty) > live.on_hand && <div className="notice err" style={{ marginTop: 8, marginBottom: 0 }}>Only {live.on_hand} in stock</div>}
          </div>
          <div className="flex">
            <button className="btn btn-p" style={{ flex: 1 }} onClick={use} disabled={!qty || saving}>{saving ? <><div className="spin" />Saving</> : '− Use stock'}</button>
            <button className="btn btn-w" onClick={clear}>Back</button>
          </div>
        </>
      )}
      <div className="tab-spacer" />
      {alarm && <SkullAlarm productName={alarm.name} newQty={alarm.qty} threshold={alarm.threshold} onClose={() => setAlarm(null)} />}
    </div>
  );
}
