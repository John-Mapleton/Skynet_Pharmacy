import { useState } from 'react';
import type { Product, TabProps } from '../types';
import { api } from '../lib/api';
import { findByBarcode } from '../lib/util';
import { ScannerPanel } from '../components/BarcodeScanner';
import { ProductSummary } from '../components/ui';
import { QuickAddSheet } from './ProductsTab';

/** Scan & Count: scan a barcode → enter the physical count. */
export function ScanTab({ products, applyState, showToast }: TabProps) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Product | null>(null);
  const [stage, setStage] = useState<'scan' | 'result'>('scan');
  const [count, setCount] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<{ name: string; qty: number } | null>(null);

  function lookup(c: string) {
    setCode(c);
    setFound(findByBarcode(products, c) || null);
    setStage('result');
    setCount('');
  }

  function reset() {
    setStage('scan'); setFound(null); setCode(''); setCount(''); setQuickAdd(false);
    setScanKey(k => k + 1);
  }

  async function saveCount() {
    if (!found) return;
    const n = parseInt(count);
    if (!Number.isFinite(n) || n < 0) { showToast('Enter a valid count', 'error'); return; }
    setSaving(true);
    try {
      const r = await api.op({ op: 'stock.count', id: found.id, qty: n });
      applyState(r.state);
      setLastSaved({ name: found.name, qty: n });
      showToast(`Count saved: ${found.name} = ${n}`, 'success');
      reset();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  return (
    <div className="tab-in pad">
      <div className="sec-label">Scan & Count</div>

      {stage === 'scan' && (
        <>
          <ScannerPanel key={scanKey} onCode={lookup} />
          {lastSaved && <div className="notice ok" style={{ marginTop: 14 }}>✓ Last saved: {lastSaved.name} → {lastSaved.qty}</div>}
        </>
      )}

      {stage === 'result' && !found && (
        <>
          <div className="res-card bad">
            <div style={{ fontSize: 22, marginBottom: 8 }}>❌</div>
            <div className="res-name">Product not found</div>
            <div className="res-sub">Code: {code}</div>
            <div className="muted" style={{ marginTop: 8 }}>This barcode isn't in your inventory yet.</div>
          </div>
          <div className="stack">
            <button className="btn btn-p btn-full" onClick={() => setQuickAdd(true)}>+ Add this product now</button>
            <button className="btn btn-s btn-full" onClick={reset}>Scan another</button>
          </div>
          {quickAdd && (
            <QuickAddSheet upc={code} applyState={applyState} showToast={showToast}
              onAdded={p => { setQuickAdd(false); setFound(p); }} onClose={() => setQuickAdd(false)} />
          )}
        </>
      )}

      {stage === 'result' && found && (
        <>
          <ProductSummary p={found} />
          <div className="ig">
            <label className="lbl">New physical count</label>
            <input className="inp big" type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="Enter count"
              value={count} onChange={e => setCount(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveCount()} />
            {count !== '' && Number.isFinite(parseInt(count)) && (
              <div className="hint">Change: {parseInt(count) - found.on_hand >= 0 ? '+' : ''}{parseInt(count) - found.on_hand}</div>
            )}
          </div>
          <div className="flex">
            <button className="btn btn-p" style={{ flex: 1 }} onClick={saveCount} disabled={count === '' || saving}>
              {saving ? <><div className="spin" />Saving</> : '✓ Save count'}
            </button>
            <button className="btn btn-w" onClick={reset}>Cancel</button>
          </div>
        </>
      )}
      <div className="tab-spacer" />
    </div>
  );
}
