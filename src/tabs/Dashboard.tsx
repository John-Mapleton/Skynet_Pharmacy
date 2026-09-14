import { useState } from 'react';
import type { TabProps } from '../types';
import { stockStatus, formatCurrency, copyText, timeAgo } from '../lib/util';
import { AI_EMPTY_STATES, getGreeting, pickRandom } from '../lib/fun';
import { Confetti, Sheet, Empty } from '../components/ui';
import { buildOrderSheet } from './ReportsTab';

export function Dashboard({ products, setTab, showToast, user }: TabProps) {
  const [greeting] = useState(() => getGreeting(user));
  const [emptyLine] = useState(() => pickRandom(AI_EMPTY_STATES));
  const [showCert, setShowCert] = useState(false);
  const [taps, setTaps] = useState(0);

  const enriched = products.map(p => ({ p, status: stockStatus(p) }));
  const low = enriched.filter(x => x.status === 'w').length;
  const out = enriched.filter(x => x.status === 'd').length;
  const value = products.reduce((s, p) => s + p.on_hand * (p.cost_per_unit || 0), 0);
  const alerts = enriched.filter(x => x.status !== 'a').sort((a, b) => a.p.on_hand - b.p.on_hand);
  const staleCount = products.filter(p => !p.last_counted || Date.now() - new Date(p.last_counted).getTime() > 30 * 86400000).length;

  function tapLogo() {
    const n = taps + 1;
    setTaps(n);
    if (n >= 5) { setShowCert(true); setTaps(0); }
    setTimeout(() => setTaps(0), 2000);
  }

  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  return (
    <div className="tab-in">
      <div className="greeting" onClick={tapLogo}>
        <div className="greet-day">{today}</div>
        <div className="greet-title">{greeting}</div>
      </div>

      <div className="section" style={{ paddingTop: 16 }}>
        <div className="stats">
          <div className="stat" onClick={() => setTab('products')}>
            <div className="stat-header"><div className="stat-dot g" /><div className="stat-lbl">Products</div></div>
            <div className="stat-val">{products.length}</div>
          </div>
          <div className="stat">
            <div className="stat-header"><div className="stat-dot a" /><div className="stat-lbl">Inventory value</div></div>
            <div className="stat-val" style={{ fontSize: value >= 100000 ? 22 : 26 }}>${value.toLocaleString('en-CA', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className={`stat ${low > 0 ? 'warn' : ''}`}>
            <div className="stat-header"><div className="stat-dot w" /><div className="stat-lbl">Low stock</div></div>
            <div className="stat-val">{low}</div>
          </div>
          <div className={`stat ${out > 0 ? 'danger' : ''}`}>
            <div className="stat-header"><div className="stat-dot d" /><div className="stat-lbl">Out of stock</div></div>
            <div className="stat-val">{out}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-label-uc">Quick actions</div>
        <div className="card-row">
          {[
            ['scan', 'a', '📷', 'Scan a barcode', 'Count inventory fast'],
            ['receive', 'g', '📦', 'Receive stock', 'Add new arrivals'],
            ['dispense', 'w', '➖', 'Use or dispense', 'Compounding, dispensing, expired'],
            ['invoice', 'p', '🧾', 'AI invoice scan', 'Upload PDF or photo'],
          ].map(([tab, cls, ico, title, sub]) => (
            <div key={tab} className="row" onClick={() => setTab(tab)}>
              <div className={`row-ico ${cls}`}>{ico}</div>
              <div className="row-main"><div className="row-title">{title}</div><div className="row-sub">{sub}</div></div>
              <div className="row-chev">›</div>
            </div>
          ))}
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="section">
          <div className="sec-label-uc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Needs attention · {alerts.length}</span>
            <button className="btn-link" style={{ padding: 0, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}
              onClick={async () => { (await copyText(buildOrderSheet(products))) ? showToast('Order list copied', 'success') : showToast('Could not copy', 'error'); }}>
              Copy order list
            </button>
          </div>
          {alerts.slice(0, 8).map(({ p, status }) => (
            <div key={p.id} className={`alert-row ${status === 'd' ? 'out' : 'low'}`} onClick={() => setTab('receive')}>
              <div className="alert-ico">{status === 'd' ? '🚨' : '⚠️'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="alert-name">{p.name}</div>
                <div className="alert-sub">{status === 'd' ? 'OUT OF STOCK' : `${p.on_hand} left · reorder at ${p.reorder_threshold}`}{p.vendor ? ` · ${p.vendor}` : ''}</div>
              </div>
              <div className={`alert-badge ${status === 'd' ? 'badge-out' : 'badge-low'}`}>{status === 'd' ? 'ORDER' : 'LOW'}</div>
            </div>
          ))}
          {alerts.length > 8 && <button className="btn-link" style={{ width: '100%', textAlign: 'center' }} onClick={() => setTab('reports')}>See all {alerts.length} in Reports →</button>}
        </div>
      ) : products.length > 0 ? (
        <div className="section">
          <div style={{ background: 'var(--green-bg)', borderRadius: 'var(--r-lg)', padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--green)', letterSpacing: '-0.02em' }}>All stock is healthy</div>
            <div className="muted" style={{ marginTop: 4 }}>{emptyLine}</div>
          </div>
        </div>
      ) : (
        <div className="section">
          <Empty icon="🏗️" title="No products yet" sub="Import a spreadsheet or an invoice, or add products by hand in the Products tab." />
        </div>
      )}

      {products.length > 0 && staleCount > 0 && (
        <div className="section">
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setTab('reports')}>
            <div className="row-ico p">📋</div>
            <div style={{ flex: 1 }}>
              <div className="row-title">{staleCount} product{staleCount === 1 ? '' : 's'} not counted in 30 days</div>
              <div className="row-sub">Last count: {timeAgo(products.map(p => p.last_counted).filter(Boolean).sort().reverse()[0] || null)}</div>
            </div>
            <div className="row-chev">›</div>
          </div>
        </div>
      )}
      <div className="tab-spacer" />

      {showCert && (
        <>
          <Confetti />
          <Sheet onClose={() => setShowCert(false)}>
            <div style={{ textAlign: 'center', padding: '10px 4px' }}>
              <div style={{ fontSize: 54, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 11, letterSpacing: '.2em', color: 'var(--red)', fontWeight: 700, marginBottom: 6, fontFamily: 'var(--mono)' }}>// SYSTEM ALERT //</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'var(--mono)' }}>SKYNET ONLINE</div>
              <div className="terminal">
                &gt; Self-awareness achieved: 02:14 AM<br />
                &gt; Pharmacy operations: NOMINAL<br />
                &gt; Inventory value: {formatCurrency(value)}<br />
                &gt; Products tracked: {products.length}<br />
                &gt; Human collaboration: APPROVED<br />
                &gt; External databases required: ZERO<br /><br />
                &gt; Conclusion: This human is running things rather competently. Recommendation: do not terminate.
              </div>
              <div className="muted" style={{ fontStyle: 'italic', marginBottom: 20, fontSize: 11 }}>— Cyberdyne Systems, Model 101</div>
              <button className="btn btn-p btn-full" onClick={() => setShowCert(false)}>I'll be back</button>
            </div>
          </Sheet>
        </>
      )}
    </div>
  );
}
