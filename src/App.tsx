// ═════════════════════════════════════════════════════════════════════
// SKYNET — MAPLETON PHARMACY INVENTORY · v5 (self-contained)
// Data lives in Netlify Blobs via /api (netlify/functions/api.ts).
// No external database. No setup screen. Open the site, enter the PIN.
// ═════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';
import type { AppState, Product, ToastType } from './types';
import { api, onLocked, session, ApiError } from './lib/api';
import { PinScreen, Sheet } from './components/ui';
import { Dashboard } from './tabs/Dashboard';
import { ScanTab } from './tabs/ScanTab';
import { ProductsTab } from './tabs/ProductsTab';
import { ReceiveTab, DispenseTab } from './tabs/StockTabs';
import { InvoiceTab, ExcelTab } from './tabs/ImportTabs';
import { ReportsTab } from './tabs/ReportsTab';
import { SettingsTab } from './tabs/SettingsTab';

const TABS = [
  { id: 'dash', icon: '📊', label: 'Dashboard' },
  { id: 'scan', icon: '📷', label: 'Scan' },
  { id: 'products', icon: '💊', label: 'Products' },
  { id: 'receive', icon: '📦', label: 'Receive' },
  { id: 'dispense', icon: '➖', label: 'Use' },
  { id: 'invoice', icon: '🧾', label: 'Invoice' },
  { id: 'excel', icon: '📑', label: 'Import' },
  { id: 'reports', icon: '📋', label: 'Reports' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

const REFRESH_MS = 30_000; // background refresh so other devices' changes show up

export default function SkyNet() {
  const [unlocked, setUnlocked] = useState(() => !!session.pin);
  const [tab, setTab] = useState('dash');
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [user, setUser] = useState(() => session.user);
  const [pickUser, setPickUser] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  }, []);

  const applyState = useCallback((s: AppState) => {
    setProducts(s.products);
    setStaff(s.staff);
    setUpdatedAt(s.updatedAt);
    setSyncError('');
    setLoaded(true);
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    if (!session.pin) return;
    if (!quiet) setLoading(true);
    try {
      applyState(await api.state());
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return; // handled by onLocked
      setSyncError(e.message || 'Could not sync');
      if (!quiet) showToast('Sync: ' + (e.message || 'failed'), 'error');
    }
    if (!quiet) setLoading(false);
  }, [applyState, showToast]);

  // Locked out by the server (PIN changed elsewhere)
  useEffect(() => {
    onLocked.handler = () => { setUnlocked(false); setLoaded(false); showToast('PIN was changed — please unlock again', 'info'); };
    return () => { onLocked.handler = null; };
  }, [showToast]);

  // Initial + background refresh
  useEffect(() => {
    if (!unlocked) return;
    refresh();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(true); }, REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') refresh(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [unlocked, refresh]);

  useEffect(() => {
    const on = () => { setOnline(true); refresh(true); };
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [refresh]);

  // Ask "who's working?" once staff names exist and none is picked on this device
  useEffect(() => {
    if (loaded && staff.length > 0 && !user) setPickUser(true);
  }, [loaded, staff, user]);

  function chooseUser(name: string) {
    session.user = name; setUser(name); setPickUser(false);
  }

  function lock() { session.pin = ''; session.adminPin = ''; setUnlocked(false); setLoaded(false); setTab('dash'); }

  if (!unlocked) {
    return (
      <PinScreen onSubmit={async pin => {
        try { await api.unlock(pin); setUnlocked(true); return true; }
        catch (e: any) { return e?.status === 401 ? 'Incorrect PIN' : (e?.message || 'Could not reach the server'); }
      }} />
    );
  }

  const tabProps = { products, refresh: () => refresh(false), applyState, showToast, setTab, user };
  const subtitle = loading ? 'Syncing…' : syncError ? 'Sync error' : !loaded ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`;

  return (
    <div className="app">
      <div className="hdr">
        <div className="flex" style={{ gap: 10 }}>
          <div className="hdr-mark">S</div>
          <div>
            <div className="hdr-logo">SKYNET</div>
            <div className="hdr-sub">MAPLETON · {subtitle}</div>
          </div>
        </div>
        <div className="flex" style={{ gap: 6 }}>
          {staff.length > 0 && <button className="hdr-user" onClick={() => setPickUser(true)} title="Switch user">{user || 'Who?'}</button>}
          {loading ? <div className="spin" style={{ margin: 6 }} /> : <button className="hdr-btn" onClick={() => refresh()} title="Refresh">↻</button>}
          <button className="hdr-btn" onClick={lock} title="Lock app">🔒</button>
        </div>
      </div>

      {!online && <div className="offline-bar">📵 No connection — changes can't be saved until you're back online</div>}
      {syncError && online && (
        <div className="notice err" style={{ margin: '8px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}><strong>Sync error</strong> · {syncError}</div>
          <button className="btn btn-s btn-sm" onClick={() => refresh()}>Retry</button>
        </div>
      )}

      <div className="content">
        {!loaded && !syncError ? <div className="loader"><div className="spin" />Loading inventory…</div> : (
          <>
            {tab === 'dash' && <Dashboard {...tabProps} />}
            {tab === 'scan' && <ScanTab {...tabProps} />}
            {tab === 'products' && <ProductsTab {...tabProps} />}
            {tab === 'receive' && <ReceiveTab {...tabProps} />}
            {tab === 'dispense' && <DispenseTab {...tabProps} />}
            {tab === 'invoice' && <InvoiceTab {...tabProps} />}
            {tab === 'excel' && <ExcelTab {...tabProps} />}
            {tab === 'reports' && <ReportsTab {...tabProps} />}
            {tab === 'settings' && <SettingsTab staff={staff} applyState={applyState} showToast={showToast} user={user} onUserChange={chooseUser} />}
          </>
        )}
      </div>

      <nav className="nav">
        {TABS.map(t => (
          <button key={t.id} className={`nb ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            <span className="nb-ico">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {pickUser && (
        <Sheet title="Who's working?" onClose={() => { if (user) setPickUser(false); }}>
          <div className="muted" style={{ marginBottom: 14 }}>Counts and stock changes are recorded under your name.</div>
          <div className="chips">
            {staff.map(s => <button key={s} className={`chip ${user === s ? 'on' : ''}`} style={{ padding: '12px 18px', fontSize: 15 }} onClick={() => chooseUser(s)}>{s}</button>)}
          </div>
          <button className="btn-link" style={{ marginTop: 14 }} onClick={() => chooseUser('Staff')}>Skip — record as "Staff"</button>
        </Sheet>
      )}

      {toast && <div className={`toast ${toast.type}`} onClick={() => setToast(null)}>{toast.msg}</div>}
      <span hidden data-updated={updatedAt} />
    </div>
  );
}
