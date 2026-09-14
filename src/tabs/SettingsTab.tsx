import { useEffect, useRef, useState } from 'react';
import type { AppState, ShowToast } from '../types';
import { api, session } from '../lib/api';
import { callClaude } from '../lib/ai';
import { downloadText } from '../lib/util';
import { PinScreen } from '../components/ui';

const APP_VERSION = __APP_VERSION__;

export function SettingsTab({ staff, applyState, showToast, onUserChange, user }: {
  staff: string[]; applyState: (s: AppState) => void; showToast: ShowToast; onUserChange: (u: string) => void; user: string;
}) {
  const [unlocked, setUnlocked] = useState(() => !!session.adminPin);
  if (!unlocked) {
    return (
      <div style={{ minHeight: 'calc(100vh - 160px)', display: 'flex' }}>
        <PinScreen title="Settings" subtitle="Enter the admin PIN" onSubmit={async pin => {
          try { await api.unlock(pin, true); setUnlocked(true); return true; } catch (e: any) { return e?.status === 401 ? 'Incorrect PIN' : e.message; }
        }} />
      </div>
    );
  }
  return <SettingsBody staff={staff} applyState={applyState} showToast={showToast} onUserChange={onUserChange} user={user} onLock={() => { session.adminPin = ''; setUnlocked(false); }} />;
}

