import { useEffect, useState, type ReactNode } from 'react';
import type { Product } from '../types';
import { formatCurrency, searchProducts, stockStatus, productCodeLine } from '../lib/util';
import { playAlarmSound } from '../lib/fun';

// ── Bottom sheet ─────────────────────────────────────────────────────
export function Sheet({ title, onClose, children, right }: { title?: string; onClose: () => void; children: ReactNode; right?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={e => { if (e.currentTarget === e.target) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="handle" />
        {(title || right) && (
          <div className="mhead">
            <div className="mtitle" style={{ flex: 1, minWidth: 0 }}>{title}</div>
            {right}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────
export function Empty({ icon, title, sub }: { icon: string; title: string; sub?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-ico">{icon}</div>
      <div className="empty-t">{title}</div>
      {sub && <div className="empty-s">{sub}</div>}
    </div>
  );
}

// ── Product row + searchable picker (shared by Receive / Use / Reports) ──
export function ProductRow({ p, icon = '💊', onClick, dim, sub }: { p: Product; icon?: string; onClick?: () => void; dim?: boolean; sub?: string }) {
  const st = stockStatus(p);
  return (
    <div className={`row ${dim ? 'dim' : ''}`} onClick={onClick}>
      <div className={`row-ico ${st}`}>{icon}</div>
      <div className="row-main">
        <div className="row-title">{p.name}</div>
        <div className="row-sub">{sub ?? `${productCodeLine(p)} · ${p.vendor || '—'}`}</div>
      </div>
      <div className={`row-qty ${st}`}>{p.on_hand}</div>
    </div>
  );
}

export function ProductPicker({ products, onPick, icon, placeholder = 'Search product...', extra, limit = 40 }: {
  products: Product[]; onPick: (p: Product) => void; icon?: string; placeholder?: string; extra?: ReactNode; limit?: number;
}) {
  const [q, setQ] = useState('');
  const list = searchProducts(products, q, limit);
  return (
    <>
      <div className="flex" style={{ marginBottom: 14 }}>
        <input className="inp" style={{ flex: 1 }} placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} autoFocus />
        {extra}
      </div>
      {list.length ? (
        <div className="card-row">{list.map(p => <ProductRow key={p.id} p={p} icon={icon} onClick={() => onPick(p)} />)}</div>
      ) : (
        <Empty icon="🔍" title={products.length ? 'No products match' : 'No products yet'} sub={!products.length && 'Add products in the Products tab, or import a spreadsheet or invoice.'} />
      )}
    </>
  );
}

export function ProductSummary({ p, children }: { p: Product; children?: ReactNode }) {
  return (
    <div className="res-card">
      <div className="res-name">{p.name}</div>
      <div className="res-sub">{productCodeLine(p)} · {p.vendor || 'No vendor'}</div>
      <div className="flex" style={{ gap: 24, marginTop: 14 }}>
        <div><div className="kv-lbl">On hand</div><div className="kv-val a">{p.on_hand}</div></div>
        <div><div className="kv-lbl">Unit cost</div><div className="kv-val">{formatCurrency(p.cost_per_unit)}</div></div>
        <div><div className="kv-lbl">Reorder at</div><div className="kv-val">{p.reorder_threshold}</div></div>
      </div>
      {children}
    </div>
  );
}

// ── Reorder klaxon ───────────────────────────────────────────────────
export function SkullAlarm({ productName, newQty, threshold, onClose }: { productName: string; newQty: number; threshold: number; onClose: () => void }) {
  useEffect(() => {
    playAlarmSound();
    try { (navigator as any).vibrate?.([200, 100, 200, 100, 400]); } catch {}
  }, []);
  return (
    <div className="skull-overlay" onClick={onClose}>
      <div className="skull-modal" onClick={e => e.stopPropagation()}>
        <svg className="skull-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="32" cy="26" rx="18" ry="20" fill="#FFF" stroke="#000" strokeWidth="2" />
          <rect x="24" y="44" width="16" height="8" rx="2" fill="#FFF" stroke="#000" strokeWidth="2" />
          <ellipse cx="25" cy="26" rx="4" ry="5" fill="#000" /><ellipse cx="39" cy="26" rx="4" ry="5" fill="#000" />
          <path d="M 32 32 L 29 38 L 35 38 Z" fill="#000" />
          <line x1="28" y1="44" x2="28" y2="52" stroke="#000" strokeWidth="1.5" /><line x1="32" y1="44" x2="32" y2="52" stroke="#000" strokeWidth="1.5" /><line x1="36" y1="44" x2="36" y2="52" stroke="#000" strokeWidth="1.5" />
          <g transform="translate(32 54) rotate(45)"><rect x="-20" y="-3" width="40" height="6" rx="3" fill="#FFF" stroke="#000" strokeWidth="2" /><circle cx="-20" cy="0" r="5" fill="#FFF" stroke="#000" strokeWidth="2" /><circle cx="20" cy="0" r="5" fill="#FFF" stroke="#000" strokeWidth="2" /></g>
          <g transform="translate(32 54) rotate(-45)"><rect x="-20" y="-3" width="40" height="6" rx="3" fill="#FFF" stroke="#000" strokeWidth="2" /><circle cx="-20" cy="0" r="5" fill="#FFF" stroke="#000" strokeWidth="2" /><circle cx="20" cy="0" r="5" fill="#FFF" stroke="#000" strokeWidth="2" /></g>
        </svg>
        <div className="skull-title">Reorder Alert</div>
        <div className="skull-msg">Captain, we're running low on:</div>
        <div className="skull-product">{productName}</div>
        <div className="skull-stock">{newQty} left · reorder at {threshold}</div>
        <button className="btn btn-d btn-full" onClick={onClose}>Acknowledged — I'll order more</button>
        <div className="muted" style={{ marginTop: 8, fontStyle: 'italic', fontSize: 11 }}>Tap anywhere to dismiss</div>
      </div>
    </div>
  );
}

// ── Confetti ─────────────────────────────────────────────────────────
export function Confetti({ onDone }: { onDone?: () => void }) {
  useEffect(() => { const t = setTimeout(() => onDone?.(), 3200); return () => clearTimeout(t); }, [onDone]);
  const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#FF2D92'];
  const [pieces] = useState(() => Array.from({ length: 60 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.5, color: colors[i % colors.length], size: 6 + Math.random() * 8, dur: 2.5 + Math.random(),
  })));
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <div key={i} className="confetti-piece" style={{ left: `${p.left}%`, top: -20, background: p.color, width: p.size, height: p.size, borderRadius: i % 2 ? '50%' : 2, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
      ))}
    </div>
  );
}

// ── PIN keypad ───────────────────────────────────────────────────────
export function PinScreen({ title = 'SKYNET', subtitle = 'Mapleton Pharmacy · Enter PIN', onSubmit, length = 4, busy }: {
  title?: string; subtitle?: string; onSubmit: (pin: string) => Promise<boolean | string>; length?: number; busy?: boolean;
}) {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  async function submit(pin: string) {
    setChecking(true);
    const res = await onSubmit(pin);
    setChecking(false);
    if (res === true) return;
    setShake(true); setError(typeof res === 'string' ? res : 'Incorrect PIN');
    setTimeout(() => { setEntered(''); setShake(false); }, 700);
  }
  function press(v: string) {
    if (checking || entered.length >= length) return;
    const next = entered + v;
    setEntered(next); setError('');
    if (next.length === length) setTimeout(() => submit(next), 120);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') { setEntered(x => x.slice(0, -1)); setError(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'];
  return (
    <div className="pin-screen">
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div className="pin-logo">S</div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em' }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{subtitle}</div>
      </div>
      <div className="pin-dots" style={{ animation: shake ? 'pinshake .4s ease' : 'none' }}>
        {Array.from({ length }).map((_, i) => <div key={i} className={`pin-dot ${i < entered.length ? (error ? 'error' : 'filled') : ''}`} />)}
      </div>
      <div className="pin-err">{error || ((checking || busy) ? 'Checking…' : '')}</div>
      <div className="keypad">
        {keys.map((k, i) => (
          <button key={i} className={`key ${k === '' ? 'empty' : ''} ${k === 'DEL' ? 'del' : ''}`} disabled={k === ''}
            onClick={() => k === 'DEL' ? (setEntered(e => e.slice(0, -1)), setError('')) : k ? press(k) : undefined}>{k}</button>
        ))}
      </div>
    </div>
  );
}
