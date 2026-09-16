import { useEffect, useState } from 'react';
import type { Product, TabProps, Transaction } from '../types';
import { api } from '../lib/api';
import { formatCurrency, timeAgo, formatDate, stockStatus, copyText, downloadText, productsToCsv, csvEscape, skuLabel } from '../lib/util';
import { Empty, ProductPicker } from '../components/ui';

const TX_META: Record<string, { icon: string; label: string }> = {
  count: { icon: '📋', label: 'Physical count' },
  receive: { icon: '📦', label: 'Stock received' },
  adjustment: { icon: '✏️', label: 'Used / adjusted' },
  price_change: { icon: '💲', label: 'Price change' },
  created: { icon: '✨', label: 'Product created' },
  deleted: { icon: '🗑️', label: 'Product deleted' },
  restore: { icon: '♻️', label: 'Data restored' },
};

export function TxCard({ tx, showProduct = false }: { tx: Transaction; showProduct?: boolean }) {
  const m = TX_META[tx.type] || { icon: '🔄', label: tx.type };
  const dir = tx.quantity_change > 0 ? 'up' : tx.quantity_change < 0 ? 'down' : 'zero';
  return (
    <div className={`tx ${tx.type}`}>
      <div className="tx-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tx-title">{m.icon} {showProduct ? tx.product_name : m.label}</div>
          <div className="tx-sub">{showProduct ? `${m.label} · ` : ''}{tx.notes || '—'} · {tx.performed_by}</div>
        </div>
        <div>
          <div className={`tx-qty ${dir}`}>{tx.type === 'price_change' ? '' : `${tx.quantity_change > 0 ? '+' : ''}${tx.quantity_change}`}</div>
          <div className="tx-time" title={formatDate(tx.created_at)}>{timeAgo(tx.created_at)}</div>
        </div>
      </div>
    </div>
  );
}

