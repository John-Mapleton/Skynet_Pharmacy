import { useState } from 'react';
import type { AppState, Product, ShowToast, TabProps } from '../types';
import { api } from '../lib/api';
import { findByCode, searchProducts } from '../lib/util';
import { primeAudio } from '../lib/fun';
import { ScannerPanel } from '../components/BarcodeScanner';
import { ProductRow, ProductSummary, Sheet, SkullAlarm, Empty } from '../components/ui';
import { QuickAddSheet } from './ProductsTab';
import { alarmOf, type AlarmInfo, type StockOpResult } from './StockTabs';

/** Count form — also used from a product's file. */
export function CountForm({ p, applyState, showToast, onDone, onBack }: {
  p: Product; applyState: (s: AppState) => void; showToast: ShowToast; onDone: (r: StockOpResult) => void; onBack: () => void;
}) {
  const [count, setCount] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    const n = parseInt(count);
    if (!Number.isFinite(n) || n < 0) { showToast('Enter a valid count', 'error'); return; }
    primeAudio();
    setSaving(true);
    try {
      const r = await api.op<StockOpResult>({ op: 'stock.count', id: p.id, qty: n });
      applyState(r.state);
      showToast(`Count saved: ${p.name} = ${n}`, 'success');
      onDone(r);
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  }
  return (
    <>
      <div className="ig">
        <label className="lbl">New physical count</label>
        <input className="inp big" type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="Enter count"
          value={count} onChange={e => setCount(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
        {count !== '' && Number.isFinite(parseInt(count)) && (
          <div className="hint">Change: {parseInt(count) - p.on_hand >= 0 ? '+' : ''}{parseInt(count) - p.on_hand}{parseInt(count) <= p.reorder_threshold ? ' · at or below reorder level' : ''}</div>
        )}
      </div>
      <div className="flex">
        <button className="btn btn-p" style={{ flex: 1 }} onClick={save} disabled={count === '' || saving}>
          {saving ? <><div className="spin" />Saving</> : '✓ Save count'}
        </button>
        <button className="btn btn-w" onClick={onBack}>Cancel</button>
      </div>
    </>
  );
}

/** Pick an existing product to attach an unrecognised code to. */
export function LinkCodeSheet({ code, products, applyState, showToast, onLinked, onClose }: {
  code: string; products: Product[]; applyState: (s: AppState) => void; showToast: ShowToast; onLinked: (p: Product) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const list = searchProducts(products, q, 40);
  async function link(p: Product) {
    setBusy(true);
    try {
      const r = await api.op<{ product: Product }>({ op: 'product.addCode', id: p.id, code, notes: 'Code linked on Scan' });
      applyState(r.state);
      showToast(`${code} now opens ${r.product.name}`, 'success');
      onLinked(r.product);
    } catch (e: any) { showToast(e.message, 'error'); }
    setBusy(false);
  }
  return (
    <Sheet title="Link code to a product" onClose={onClose}>
      <div className="notice info">Code <strong style={{ fontFamily: 'var(--mono)' }}>{code}</strong> will be remembered for the product you pick — next time it scans straight to it.</div>
      <input className="inp" placeholder="Search by name, vendor, SKYNET #…" value={q} onChange={e => setQ(e.target.value)} autoFocus style={{ marginBottom: 12 }} />
      {busy ? <div className="loader"><div className="spin" />Linking…</div> : list.length ? (
        <div className="card-row">{list.map(p => <ProductRow key={p.id} p={p} icon="🔗" onClick={() => link(p)} />)}</div>
      ) : <Empty icon="🔍" title="No products match" />}
    </Sheet>
  );
}

/** Scan & Count: scan a barcode (or search by name) → enter the physical count. */
export function ScanTab({ products, applyState, showToast }: TabProps) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Product | null>(null);
  const [stage, setStage] = useState<'scan' | 'result'>('scan');
  const [quickAdd, setQuickAdd] = useState(false);
  const [linking, setLinking] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [q, setQ] = useState('');
  const [lastSaved, setLastSaved] = useState<{ name: string; qty: number } | null>(null);
  const [alarm, setAlarm] = useState<AlarmInfo | null>(null);
  const live = found ? products.find(p => p.id === found.id) || found : null;

  function lookup(c: string) {
    setCode(c);
    setFound(findByCode(products, c) || null);
    setStage('result');
  }
  function pick(p: Product) { setCode(''); setFound(p); setStage('result'); setQ(''); }
  function reset() {
    setStage('scan'); setFound(null); setCode(''); setQuickAdd(false); setLinking(false);
    setScanKey(k => k + 1);
  }

  const results = q.trim() ? searchProducts(products, q, 8) : [];

  return (
    <div className="tab-in pad">
      <div className="sec-label">Scan & Count</div>

      {stage === 'scan' && (
        <>
          <ScannerPanel key={scanKey} onCode={lookup} />
          <div className="sec-label" style={{ marginTop: 18 }}>No barcode? Find it by name</div>
          <input className="inp" placeholder="Search name, vendor or SKYNET #…" value={q} onChange={e => setQ(e.target.value)} />
          {q.trim() && (
            results.length ? <div className="card-row" style={{ marginTop: 8 }}>{results.map(p => <ProductRow key={p.id} p={p} icon="📋" onClick={() => pick(p)} />)}</div>
              : <div className="hint">No products match "{q}"</div>
          )}
          {lastSaved && <div className="notice ok" style={{ marginTop: 14 }}>✓ Last saved: {lastSaved.name} → {lastSaved.qty}</div>}
        </>
      )}

      {stage === 'result' && !live && (
        <>
          <div className="res-card bad">
            <div style={{ fontSize: 22, marginBottom: 8 }}>❌</div>
            <div className="res-name">Code not recognised</div>
            <div className="res-sub">Code: {code}</div>
            <div className="muted" style={{ marginTop: 8 }}>Is this an existing product with a new or different barcode? Link it — or add it as a new product.</div>
          </div>
          <div className="stack">
            {products.length > 0 && <button className="btn btn-p btn-full" onClick={() => setLinking(true)}>🔗 Link to an existing product</button>}
            <button className={`btn ${products.length ? 'btn-s' : 'btn-p'} btn-full`} onClick={() => setQuickAdd(true)}>+ Add as a new product</button>
            <button className="btn btn-w btn-full" onClick={reset}>Scan another</button>
          </div>
          {quickAdd && (
            <QuickAddSheet upc={code} applyState={applyState} showToast={showToast}
              onAdded={p => { setQuickAdd(false); setFound(p); }} onClose={() => setQuickAdd(false)} />
          )}
          {linking && (
            <LinkCodeSheet code={code} products={products} applyState={applyState} showToast={showToast}
              onLinked={p => { setLinking(false); setFound(p); }} onClose={() => setLinking(false)} />
          )}
        </>
      )}

      {stage === 'result' && live && (
        <>
          <ProductSummary p={live} />
          <CountForm key={live.id} p={live} applyState={applyState} showToast={showToast}
            onDone={r => { setLastSaved({ name: r.product.name, qty: r.product.on_hand }); setAlarm(alarmOf(r)); reset(); }} onBack={reset} />
        </>
      )}
      <div className="tab-spacer" />
      {alarm && <SkullAlarm productName={alarm.name} newQty={alarm.qty} threshold={alarm.threshold} onClose={() => setAlarm(null)} />}
    </div>
  );
}