function SettingsBody({ staff, applyState, showToast, onUserChange, user, onLock }: {
  staff: string[]; applyState: (s: AppState) => void; showToast: ShowToast; onUserChange: (u: string) => void; user: string; onLock: () => void;
}) {
  const [health, setHealth] = useState<{ ai: boolean; model: string; storage: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [pins, setPins] = useState({ app: '', app2: '', admin: '', admin2: '' });
  const [staffText, setStaffText] = useState(staff.join(', '));
  const [backups, setBackups] = useState<{ backups: string[]; lastBackupDate: string | null } | null>(null);
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    api.backups().then(setBackups).catch(() => {});
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try { await fn(); } catch (e: any) { showToast(e.message, 'error'); }
    setBusy('');
  };

  async function testAI() {
    setTesting(true);
    try { const t = await callClaude([{ role: 'user', content: 'Reply with just OK' }], 10); showToast(t.includes('OK') ? 'AI is working' : 'Unexpected reply: ' + t, t.includes('OK') ? 'success' : 'error'); }
    catch (e: any) { showToast(e.message, 'error'); }
    setTesting(false);
  }

  const savePin = (kind: 'app' | 'admin') => run('pin', async () => {
    const v = kind === 'app' ? pins.app : pins.admin, v2 = kind === 'app' ? pins.app2 : pins.admin2;
    if (!/^\d{4,8}$/.test(v)) throw new Error('PIN must be 4–8 digits');
    if (v !== v2) throw new Error('PINs do not match');
    await api.op({ op: 'settings.update', patch: kind === 'app' ? { appPin: v } : { settingsPin: v } }, true);
    if (kind === 'app') session.pin = v; else session.adminPin = v;
    setPins({ app: '', app2: '', admin: '', admin2: '' });
    showToast(kind === 'app' ? 'App PIN updated on every device' : 'Settings PIN updated', 'success');
  });

  const saveStaff = () => run('staff', async () => {
    const list = staffText.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    const r = await api.op({ op: 'settings.update', patch: { staff: list } }, true);
    applyState(r.state);
    if (user && !list.includes(user)) onUserChange('');
    showToast('Staff list saved', 'success');
  });

  const exportJson = () => run('export', async () => {
    const data = await api.export();
    downloadText(`skynet-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    showToast('Backup downloaded', 'success');
  });

  async function restoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    run('restore', async () => {
      let db: any;
      try { db = JSON.parse(await file.text()); } catch { throw new Error('That file is not valid JSON'); }
      if (!db || typeof db !== 'object' || !Array.isArray(db.products)) throw new Error('That is not a SKYNET backup file');
      const n = db.products.length;
      if (!window.confirm(`Replace ALL current inventory with this file (${n} products)?\n\nA snapshot of today's data is kept in automatic backups.`)) return;
      const r = await api.op({ op: 'db.restore', db }, true);
      applyState(r.state);
      showToast(`Restored ${r.state.products.length} products`, 'success');
    });
  }

  const restoreBackup = (date: string) => run('restore', async () => {
    if (!window.confirm(`Restore the automatic backup from ${date}?\n\nThis replaces the current inventory and history.`)) return;
    const r = await api.op({ op: 'db.restoreBackup', date }, true);
    applyState(r.state);
    showToast(`Restored backup from ${date}`, 'success');
  });

  const resetAll = () => run('reset', async () => {
    if (!window.confirm('Delete ALL products and history?')) return;
    if (window.prompt('Type DELETE to confirm') !== 'DELETE') return;
    const r = await api.op({ op: 'db.reset' }, true);
    applyState(r.state);
    showToast('Inventory cleared', 'success');
  });

  // plain function (not a component) so inputs keep focus while typing
  const pinFields = (k: 'app' | 'admin', k2: 'app2' | 'admin2') => (
    <div className="grid2">
      {([[k, 'New PIN'], [k2, 'Confirm']] as const).map(([key, label]) => (
        <div key={key} className="ig" style={{ marginBottom: 10 }}>
          <label className="lbl">{label}</label>
          <input className="inp mono" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} placeholder="••••" value={pins[key]}
            onChange={e => setPins(p => ({ ...p, [key]: e.target.value.replace(/\D/g, '').slice(0, 8) }))} style={{ textAlign: 'center', fontSize: 22, letterSpacing: '.3em' }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="tab-in pad">
      <div className="sec-label-uc" style={{ marginTop: 4 }}>Storage</div>
      <div className="card">
        <div className="flex" style={{ marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Built into this site — nothing to connect</div>
        </div>
        <div className="muted" style={{ lineHeight: 1.5 }}>
          Inventory is stored in Netlify's built-in storage alongside the app. Every device that opens this address and enters the PIN sees the same live data. There is no separate database account and nothing that pauses or expires.
        </div>
        {backups && <div className="muted" style={{ marginTop: 8 }}>Automatic daily snapshots: {backups.backups.length} kept · last {backups.lastBackupDate || '—'}</div>}
      </div>

      <div className="sec-label-uc">AI features</div>
      <div className="card">
        {health === null ? <div className="flex"><div className="spin" /><span className="muted">Checking…</span></div> : health.ai ? (
          <>
            <div className="flex" style={{ marginBottom: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} /><div style={{ fontSize: 14, fontWeight: 600 }}>AI is active for everyone</div></div>
            <div className="muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>Invoice reading and photo barcode fallback run through the site's server. Model: <span className="kbd">{health.model}</span></div>
            <button className="btn btn-s btn-full btn-sm" onClick={testAI} disabled={testing}>{testing ? <><div className="spin" />Testing</> : 'Test AI connection'}</button>
          </>
        ) : (
          <>
            <div className="flex" style={{ marginBottom: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)' }} /><div style={{ fontSize: 14, fontWeight: 600 }}>AI not set up yet</div></div>
            <div className="muted" style={{ lineHeight: 1.6 }}>
              Everything else works without it. To enable invoice reading: in Netlify open <strong>Site configuration → Environment variables</strong>, add <span className="kbd">ANTHROPIC_API_KEY</span> with your key from console.anthropic.com, then redeploy (Deploys → Trigger deploy).
            </div>
          </>
        )}
      </div>

      <div className="sec-label-uc">Security</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>App PIN</div>
        <div className="muted" style={{ marginBottom: 12 }}>Staff enter this to open the app. Changing it applies to every device immediately.</div>
        {pinFields('app', 'app2')}
        <button className="btn btn-p btn-full" onClick={() => savePin('app')} disabled={pins.app.length < 4 || pins.app2.length < 4 || busy === 'pin'}>Update app PIN</button>
      </div>
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Settings PIN</div>
        <div className="muted" style={{ marginBottom: 12 }}>Admin PIN for this screen.</div>
        {pinFields('admin', 'admin2')}
        <button className="btn btn-p btn-full" onClick={() => savePin('admin')} disabled={pins.admin.length < 4 || pins.admin2.length < 4 || busy === 'pin'}>Update settings PIN</button>
      </div>

      <div className="sec-label-uc">Staff names (audit trail)</div>
      <div className="card">
        <div className="muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Optional. When names are listed, staff pick who they are after unlocking and every count, receive and use is recorded under their name.</div>
        <textarea className="inp" rows={2} placeholder="e.g. John, Brad, Josée" value={staffText} onChange={e => setStaffText(e.target.value)} style={{ resize: 'vertical', marginBottom: 10 }} />
        <button className="btn btn-p btn-full btn-sm" onClick={saveStaff} disabled={busy === 'staff'}>Save staff list</button>
      </div>

      <div className="sec-label-uc">Backup & restore</div>
      <div className="card">
        <div className="stack">
          <button className="btn btn-s btn-full" onClick={exportJson} disabled={busy === 'export'}>⬇ Download full backup (JSON)</button>
          <button className="btn btn-s btn-full" onClick={() => fileRef.current?.click()} disabled={busy === 'restore'}>⬆ Restore from a backup file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={restoreFile} style={{ display: 'none' }} />
        </div>
        {backups && backups.backups.length > 0 && (
          <>
            <div className="kv-lbl" style={{ margin: '16px 0 8px' }}>Automatic snapshots</div>
            <div className="chips">
              {backups.backups.slice(0, 12).map(d => <button key={d} className="chip" onClick={() => restoreBackup(d)} disabled={busy === 'restore'}>{d.replace(/T(\d\d)(\d\d)-/, ' $1:$2 ')}</button>)}
            </div>
            <div className="hint" style={{ textAlign: 'left' }}>Taken before the first change each day (so a date = how things stood at the end of the previous day) and before any restore or reset. Tap one to restore it.</div>
          </>
        )}
      </div>

      <div className="sec-label-uc">Danger zone</div>
      <div className="card">
        <button className="btn btn-d btn-full" onClick={resetAll} disabled={busy === 'reset'}>Delete all products and history</button>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button className="btn-link" onClick={onLock}>🔒 Lock settings</button>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>SKYNET v{APP_VERSION} · Mapleton Pharmacy · {health?.storage || 'netlify-blobs'}</div>
      </div>
      <div className="tab-spacer" />
    </div>
  );
}