/** Plain-text order list grouped by vendor — for pasting into an email or PO. */
export function buildOrderSheet(products: Product[]): string {
  const need = products.filter(p => stockStatus(p) !== 'a').sort((a, b) => (a.vendor || 'zzz').localeCompare(b.vendor || 'zzz') || a.name.localeCompare(b.name));
  if (!need.length) return 'Nothing to reorder — all stock is above reorder levels.';
  const byVendor = new Map<string, Product[]>();
  for (const p of need) { const v = p.vendor || 'No vendor'; byVendor.set(v, [...(byVendor.get(v) || []), p]); }
  const lines: string[] = [`SKYNET reorder list — ${new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`, ''];
  for (const [vendor, list] of byVendor) {
    lines.push(vendor.toUpperCase());
    for (const p of list) {
      const suggested = Math.max(p.reorder_threshold * 2 - p.on_hand, 1);
      lines.push(`  • ${p.name}${p.upc ? ` (UPC ${p.upc})` : p.ndc ? ` (DIN ${p.ndc})` : p.codes?.length ? ` (item # ${p.codes[0]})` : ` (SKYNET ${skuLabel(p.sku)})`} — on hand ${p.on_hand}, reorder at ${p.reorder_threshold} → order ${suggested} ${p.unit}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function ReportsTab({ products, showToast }: TabProps) {
  const [view, setView] = useState<'overview' | 'reorder' | 'product' | 'audit'>('overview');
  const [days, setDays] = useState('7');
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (view === 'audit') { const r = await api.transactions({ days: parseInt(days), limit: 300 }); if (!cancelled) setTxs(r.transactions); }
        if (view === 'overview') { const r = await api.transactions({ type: 'price_change', days: 30, limit: 50 }); if (!cancelled) setPrices(r.transactions); }
      } catch (e: any) { showToast('Could not load: ' + e.message, 'error'); }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [view, days]); // eslint-disable-line

  async function pick(p: Product) {
    setSelected(p); setLoading(true);
    try { setHistory((await api.transactions({ product_id: p.id, limit: 100 })).transactions); } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }

  const neverCounted = products.filter(p => !p.last_counted);
  const overdue = products.filter(p => p.last_counted && Date.now() - new Date(p.last_counted).getTime() > 30 * 86400000);
  const reorder = products.filter(p => stockStatus(p) !== 'a').sort((a, b) => a.on_hand - b.on_hand);
  const value = products.reduce((s, p) => s + p.on_hand * p.cost_per_unit, 0);
  const byCategory = [...products.reduce((m, p) => { const k = p.category || 'Uncategorised'; m.set(k, (m.get(k) || 0) + p.on_hand * p.cost_per_unit); return m; }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  function exportCsv() {
    downloadText(`skynet-inventory-${new Date().toISOString().slice(0, 10)}.csv`, productsToCsv(products), 'text/csv');
  }
  function exportAudit() {
    const head = 'Date,Product,Type,Change,New quantity,Notes,By';
    const body = txs.map(t => [formatDate(t.created_at), t.product_name, TX_META[t.type]?.label || t.type, t.quantity_change, t.new_quantity, t.notes, t.performed_by].map(csvEscape).join(','));
    downloadText(`skynet-audit-${days}d.csv`, [head, ...body].join('\n'), 'text/csv');
  }

  return (
    <div className="tab-in pad">
      <div className="sec-label">Reports</div>
      <div className="seg">
        {([['overview', 'Overview'], ['reorder', `Reorder${reorder.length ? ` · ${reorder.length}` : ''}`], ['product', 'By product'], ['audit', 'Audit log']] as const).map(([id, l]) => (
          <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{l}</button>
        ))}
      </div>

      {view === 'overview' && (
        <div>
          <div className="stats" style={{ marginBottom: 12 }}>
            <div className="stat"><div className="stat-header"><div className="stat-dot a" /><div className="stat-lbl">Inventory value</div></div><div className="stat-val" style={{ fontSize: 22 }}>{formatCurrency(value)}</div></div>
            <div className="stat"><div className="stat-header"><div className="stat-dot g" /><div className="stat-lbl">Units on hand</div></div><div className="stat-val">{products.reduce((s, p) => s + p.on_hand, 0).toLocaleString()}</div></div>
            <div className={`stat ${neverCounted.length ? 'danger' : ''}`}><div className="stat-header"><div className="stat-dot d" /><div className="stat-lbl">Never counted</div></div><div className="stat-val">{neverCounted.length}</div></div>
            <div className={`stat ${overdue.length ? 'warn' : ''}`}><div className="stat-header"><div className="stat-dot w" /><div className="stat-lbl">Count overdue (30d+)</div></div><div className="stat-val">{overdue.length}</div></div>
          </div>
          <button className="btn btn-s btn-full btn-sm" onClick={exportCsv} disabled={!products.length}>⬇ Export inventory (CSV)</button>

          {byCategory.length > 1 && (
            <>
              <div className="sec-label-uc">Value by category</div>
              <div className="card" style={{ padding: '6px 16px' }}>
                {byCategory.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                    <span>{k}</span><span style={{ fontFamily: 'var(--mono)' }}>{formatCurrency(v)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(neverCounted.length > 0 || overdue.length > 0) && (
            <>
              <div className="sec-label-uc">Needs counting</div>
              {[...neverCounted, ...overdue].slice(0, 12).map(p => (
                <div key={p.id} className="alert-row">
                  <span className="alert-ico">{p.last_counted ? '⏳' : '❓'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="alert-name">{p.name}</div>
                    <div className="alert-sub">{p.last_counted ? `Last counted ${timeAgo(p.last_counted)}` : 'Never counted'} · {p.vendor || '—'}</div>
                  </div>
                  <div className="row-qty">{p.on_hand}</div>
                </div>
              ))}
              {neverCounted.length + overdue.length > 12 && <div className="hint">+{neverCounted.length + overdue.length - 12} more</div>}
            </>
          )}
          {products.length > 0 && neverCounted.length === 0 && overdue.length === 0 && <div className="notice ok" style={{ marginTop: 16 }}>✅ Every product counted within the last 30 days</div>}

          <div className="sec-label-uc">💲 Price changes — last 30 days</div>
          {loading && <div className="loader"><div className="spin" />Loading…</div>}
          {!loading && prices.length === 0 && <div className="card muted" style={{ textAlign: 'center' }}>No price changes recorded in the last 30 days</div>}
          {!loading && prices.map(tx => {
            const m = tx.notes?.match(/\$([0-9.]+)\s*→\s*\$([0-9.]+)/);
            const from = m ? parseFloat(m[1]) : null, to = m ? parseFloat(m[2]) : null;
            const up = from != null && to != null && to > from;
            return (
              <div key={tx.id} className={`tx price_change`} style={{ borderLeftColor: up ? 'var(--red)' : 'var(--green)' }}>
                <div className="tx-top">
                  <div className="tx-title" style={{ flex: 1 }}>{tx.product_name}</div>
                  <div className="tx-time">{timeAgo(tx.created_at)}</div>
                </div>
                {from != null && to != null && (
                  <div className="flex" style={{ gap: 16, marginTop: 6 }}>
                    <div><div className="kv-lbl">Was</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>{formatCurrency(from)}</div></div>
                    <div style={{ fontSize: 18, color: 'var(--text3)' }}>→</div>
                    <div><div className="kv-lbl">Now</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: up ? 'var(--red)' : 'var(--green)' }}>{formatCurrency(to)}</div></div>
                    {from > 0 && <div className={`pct ${up ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }}>{up ? '+' : ''}{(((to - from) / from) * 100).toFixed(1)}%</div>}
                  </div>
                )}
                <div className="tx-sub">{tx.performed_by}</div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'reorder' && (
        <div>
          {reorder.length === 0 ? <Empty icon="✅" title="Nothing to reorder" sub="Every product is above its reorder level." /> : (
            <>
              <div className="flex" style={{ marginBottom: 12 }}>
                <button className="btn btn-p btn-sm" style={{ flex: 1 }} onClick={async () => (await copyText(buildOrderSheet(products))) ? showToast('Order list copied — paste it into an email', 'success') : showToast('Could not copy', 'error')}>📋 Copy order list</button>
                <button className="btn btn-s btn-sm" onClick={() => downloadText('skynet-reorder.txt', buildOrderSheet(products), 'text/plain')}>⬇ Save</button>
              </div>
              {reorder.map(p => {
                const st = stockStatus(p);
                return (
                  <div key={p.id} className={`alert-row ${st === 'd' ? 'out' : 'low'}`}>
                    <div className="alert-ico">{st === 'd' ? '🚨' : '⚠️'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="alert-name">{p.name}</div>
                      <div className="alert-sub">{p.vendor || 'No vendor'} · {p.on_hand} on hand · reorder at {p.reorder_threshold} · suggest {Math.max(p.reorder_threshold * 2 - p.on_hand, 1)}</div>
                    </div>
                    <div className={`alert-badge ${st === 'd' ? 'badge-out' : 'badge-low'}`}>{st === 'd' ? 'OUT' : 'LOW'}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {view === 'product' && (
        !selected ? <ProductPicker products={products} onPick={pick} icon="📊" /> : (
          <>
            <div className="res-card">
              <div className="res-name">{selected.name}</div>
              <div className="res-sub">{selected.vendor || '—'} · {selected.on_hand} on hand</div>
              <button className="btn btn-s btn-sm" style={{ marginTop: 10 }} onClick={() => { setSelected(null); setHistory([]); }}>← Back</button>
            </div>
            <div className="sec-label">Transaction history</div>
            {loading && <div className="loader"><div className="spin" />Loading…</div>}
            {!loading && history.length === 0 && <Empty icon="📋" title="No transactions yet" />}
            {!loading && history.map(tx => <TxCard key={tx.id} tx={tx} />)}
          </>
        )
      )}

      {view === 'audit' && (
        <div>
          <div className="flex" style={{ marginBottom: 12 }}>
            {['7', '14', '30', '90'].map(d => <button key={d} className={`chip ${days === d ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDays(d)}>{d}d</button>)}
            <button className="btn btn-s btn-sm" onClick={exportAudit} disabled={!txs.length}>⬇ CSV</button>
          </div>
          {loading && <div className="loader"><div className="spin" />Loading…</div>}
          {!loading && txs.length === 0 && <Empty icon="📋" title="No activity in this period" />}
          {!loading && txs.map(tx => <TxCard key={tx.id} tx={tx} showProduct />)}
        </div>
      )}
      <div className="tab-spacer" />
    </div>
  );
}
