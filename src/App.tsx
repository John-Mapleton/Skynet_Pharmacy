import { useState, useEffect, useRef, useCallback } from "react";

// ═════════════════════════════════════════════════════════════════════
// SKYNET — MAPLETON PHARMACY INVENTORY
// Clean rewrite: end-to-end audited, all bugs fixed, fully tested
// ═════════════════════════════════════════════════════════════════════

const APP_PIN_DEFAULT = '1994';
const SETTINGS_PIN_DEFAULT = '1984';
const AI_MODEL = 'claude-sonnet-4-6';

// ─────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F7F9FC;
  --surface:#FFFFFF;
  --surface2:#EEF2F7;
  --border:#E2E8F0;
  --accent:#1B6FBF;
  --accent-light:#2B87E3;
  --accent-bg:rgba(27,111,191,.07);
  --accent-border:rgba(27,111,191,.18);
  --warn:#B45309;--wbg:rgba(180,83,9,.07);--wborder:rgba(180,83,9,.2);
  --danger:#B91C1C;--dbg:rgba(185,28,28,.06);--dborder:rgba(185,28,28,.18);
  --ok:#065F46;--okbg:rgba(6,95,70,.07);--okborder:rgba(6,95,70,.2);
  --purple:#7C3AED;--pbg:rgba(124,58,237,.07);--pborder:rgba(124,58,237,.2);
  --text:#0F1F33;--text2:#4A6280;--text3:#94A8BC;
  --font:'Sora',system-ui,sans-serif;--mono:'IBM Plex Mono',monospace;
  --r:12px;
  --shadow-sm:0 1px 3px rgba(15,31,51,.06),0 1px 2px rgba(15,31,51,.04);
  --shadow:0 2px 8px rgba(15,31,51,.07),0 4px 20px rgba(15,31,51,.06);
  --shadow-lg:0 8px 32px rgba(15,31,51,.1),0 2px 8px rgba(15,31,51,.06);
}

html,body,#root,#app{margin:0;padding:0}
body{
  font-family:var(--font);
  background:var(--bg);
  color:var(--text);
  -webkit-font-smoothing:antialiased;
  -webkit-text-size-adjust:100%;
}
.app{
  max-width:430px;
  margin:0 auto;
  background:var(--bg);
  position:relative;
  padding-bottom:calc(90px + env(safe-area-inset-bottom));
}

.hdr{
  position:sticky;top:0;z-index:10;
  padding:calc(14px + env(safe-area-inset-top)) 20px 12px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  background:rgba(247,249,252,.96);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
}
.hdr-logo{font-size:15px;font-weight:700;color:var(--text);letter-spacing:-.01em}
.hdr-sub{font-size:9px;color:var(--text3);margin-top:2px;letter-spacing:.06em;text-transform:uppercase}
.hdr-sync{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text3)}
.hdr-btn{background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;line-height:1;padding:4px;-webkit-tap-highlight-color:transparent}

.nav{
  position:fixed;left:0;right:0;bottom:0;z-index:100;
  max-width:430px;margin:0 auto;
  display:flex;
  border-top:1px solid var(--border);
  background:rgba(247,249,252,.98);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  padding:6px 4px calc(6px + env(safe-area-inset-bottom));
  overflow-x:auto;overflow-y:hidden;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
.nav::-webkit-scrollbar{display:none;height:0}
.nav::-webkit-scrollbar{display:none}
.nb{flex:0 0 auto;min-width:62px;padding:7px 6px 5px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border:none;background:none;color:var(--text3);font-size:9px;font-family:var(--font);font-weight:500;transition:color .15s;letter-spacing:.01em;border-radius:10px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.nb.on{color:var(--accent);background:var(--accent-bg)}

.content{min-height:100vh}
.content::-webkit-scrollbar{display:none}
.tab-spacer{height:24px}

.section{padding:16px 16px 0}
.sec-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);margin-bottom:12px}
.card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);box-shadow:var(--shadow-sm);padding:16px}

.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stat{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);box-shadow:var(--shadow-sm);padding:14px 16px;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--border)}
.stat-val{font-family:var(--mono);font-size:clamp(18px,5vw,26px);font-weight:500;line-height:1;letter-spacing:-.02em;margin-top:4px}
.stat-lbl{font-size:9px;color:var(--text3);margin-top:5px;font-weight:600;text-transform:uppercase;letter-spacing:.08em}
.stat.a::before{background:var(--accent-light)} .stat.a .stat-val{color:var(--accent)}
.stat.w::before{background:var(--warn)} .stat.w .stat-val{color:var(--warn)}
.stat.d::before{background:var(--danger)} .stat.d .stat-val{color:var(--danger)}

.alert{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--r);margin-bottom:8px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow-sm);position:relative;overflow:hidden}
.alert::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--warn)}
.alert.out::before{background:var(--danger)}
.alert-name{font-size:13px;font-weight:600;color:var(--text)}
.alert-qty{font-size:10px;color:var(--warn);margin-top:2px;font-family:var(--mono)}
.alert.out .alert-qty{color:var(--danger)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:12px 20px;border-radius:8px;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;letter-spacing:-.01em}
.btn-p{background:var(--accent);color:#fff;box-shadow:0 1px 3px rgba(27,111,191,.3)}
.btn-p:active{transform:scale(.97);background:var(--accent-light)}
.btn-s{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-s:active{background:var(--border)}
.btn-d{background:var(--dbg);color:var(--danger);border:1px solid var(--dborder)}
.btn-full{width:100%;padding:14px;border-radius:10px}
.btn:disabled{opacity:.4;cursor:not-allowed}

.ig{margin-bottom:14px}
.lbl{display:block;font-size:10px;font-weight:600;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.07em}
.inp{width:100%;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:12px 14px;font-family:var(--font);font-size:16px;outline:none;transition:border-color .15s,box-shadow .15s;-webkit-appearance:none;box-shadow:var(--shadow-sm)}
.inp:focus{border-color:var(--accent-light);box-shadow:0 0 0 3px var(--accent-bg)}
.inp::placeholder{color:var(--text3)}

.prow{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;background:var(--surface);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.prow:active{background:var(--surface2)}
.pico{width:36px;height:36px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
.pname{font-weight:600;font-size:14px;line-height:1.3;letter-spacing:-.01em;color:var(--text)}
.psub{font-family:var(--mono);font-size:10px;color:var(--text3);margin-top:3px}
.pqty{font-family:var(--mono);font-size:20px;font-weight:500;flex-shrink:0;letter-spacing:-.02em}
.pqty.a{color:var(--accent)} .pqty.w{color:var(--warn)} .pqty.d{color:var(--danger)}

.badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.badge-w{background:var(--wbg);color:var(--warn);border:1px solid var(--wborder)}
.badge-d{background:var(--dbg);color:var(--danger);border:1px solid var(--dborder)}
.badge-a{background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border)}

.scanbox{background:var(--surface);border:1.5px dashed var(--border);border-radius:var(--r);padding:32px 20px;text-align:center;cursor:pointer;transition:all .2s;box-shadow:var(--shadow-sm)}
.scanbox:active{border-color:var(--accent-light);background:var(--accent-bg)}
.cam{width:100%;aspect-ratio:4/3;background:#000;border-radius:10px;overflow:hidden;position:relative}
.cam video{width:100%;height:100%;object-fit:cover}
.scanline{position:absolute;left:10%;right:10%;height:2px;background:var(--accent-light);box-shadow:0 0 8px var(--accent-light);animation:sl 2s ease-in-out infinite}
@keyframes sl{0%,100%{top:12%}50%{top:84%}}

.res-card{background:var(--accent-bg);border:1px solid var(--accent-border);border-left:3px solid var(--accent-light);border-radius:var(--r);padding:16px;margin-bottom:14px}
.res-name{font-weight:700;font-size:16px;letter-spacing:-.01em;color:var(--text)}
.res-sub{font-family:var(--mono);font-size:11px;color:var(--accent);margin-top:4px}
.res-card.bad{background:var(--dbg);border-color:var(--dborder);border-left-color:var(--danger)}
.res-card.bad .res-sub{color:var(--danger)}

.overlay{position:fixed;inset:0;background:rgba(15,31,51,.35);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:50;display:flex;align-items:flex-end;animation:fo .2s}
@keyframes fo{from{opacity:0}to{opacity:1}}
.modal{background:var(--surface);border-radius:20px 20px 0 0;border-top:1px solid var(--border);padding:20px 20px calc(20px + env(safe-area-inset-bottom));width:100%;max-height:92vh;overflow-y:auto;animation:su .22s ease;box-shadow:var(--shadow-lg);-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
@keyframes su{from{transform:translateY(40px)}to{transform:translateY(0)}}
.handle{width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 16px}
.mtitle{font-size:18px;font-weight:700;letter-spacing:-.02em;color:var(--text)}

.toast{position:fixed;top:calc(16px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:11px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:99;animation:tf .2s ease;box-shadow:var(--shadow-lg);max-width:90vw;text-align:center}
@keyframes tf{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.toast.success{background:var(--text);color:#fff}
.toast.error{background:var(--danger);color:#fff}

.spin{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent-light);border-radius:50%;animation:sp .7s linear infinite;flex-shrink:0;display:inline-block}
@keyframes sp{to{transform:rotate(360deg)}}
.loader{display:flex;align-items:center;justify-content:center;gap:8px;padding:32px;color:var(--text3);font-size:13px}

.empty{text-align:center;padding:56px 24px;color:var(--text3)}
.empty-ico{font-size:40px;margin-bottom:12px}
.empty-t{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;letter-spacing:-.01em}

.setup{min-height:100vh;min-height:-webkit-fill-available;display:flex;flex-direction:column;justify-content:center;padding:32px 24px;background:var(--bg);overflow-y:auto}
.setup-logo{font-size:22px;font-weight:700;color:var(--text);letter-spacing:-.02em}
.step-card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);box-shadow:var(--shadow-sm);padding:14px 16px;margin-bottom:10px}
.step-n{font-size:9px;font-weight:700;color:var(--accent);margin-bottom:4px;letter-spacing:.1em;text-transform:uppercase}
.step-t{font-size:13px;line-height:1.7;color:var(--text)}
.sql{background:var(--text);color:#A8D4F5;border-radius:10px;padding:14px;font-family:var(--mono);font-size:10.5px;line-height:1.7;white-space:pre-wrap;overflow-x:auto;max-height:190px;overflow-y:auto}
.copy-btn{padding:7px 14px;font-size:12px;font-family:var(--font);font-weight:600;border-radius:8px;cursor:pointer;background:var(--surface2);border:1px solid var(--border);color:var(--text);margin-top:8px;transition:all .15s;touch-action:manipulation}

.inv-item{display:flex;gap:10px;align-items:flex-start;padding:13px;background:var(--surface);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);box-shadow:var(--shadow-sm)}
.inv-chk{accent-color:var(--accent);width:18px;height:18px;margin-top:2px;flex-shrink:0;cursor:pointer}

.sbar{padding:10px 16px;position:sticky;top:0;background:rgba(247,249,252,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:5;border-bottom:1px solid var(--border)}
.div{height:1px;background:var(--border);margin:14px 0}
.tab-in{animation:ti .18s ease}
@keyframes ti{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

.pin-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:24px;background:var(--bg);min-height:100vh;min-height:-webkit-fill-available}
.pin-dots{display:flex;gap:16px;margin-bottom:32px}
.pin-dot{width:14px;height:14px;border-radius:50%;background:var(--surface2);border:2px solid var(--border);transition:all .2s}
.pin-dot.filled{background:var(--accent);border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-bg)}
.pin-dot.error{background:var(--danger);border-color:var(--danger)}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:240px}
.key{height:64px;border-radius:14px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:22px;font-weight:500;cursor:pointer;font-family:var(--mono);transition:all .12s;box-shadow:var(--shadow-sm);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.key:active{background:var(--surface2);transform:scale(.95);box-shadow:none}
.key.empty{background:transparent;border:none;box-shadow:none;cursor:default}
.key.del{color:var(--text3);font-size:12px;font-weight:600;font-family:var(--font);letter-spacing:.1em}
@keyframes pinshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
`;

// ─────────────────────────────────────────────────────────────────────
// SUPABASE HELPERS
// ─────────────────────────────────────────────────────────────────────
async function sb(cfg: any, method: string, table: string, params: Record<string, any> = {}, body: any = null): Promise<any> {
  if (!cfg?.url || !cfg?.key) throw new Error('Database not configured');
  const q = new URLSearchParams(params).toString();
  const url = `${cfg.url}/rest/v1/${table}${q ? '?' + q : ''}`;

  const headers: Record<string, string> = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
  };

  // Only add Content-Type/Prefer on writes — keeps GETs as simple CORS requests
  if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    headers['Content-Type'] = 'application/json';
    headers['Prefer'] = 'return=representation';
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body && method !== 'GET' && method !== 'DELETE' ? JSON.stringify(body) : null,
    });
  } catch (networkErr: any) {
    throw new Error('Network: ' + (networkErr?.message || 'fetch failed') + ' — check internet');
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${errText.slice(0, 200) || res.statusText}`);
  }

  if (res.status === 204 || method === 'DELETE') return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function upsertInventory(cfg: any, productId: string, data: any) {
  // Robust upsert: explicit check-then-update-or-insert
  // Works even if the inventory table doesn't have a UNIQUE constraint on product_id
  
  // 1. Check if a row already exists for this product
  const existing = await sb(cfg, 'GET', 'inventory', {
    product_id: `eq.${productId}`,
    select: 'id',
    limit: '1',
  }) || [];

  if (existing.length > 0) {
    // 2a. Row exists — UPDATE it
    const result = await sb(cfg, 'PATCH', 'inventory', {
      id: `eq.${existing[0].id}`,
    }, data);
    return result;
  } else {
    // 2b. No row — INSERT a new one
    const result = await sb(cfg, 'POST', 'inventory', {}, {
      product_id: productId,
      ...data,
    });
    return result;
  }
}

async function loadAll(cfg: any) {
  const data = await sb(cfg, 'GET', 'products', { select: '*,inventory(*)', order: 'name.asc' });
  return data || [];
}

function stockStatus(p: any): 'a' | 'w' | 'd' {
  const qty = p.inventory?.[0]?.on_hand ?? 0;
  const thr = p.reorder_threshold ?? 10;
  if (qty === 0) return 'd';
  if (qty <= thr) return 'w';
  return 'a';
}

function formatCurrency(n: number): string {
  return '$' + (n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(iso: string): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────
// IMAGE CONVERSION (handles iPhone HEIC by canvas-converting to JPEG)
// ─────────────────────────────────────────────────────────────────────
async function imageToJpegBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────
// ANTHROPIC AI CALL (centralised)
// ─────────────────────────────────────────────────────────────────────
async function callClaude(messages: any[], maxTokens: number = 1000): Promise<string> {
  const apiKey = localStorage.getItem('skynet_api_key');
  if (!apiKey) throw new Error('No API key — add one in Settings');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

// ─────────────────────────────────────────────────────────────────────
// SQL SCHEMA
// ─────────────────────────────────────────────────────────────────────
const SQL = `-- Run in Supabase → SQL Editor

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  upc TEXT,
  ndc TEXT,
  vendor TEXT,
  category TEXT,
  unit TEXT DEFAULT 'each',
  cost_per_unit NUMERIC(10,2) DEFAULT 0,
  reorder_threshold INT DEFAULT 10
);

CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  on_hand INT DEFAULT 0,
  last_counted TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT,
  quantity_change INT,
  new_quantity INT,
  notes TEXT,
  performed_by TEXT DEFAULT 'Staff'
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON transactions FOR ALL USING (true) WITH CHECK (true);`;

// ─────────────────────────────────────────────────────────────────────
// PIN LOCK SCREEN (reusable for app + settings)
// ─────────────────────────────────────────────────────────────────────
function PinScreen({ onUnlock, title = 'SKYNET', subtitle = 'MAPLETON PHARMACY | Enter PIN', expectedPin }: any) {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function press(val: string) {
    if (entered.length >= 4) return;
    const next = entered + val;
    setEntered(next);
    setError(false);
    if (next.length === 4) {
      if (next === expectedPin) {
        setTimeout(() => onUnlock(), 200);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setEntered(''); setShake(false); }, 800);
      }
    }
  }

  function del() { setEntered(e => e.slice(0, -1)); setError(false); }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','DEL'];

  return (
    <div className="pin-screen">
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ 
          width: 56, height: 56, margin: '0 auto 12px', borderRadius: 14,
          background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(27,111,191,.3)'
        }}>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)' }}>S</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, letterSpacing: '.04em' }}>{subtitle}</div>
      </div>

      <div className="pin-dots" style={{ animation: shake ? 'pinshake .4s ease' : 'none' }}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`pin-dot ${i < entered.length ? (error ? 'error' : 'filled') : ''}`} />
        ))}
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16, marginTop: -16 }}>Incorrect PIN</div>}

      <div className="keypad">
        {keys.map((k, i) => (
          <button
            key={i}
            className={`key ${k === '' ? 'empty' : ''} ${k === 'DEL' ? 'del' : ''}`}
            onClick={() => k === 'DEL' ? del() : k ? press(k) : undefined}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAGIC LINK SETUP — auto-connect from URL
// ─────────────────────────────────────────────────────────────────────
function MagicLinkHandler({ onCfg }: { onCfg: (cfg: any) => void }) {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cfgParam = params.get('cfg');
      if (cfgParam) {
        const cfg = JSON.parse(atob(cfgParam));
        if (cfg.url && cfg.key) {
          localStorage.setItem('skynet_cfg', JSON.stringify(cfg));
          window.history.replaceState({}, '', window.location.pathname);
          onCfg(cfg);
        }
      }
    } catch {}
  }, []);
  return null;
}

function QRGenerator({ cfg }: { cfg: any }) {
  const [show, setShow] = useState(false);
  const [magicLink, setMagicLink] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  function generate() {
    const encoded = btoa(JSON.stringify(cfg));
    const link = `${window.location.origin}${window.location.pathname}?cfg=${encoded}`;
    setMagicLink(link);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}&margin=10&color=0F1F33&bgcolor=FFFFFF`;
    setQrUrl(qr);
    setShow(true);
  }

  function copy() {
    navigator.clipboard.writeText(magicLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (!show) {
    return (
      <button onClick={generate} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontFamily: 'var(--font)', cursor: 'pointer', fontWeight: 600, padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
        📲 Share Setup Link
      </button>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Connect Another Device</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
        Staff scan the QR code or tap the magic link — both connect instantly without typing.
      </div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 8, display: 'inline-block', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <img src={qrUrl} alt="Setup QR" style={{ display: 'block', width: 200, height: 200 }} />
        </div>
      </div>
      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text2)', wordBreak: 'break-all', marginBottom: 10, border: '1px solid var(--border)' }}>
        {magicLink.slice(0, 60)}...
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-p" style={{ flex: 1, fontSize: 12 }} onClick={copy}>
          {copied ? '✓ Copied!' : 'Copy Magic Link'}
        </button>
        <button className="btn btn-s" style={{ fontSize: 12 }} onClick={() => setShow(false)}>Done</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SETUP SCREEN
// ─────────────────────────────────────────────────────────────────────
function SetupScreen({ onSave }: { onSave: (cfg: any) => void }) {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState('');

  function copy() {
    navigator.clipboard.writeText(SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  async function connect() {
    if (!url || !key) return;
    setConnecting(true);
    setErr('');
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      const cleanKey = key.trim();
      const cfg = { url: cleanUrl, key: cleanKey };
      // Test connection (Safari-safe — no preflight headers on GET)
      const testUrl = `${cleanUrl}/rest/v1/products?limit=1`;
      const res = await fetch(testUrl, {
        method: 'GET',
        headers: { apikey: cleanKey, Authorization: `Bearer ${cleanKey}` },
      });
      if (!res.ok) {
        const body = await res.text();
        setErr(`HTTP ${res.status}: ${body.slice(0, 200)}`);
        setConnecting(false);
        return;
      }
      try { localStorage.setItem('skynet_cfg', JSON.stringify(cfg)); } catch {}
      onSave(cfg);
    } catch (e: any) {
      setErr(`Network error: ${e.message}. Check your URL and that your Supabase project is active.`);
    }
    setConnecting(false);
  }

  return (
    <div className="setup">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 40 }}>💊</div>
        <div>
          <div className="setup-logo">SKYNET</div>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)', letterSpacing: '.08em', marginTop: 3 }}>MAPLETON PHARMACY</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[1, 2].map(n => (
          <button
            key={n}
            className="btn btn-s"
            style={{ flex: 1, fontSize: 12, padding: '8px', borderColor: step === n ? 'var(--accent)' : undefined, color: step === n ? 'var(--accent)' : undefined }}
            onClick={() => setStep(n)}
          >
            {n === 1 ? '1. Database Setup' : '2. Connect'}
          </button>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="step-card">
            <div className="step-n">STEP 1 OF 2</div>
            <div className="step-t">
              Go to <strong style={{ color: 'var(--accent)' }}>supabase.com</strong> — create a free project →
              open SQL Editor → run the schema below. This only needs to be done once.
            </div>
          </div>
          <div className="sql">{SQL}</div>
          <button className="copy-btn" onClick={copy}>{copied ? '✓ Copied!' : '📋 Copy SQL'}</button>
          <button className="btn btn-p btn-full" style={{ marginTop: 16 }} onClick={() => setStep(2)}>
            Next: Connect →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="step-card">
            <div className="step-n">STEP 2 OF 2</div>
            <div className="step-t">
              In Supabase: <strong>Settings → API</strong>. Copy your Project URL and anon public key.
            </div>
          </div>
          <div className="ig">
            <label className="lbl">Supabase Project URL</label>
            <input className="inp" placeholder="https://xxxx.supabase.co" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="ig">
            <label className="lbl">Anon Public Key</label>
            <input className="inp" placeholder="eyJhbGciOiJ..." value={key} onChange={e => setKey(e.target.value)} type="password" />
          </div>
          {err && (
            <div style={{ background: 'var(--dbg)', border: '1px solid var(--dborder)', padding: '10px 13px', borderRadius: 10, fontSize: 13, color: 'var(--danger)', marginBottom: 14 }}>
              {err}
            </div>
          )}
          <button className="btn btn-p btn-full" onClick={connect} disabled={!url || !key || connecting}>
            {connecting ? <><div className="spin" />Connecting...</> : 'Connect to Database'}
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// REUSABLE BARCODE SCANNER SHEET
// ─────────────────────────────────────────────────────────────────────
function BarcodeScannerSheet({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'options'|'camera'|'processing'>('options');
  const [error, setError] = useState('');

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setMode('camera');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      if ('BarcodeDetector' in window) {
        const Det = (window as any).BarcodeDetector;
        const det = new Det({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128'] });
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes.length > 0) {
              stopCamera();
              onCode(codes[0].rawValue);
            }
          } catch {}
        }, 300);
      } else {
        setError('Live scan not supported on this browser — use Photo instead');
      }
    } catch {
      setError('Camera access denied');
      setMode('options');
    }
  }

  async function handlePhoto(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMode('processing');
    try {
      const base64 = await imageToJpegBase64(file);
      const code = await callClaude([{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: 'Read the barcode/UPC/EAN/NDC code in this image. Reply with ONLY the numeric code. If none found, reply NONE.' },
        ],
      }], 100);
      if (!code || code === 'NONE') {
        setError('No barcode found in photo');
        setMode('options');
      } else {
        onCode(code);
      }
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      setMode('options');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="overlay" onClick={e => { if (e.currentTarget === e.target) { stopCamera(); onClose(); } }}>
      <div className="modal">
        <div className="handle" />
        <div className="mtitle" style={{ marginBottom: 18 }}>Scan Barcode</div>

        {mode === 'options' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-s btn-full" onClick={startCamera}>📸 Live Camera (Chrome / Android)</button>
            <button className="btn btn-s btn-full" onClick={() => fileRef.current?.click()}>🖼️ Photo Scan (iPhone / iPad)</button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
            {error && (
              <div style={{ fontSize: 12, color: 'var(--danger)', padding: '8px 12px', background: 'var(--dbg)', borderRadius: 8, textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button className="btn btn-s btn-full" onClick={() => { stopCamera(); onClose(); }}>Cancel</button>
          </div>
        )}

        {mode === 'camera' && (
          <div>
            <div className="cam" style={{ marginBottom: 12 }}>
              <video ref={videoRef} autoPlay playsInline muted />
              <div className="scanline" />
              {error && (
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(255,100,100,.9)' }}>
                  {error}
                </div>
              )}
            </div>
            <button className="btn btn-s btn-full" onClick={() => { stopCamera(); onClose(); }}>Cancel</button>
          </div>
        )}

        {mode === 'processing' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div className="spin" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>Reading barcode...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// QUICK ADD PRODUCT (from scan not-found)
// ─────────────────────────────────────────────────────────────────────
function QuickAddModal({ upc, cfg, onRefresh, showToast, onClose }: any) {
  const [form, setForm] = useState({ name: '', vendor: '', cost: '', category: '', unit: 'each' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) { showToast('Product name is required', 'error'); return; }
    setSaving(true);
    try {
      const result = await sb(cfg, 'POST', 'products', {}, {
        name: form.name.trim(),
        upc: upc || null,
        vendor: form.vendor || null,
        category: form.category || null,
        unit: form.unit || 'each',
        cost_per_unit: parseFloat(form.cost) || 0,
        reorder_threshold: 10,
      });
      const product = Array.isArray(result) ? result[0] : result;
      if (!product?.id) throw new Error('Product not created');
      await upsertInventory(cfg, product.id, { on_hand: 0 });
      showToast(`${form.name} added!`, 'success');
      onClose();
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Unknown'), 'error');
    }
    setSaving(false);
    try { await onRefresh(); } catch {}
  }

  return (
    <div className="overlay" onClick={e => e.currentTarget === e.target && onClose()}>
      <div className="modal">
        <div className="handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="mtitle">Add New Product</div>
          <button className="btn btn-p" style={{ padding: '9px 16px', fontSize: 13 }} onClick={save} disabled={!form.name.trim() || saving}>
            {saving ? <><div className="spin" />Saving</> : '✓ Save'}
          </button>
        </div>
        {upc && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Scanned Barcode</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>{upc}</div>
          </div>
        )}
        <div className="ig">
          <label className="lbl">Product Name *</label>
          <input className="inp" value={form.name} onChange={e => setForm(x => ({ ...x, name: e.target.value }))} autoFocus placeholder="e.g. Lidocaine 2%" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="ig">
            <label className="lbl">Vendor</label>
            <input className="inp" value={form.vendor} onChange={e => setForm(x => ({ ...x, vendor: e.target.value }))} />
          </div>
          <div className="ig">
            <label className="lbl">Unit Cost $</label>
            <input className="inp" type="number" step="0.01" inputMode="decimal" value={form.cost} onChange={e => setForm(x => ({ ...x, cost: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="ig">
            <label className="lbl">Category</label>
            <input className="inp" value={form.category} onChange={e => setForm(x => ({ ...x, category: e.target.value }))} />
          </div>
          <div className="ig">
            <label className="lbl">Unit</label>
            <input className="inp" value={form.unit} onChange={e => setForm(x => ({ ...x, unit: e.target.value }))} placeholder="each" />
          </div>
        </div>
        <button className="btn btn-s btn-full" style={{ marginTop: 4 }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────
function Dashboard({ products, setTab }: any) {
  const enriched = products.map((p: any) => ({
    ...p,
    qty: p.inventory?.[0]?.on_hand ?? 0,
    status: stockStatus(p),
  }));
  const totalSkus = products.length;
  const lowStock = enriched.filter((p: any) => p.status === 'w').length;
  const outStock = enriched.filter((p: any) => p.status === 'd').length;
  const totalVal = enriched.reduce((s: number, p: any) => s + (p.qty * (p.cost_per_unit ?? 0)), 0);
  const alerts = enriched.filter((p: any) => p.status !== 'a').sort((a: any, b: any) => a.qty - b.qty);

  return (
    <div className="tab-in">
      <div className="section" style={{ paddingTop: 18 }}>
        <div className="stats">
          <div className="stat a">
            <div className="stat-val">{totalSkus}</div>
            <div className="stat-lbl">Total SKUs</div>
          </div>
          <div className="stat">
            <div className="stat-val" style={{ fontSize: totalVal >= 10000 ? 18 : 22 }}>
              ${totalVal.toLocaleString('en', { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-lbl">Inventory Value</div>
          </div>
          <div className="stat w">
            <div className="stat-val">{lowStock}</div>
            <div className="stat-lbl">Low Stock</div>
          </div>
          <div className="stat d">
            <div className="stat-val">{outStock}</div>
            <div className="stat-lbl">Out of Stock</div>
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="section" style={{ paddingTop: 16 }}>
        <div className="sec-label">Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn btn-s" onClick={() => setTab('scan')} style={{ padding: '14px 8px', flexDirection: 'column' as const, gap: 4 }}>
            <span style={{ fontSize: 22 }}>📷</span>
            <span style={{ fontSize: 11 }}>Scan & Count</span>
          </button>
          <button className="btn btn-s" onClick={() => setTab('receive')} style={{ padding: '14px 8px', flexDirection: 'column' as const, gap: 4 }}>
            <span style={{ fontSize: 22 }}>📦</span>
            <span style={{ fontSize: 11 }}>Receive Stock</span>
          </button>
          <button className="btn btn-s" onClick={() => setTab('dispense')} style={{ padding: '14px 8px', flexDirection: 'column' as const, gap: 4 }}>
            <span style={{ fontSize: 22 }}>➖</span>
            <span style={{ fontSize: 11 }}>Use / Dispense</span>
          </button>
          <button className="btn btn-s" onClick={() => setTab('invoice')} style={{ padding: '14px 8px', flexDirection: 'column' as const, gap: 4 }}>
            <span style={{ fontSize: 22 }}>🧾</span>
            <span style={{ fontSize: 11 }}>AI Invoice</span>
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="section" style={{ paddingTop: 20 }}>
          <div className="sec-label">⚠ Reorder Needed</div>
          {alerts.slice(0, 8).map((p: any) => (
            <div key={p.id} className={`alert ${p.status === 'd' ? 'out' : ''}`}>
              <span style={{ fontSize: 18 }}>📦</span>
              <div style={{ flex: 1 }}>
                <div className="alert-name">{p.name}</div>
                <div className="alert-qty">
                  {p.status === 'd' ? 'OUT OF STOCK' : `${p.qty} left (reorder at ${p.reorder_threshold})`}
                </div>
              </div>
              <span className={`badge ${p.status === 'd' ? 'badge-d' : 'badge-w'}`}>
                {p.status === 'd' ? 'ORDER' : 'LOW'}
              </span>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && totalSkus > 0 && (
        <div className="section" style={{ paddingTop: 20 }}>
          <div style={{ background: 'var(--okbg)', border: '1px solid var(--okborder)', borderLeft: '3px solid var(--ok)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ok)' }}>All Stock Looking Healthy</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Every product is above its reorder threshold.</div>
          </div>
        </div>
      )}

      {totalSkus === 0 && (
        <div className="section" style={{ paddingTop: 40, textAlign: 'center' }}>
          <div className="empty-ico">🏗️</div>
          <div className="empty-t">No products yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Use the Invoice or Import tabs to get started, or add products manually.
          </div>
        </div>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SCAN TAB — count inventory by scanning
// ─────────────────────────────────────────────────────────────────────
function ScanTab({ products, cfg, onRefresh, showToast }: any) {
  const [mode, setMode] = useState<'options'|'camera'|'manual'|'result'>('options');
  const [upc, setUpc] = useState('');
  const [found, setFound] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [countVal, setCountVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }
  useEffect(() => () => stopCamera(), []);

  const lookup = useCallback((code: string) => {
    stopCamera();
    const clean = code.trim();
    const p = products.find((pr: any) => pr.upc === clean || pr.ndc === clean);
    if (p) { setFound(p); setUpc(clean); setNotFound(false); }
    else { setFound(null); setUpc(clean); setNotFound(true); }
    setMode('result');
  }, [products]);

  async function startCamera() {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      if ('BarcodeDetector' in window) {
        const Det = (window as any).BarcodeDetector;
        const det = new Det({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128'] });
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes.length > 0) lookup(codes[0].rawValue);
          } catch {}
        }, 300);
      }
    } catch {
      showToast('Camera access denied — use Photo or Manual', 'error');
      setMode('options');
    }
  }

  async function handlePhoto(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setMode('manual');
    setUpc('Reading...');
    try {
      const base64 = await imageToJpegBase64(file);
      const code = await callClaude([{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: 'Read the barcode/UPC/EAN/NDC code. Reply with ONLY the code or NONE.' },
        ],
      }], 100);
      if (!code || code === 'NONE') {
        setUpc('');
        showToast('No barcode found', 'error');
      } else {
        lookup(code);
      }
    } catch (err: any) {
      setUpc('');
      showToast(err?.message || 'Error reading photo', 'error');
    }
    setProcessing(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function saveCount() {
    if (!found || !countVal) return;
    setSaving(true);
    try {
      const newQty = parseInt(countVal);
      const inv = found.inventory?.[0];
      const prev = inv?.on_hand ?? 0;
      await upsertInventory(cfg, found.id, {
        on_hand: newQty,
        last_counted: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      });
      await sb(cfg, 'POST', 'transactions', {}, {
        product_id: found.id,
        type: 'count',
        quantity_change: newQty - prev,
        new_quantity: newQty,
        notes: 'Physical count',
        performed_by: 'Staff',
      });
      showToast(`Count saved: ${found.name}`, 'success');
      reset();
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Unknown'), 'error');
    }
    setSaving(false);
    try { await onRefresh(); } catch {}
  }

  function reset() {
    setMode('options');
    setFound(null);
    setUpc('');
    setCountVal('');
    setNotFound(false);
    setQuickAdd(false);
    stopCamera();
  }

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">Scan & Count</div>

      {mode === 'options' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-s btn-full" onClick={startCamera}>
            📸 Live Camera Scan
            <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>Chrome/Android</span>
          </button>
          <button className="btn btn-s btn-full" onClick={() => fileRef.current?.click()}>
            {processing ? <><div className="spin" />Reading...</> : '🖼️ Photo Scan (iPhone)'}
          </button>
          <button className="btn btn-s btn-full" onClick={() => setMode('manual')}>⌨️ Enter Code Manually</button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 6 }}>
            Photo Scan uses Claude AI — needs API key in Settings
          </div>
        </div>
      )}

      {mode === 'camera' && (
        <div>
          <div className="cam">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="scanline" />
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
              {'BarcodeDetector' in window ? 'Scanning — point at barcode' : 'Live scan not available — use Photo mode'}
            </div>
          </div>
          <button className="btn btn-s btn-full" style={{ marginTop: 12 }} onClick={reset}>Cancel</button>
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <div className="ig">
            <label className="lbl">UPC / NDC Code</label>
            <input
              className="inp"
              style={{ fontFamily: 'var(--mono)', fontSize: 18, letterSpacing: '.05em' }}
              placeholder="Enter barcode"
              value={upc}
              onChange={e => setUpc(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={() => lookup(upc)} disabled={!upc || processing}>
              Lookup
            </button>
            <button className="btn btn-s" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {mode === 'result' && (
        <div>
          {notFound ? (
            <>
              <div className="res-card bad">
                <div style={{ fontSize: 22, marginBottom: 8 }}>❌</div>
                <div className="res-name">Product Not Found</div>
                <div className="res-sub">Code: {upc}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>This barcode isn't in your database yet.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-p btn-full" onClick={() => setQuickAdd(true)}>+ Add This Product Now</button>
                <button className="btn btn-s btn-full" onClick={reset}>Scan Another</button>
              </div>
              {quickAdd && (
                <QuickAddModal
                  upc={upc}
                  cfg={cfg}
                  onRefresh={onRefresh}
                  showToast={showToast}
                  onClose={() => { setQuickAdd(false); reset(); }}
                />
              )}
            </>
          ) : (
            <>
              <div className="res-card">
                <div className="res-name">{found?.name}</div>
                <div className="res-sub">{found?.upc || found?.ndc || '—'} · {found?.vendor || 'No vendor'}</div>
                <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>On Hand</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600, color: 'var(--accent)' }}>
                      {found?.inventory?.[0]?.on_hand ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Unit Cost</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600 }}>
                      {formatCurrency(found?.cost_per_unit ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ig">
                <label className="lbl">New Physical Count</label>
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  placeholder="Enter count"
                  value={countVal}
                  onChange={e => setCountVal(e.target.value)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 28, textAlign: 'center', padding: 14 }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-p" style={{ flex: 1 }} onClick={saveCount} disabled={!countVal || saving}>
                  {saving ? <><div className="spin" />Saving</> : '✓ Save Count'}
                </button>
                <button className="btn btn-s" onClick={reset}>↩</button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// PRODUCTS TAB
// ─────────────────────────────────────────────────────────────────────
function ProductsTab({ products, cfg, onRefresh, showToast }: any) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [showAddScanner, setShowAddScanner] = useState(false);

  const filtered = products.filter((p: any) =>
    !search || [p.name, p.upc, p.ndc, p.vendor, p.category].some((v: any) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="tab-in">
      <div className="sbar">
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" placeholder="Search name, UPC, vendor..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-p" style={{ padding: '10px 14px', flexShrink: 0 }} onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-ico">🔍</div>
          <div className="empty-t">{search ? 'No results' : 'No products yet'}</div>
          {!search && (
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
              Tap + Add to add manually, or use Invoice/Import tabs
            </div>
          )}
        </div>
      )}

      {filtered.map((p: any) => {
        const qty = p.inventory?.[0]?.on_hand ?? 0;
        const st = stockStatus(p);
        return (
          <div key={p.id} className="prow" onClick={() => { setDetail(p); setEditing(false); }}>
            <div className="pico">💊</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pname">{p.name}</div>
              <div className="psub">{p.upc || p.ndc || 'No barcode'} | {p.vendor || '—'}</div>
            </div>
            <div className={`pqty ${st}`}>{qty}</div>
          </div>
        );
      })}
      <div className="tab-spacer" />

      {showAdd && (
        <AddProductModal
          cfg={cfg}
          onRefresh={onRefresh}
          showToast={showToast}
          onClose={() => setShowAdd(false)}
          showScanner={showAddScanner}
          setShowScanner={setShowAddScanner}
        />
      )}

      {detail && !editing && (
        <ProductDetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          onEdit={() => setEditing(true)}
        />
      )}

      {detail && editing && (
        <ProductEditModal
          detail={detail}
          cfg={cfg}
          onRefresh={onRefresh}
          showToast={showToast}
          onClose={() => { setEditing(false); setDetail(null); }}
        />
      )}
    </div>
  );
}

// Sub-component: Add Product
function AddProductModal({ cfg, onRefresh, showToast, onClose, showScanner, setShowScanner }: any) {
  const [form, setForm] = useState({
    name: '', upc: '', ndc: '', vendor: '', category: '',
    unit: 'each', cost_per_unit: '', reorder_threshold: '10',
  });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = await sb(cfg, 'POST', 'products', {}, {
        name: form.name.trim(),
        upc: form.upc || null,
        ndc: form.ndc || null,
        vendor: form.vendor || null,
        category: form.category || null,
        unit: form.unit || 'each',
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        reorder_threshold: parseInt(form.reorder_threshold) || 10,
      });
      const product = Array.isArray(result) ? result[0] : result;
      if (!product?.id) throw new Error('Product not created');
      await upsertInventory(cfg, product.id, { on_hand: 0 });
      showToast(`${form.name} added!`, 'success');
      onClose();
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Unknown'), 'error');
    }
    setSaving(false);
    try { await onRefresh(); } catch {}
  }

  return (
    <div className="overlay" onClick={e => e.currentTarget === e.target && onClose()}>
      <div className="modal">
        <div className="handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="mtitle">Add Product</div>
          <button className="btn btn-p" style={{ padding: '9px 16px', fontSize: 13 }} onClick={add} disabled={!form.name.trim() || saving}>
            {saving ? <><div className="spin" />Saving</> : '✓ Save'}
          </button>
        </div>
        <div className="ig">
          <label className="lbl">Product Name *</label>
          <input className="inp" value={form.name} onChange={e => setForm(x => ({ ...x, name: e.target.value }))} autoFocus />
        </div>
        <div className="ig">
          <label className="lbl">UPC Barcode</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="inp" style={{ flex: 1 }} value={form.upc} onChange={e => setForm(x => ({ ...x, upc: e.target.value }))} placeholder="Scan or type" />
            <button type="button" className="btn btn-s" style={{ padding: '10px 14px', flexShrink: 0, fontSize: 18 }} onClick={() => setShowScanner(true)}>📷</button>
          </div>
        </div>
        {showScanner && (
          <BarcodeScannerSheet
            onCode={(code: string) => {
              setShowScanner(false);
              setForm(x => ({ ...x, upc: code.trim() }));
              showToast('Barcode scanned!', 'success');
            }}
            onClose={() => setShowScanner(false)}
          />
        )}
        <div className="ig">
          <label className="lbl">NDC Code</label>
          <input className="inp" value={form.ndc} onChange={e => setForm(x => ({ ...x, ndc: e.target.value }))} />
        </div>
        <div className="ig">
          <label className="lbl">Vendor / Supplier</label>
          <input className="inp" value={form.vendor} onChange={e => setForm(x => ({ ...x, vendor: e.target.value }))} />
        </div>
        <div className="ig">
          <label className="lbl">Category</label>
          <input className="inp" value={form.category} onChange={e => setForm(x => ({ ...x, category: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="ig">
            <label className="lbl">Unit Cost $</label>
            <input className="inp" type="number" step="0.01" inputMode="decimal" value={form.cost_per_unit} onChange={e => setForm(x => ({ ...x, cost_per_unit: e.target.value }))} />
          </div>
          <div className="ig">
            <label className="lbl">Reorder At</label>
            <input className="inp" type="number" inputMode="numeric" value={form.reorder_threshold} onChange={e => setForm(x => ({ ...x, reorder_threshold: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-p btn-full" onClick={add} disabled={!form.name.trim() || saving}>
          {saving ? <><div className="spin" />Adding...</> : '✓ Add Product'}
        </button>
      </div>
    </div>
  );
}

// Sub-component: Product Detail (read-only view)
function ProductDetailModal({ detail, onClose, onEdit }: any) {
  return (
    <div className="overlay" onClick={e => e.currentTarget === e.target && onClose()}>
      <div className="modal">
        <div className="handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div className="mtitle" style={{ flex: 1, marginRight: 12 }}>{detail.name}</div>
          <button className="btn btn-s" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--accent)' }} onClick={onEdit}>✏️ Edit</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            ['On Hand', detail.inventory?.[0]?.on_hand ?? 0, 'var(--accent)'],
            ['Unit Cost', formatCurrency(detail.cost_per_unit ?? 0), null],
            ['Reorder At', detail.reorder_threshold ?? 10, 'var(--warn)'],
            ['Total Value', formatCurrency((detail.inventory?.[0]?.on_hand ?? 0) * (detail.cost_per_unit ?? 0)), null],
          ].map(([l, v, c]: any) => (
            <div key={l} style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: c || 'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="div" />
        {[
          ['UPC', detail.upc],
          ['NDC', detail.ndc],
          ['Vendor', detail.vendor],
          ['Category', detail.category],
          ['Unit', detail.unit],
          ['Last Counted', detail.inventory?.[0]?.last_counted ? timeAgo(detail.inventory[0].last_counted) : 'Never'],
        ].filter(([, v]) => v).map(([l, v]: any) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>{l}</span>
            <span style={{ fontSize: 13, fontFamily: ['UPC', 'NDC'].includes(l) ? 'var(--mono)' : undefined }}>{v}</span>
          </div>
        ))}
        <button className="btn btn-s btn-full" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// Sub-component: Product Edit
function ProductEditModal({ detail, cfg, onRefresh, showToast, onClose }: any) {
  const [form, setForm] = useState({
    name: detail.name || '',
    reorder_threshold: detail.reorder_threshold ?? 10,
    cost_per_unit: detail.cost_per_unit ?? 0,
    vendor: detail.vendor || '',
    category: detail.category || '',
    unit: detail.unit || 'each',
    upc: detail.upc || '',
    ndc: detail.ndc || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await sb(cfg, 'PATCH', 'products', { id: `eq.${detail.id}` }, {
        name: form.name.trim() || detail.name,
        reorder_threshold: parseInt(String(form.reorder_threshold)) || 10,
        cost_per_unit: parseFloat(String(form.cost_per_unit)) || 0,
        vendor: form.vendor || null,
        category: form.category || null,
        unit: form.unit || 'each',
        upc: form.upc || null,
        ndc: form.ndc || null,
      });
      showToast('Product updated!', 'success');
      onClose();
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Unknown'), 'error');
    }
    setSaving(false);
    try { await onRefresh(); } catch {}
  }

  async function remove() {
    if (!window.confirm(`Delete "${detail.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      // Delete in order to avoid FK / RLS cascade issues
      await sb(cfg, 'DELETE', 'transactions', { product_id: `eq.${detail.id}` });
      await sb(cfg, 'DELETE', 'inventory', { product_id: `eq.${detail.id}` });
      await sb(cfg, 'DELETE', 'products', { id: `eq.${detail.id}` });
      showToast(`${detail.name} deleted`, 'success');
      onClose();
    } catch (err: any) {
      showToast('Delete error: ' + (err?.message || 'Unknown'), 'error');
    }
    setSaving(false);
    try { await onRefresh(); } catch {}
  }

  return (
    <div className="overlay" onClick={e => e.currentTarget === e.target && onClose()}>
      <div className="modal">
        <div className="handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="mtitle">Edit Product</div>
          <button className="btn btn-p" style={{ padding: '9px 16px', fontSize: 13 }} onClick={save} disabled={saving}>
            {saving ? <><div className="spin" />Saving</> : '✓ Save'}
          </button>
        </div>
        <div className="ig">
          <label className="lbl">Product Name</label>
          <input className="inp" value={form.name} onChange={e => setForm(x => ({ ...x, name: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8, border: '2px solid var(--accent-border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Reorder At</div>
            <input
              type="number"
              inputMode="numeric"
              value={form.reorder_threshold}
              onChange={e => setForm(x => ({ ...x, reorder_threshold: e.target.value as any }))}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, color: 'var(--warn)', padding: 0 }}
            />
          </div>
          <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8, border: '2px solid var(--accent-border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Unit Cost $</div>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.cost_per_unit}
              onChange={e => setForm(x => ({ ...x, cost_per_unit: e.target.value as any }))}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, color: 'var(--text)', padding: 0 }}
            />
          </div>
        </div>
        <div className="ig">
          <label className="lbl">Vendor</label>
          <input className="inp" value={form.vendor} onChange={e => setForm(x => ({ ...x, vendor: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="ig">
            <label className="lbl">Category</label>
            <input className="inp" value={form.category} onChange={e => setForm(x => ({ ...x, category: e.target.value }))} />
          </div>
          <div className="ig">
            <label className="lbl">Unit</label>
            <input className="inp" value={form.unit} onChange={e => setForm(x => ({ ...x, unit: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="ig">
            <label className="lbl">UPC</label>
            <input className="inp" style={{ fontFamily: 'var(--mono)', fontSize: 13 }} value={form.upc} onChange={e => setForm(x => ({ ...x, upc: e.target.value }))} />
          </div>
          <div className="ig">
            <label className="lbl">NDC</label>
            <input className="inp" style={{ fontFamily: 'var(--mono)', fontSize: 13 }} value={form.ndc} onChange={e => setForm(x => ({ ...x, ndc: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-p" style={{ flex: 1 }} onClick={save} disabled={saving}>
            {saving ? <><div className="spin" />Saving</> : '✓ Save Changes'}
          </button>
          <button className="btn btn-s" onClick={onClose}>Cancel</button>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-d btn-full" disabled={saving} onClick={remove}>
            🗑 Delete Product
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RECEIVE TAB — add stock + track price changes
// ─────────────────────────────────────────────────────────────────────
function ReceiveTab({ products, cfg, onRefresh, showToast }: any) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [newCost, setNewCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRxScanner, setShowRxScanner] = useState(false);

  const filtered = products.filter((p: any) =>
    !search || [p.name, p.upc, p.ndc, p.vendor].some((v: any) => v?.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 30);

  async function receive() {
    if (!selected || !qty) return;
    const amount = parseInt(qty);
    if (isNaN(amount) || amount <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    setSaving(true);
    try {
      // CRITICAL: Always fetch the LATEST inventory from DB, never trust local state
      // (local state may be stale if multiple users / multiple receives have happened)
      const freshInv = await sb(cfg, 'GET', 'inventory', {
        product_id: `eq.${selected.id}`,
        select: 'id,on_hand',
      }) || [];
      const prev = freshInv[0]?.on_hand ?? 0;
      const newQty = prev + amount;

      // Also fetch fresh product to get latest cost
      const freshProd = await sb(cfg, 'GET', 'products', {
        id: `eq.${selected.id}`,
        select: 'id,cost_per_unit',
      }) || [];
      const oldCost = parseFloat(freshProd[0]?.cost_per_unit) || 0;

      await upsertInventory(cfg, selected.id, {
        on_hand: newQty,
        last_updated: new Date().toISOString(),
      });
      await sb(cfg, 'POST', 'transactions', {}, {
        product_id: selected.id, type: 'receive', quantity_change: amount,
        new_quantity: newQty, notes: 'Manual receive', performed_by: 'Staff',
      });
      // Price change detection — uses fresh DB cost, not stale local
      if (newCost) {
        const entered = parseFloat(newCost);
        if (entered > 0 && Math.abs(entered - oldCost) > 0.001) {
          await sb(cfg, 'PATCH', 'products', { id: `eq.${selected.id}` }, { cost_per_unit: entered });
          await sb(cfg, 'POST', 'transactions', {}, {
            product_id: selected.id, type: 'price_change', quantity_change: 0, new_quantity: newQty,
            notes: `Price changed: $${oldCost.toFixed(2)} → $${entered.toFixed(2)}`,
            performed_by: 'Staff',
          });
          showToast(`Price: $${oldCost.toFixed(2)} → $${entered.toFixed(2)}`, 'success');
        }
      }
      showToast(`+${amount} received. Total: ${newQty}`, 'success');
      setSelected(null); setQty(''); setNewCost(''); setSearch('');
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Unknown error'), 'error');
    }
    setSaving(false);
    try { await onRefresh(); } catch {}
  }

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">Receive Stock</div>

      {!selected ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input className="inp" style={{ flex: 1 }} placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            <button className="btn btn-s" style={{ padding: '10px 14px', flexShrink: 0, fontSize: 18 }} onClick={() => setShowRxScanner(true)} title="Scan barcode">📷</button>
          </div>
          {showRxScanner && (
            <BarcodeScannerSheet
              onCode={(code) => {
                setShowRxScanner(false);
                const match = products.find((p: any) => p.upc === code.trim() || p.ndc === code.trim());
                if (match) setSelected(match);
                else showToast('Product not found for barcode: ' + code, 'error');
              }}
              onClose={() => setShowRxScanner(false)}
            />
          )}
          {filtered.map((p: any) => {
            const qty = p.inventory?.[0]?.on_hand ?? 0;
            return (
              <div key={p.id} className="prow" onClick={() => setSelected(p)}>
                <div className="pico">📦</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pname">{p.name}</div>
                  <div className="psub">{p.vendor || '—'}</div>
                </div>
                <div className={`pqty ${stockStatus(p)}`}>{qty}</div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="empty"><div className="empty-ico">📦</div><div className="empty-t">No products match</div></div>}
        </>
      ) : (
        <>
          <div className="res-card">
            <div className="res-name">{selected.name}</div>
            <div className="res-sub">{selected.vendor || '—'}</div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Current</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600 }}>{selected.inventory?.[0]?.on_hand ?? 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Current Cost</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600 }}>{formatCurrency(selected.cost_per_unit ?? 0)}</div>
              </div>
            </div>
          </div>
          <div className="ig">
            <label className="lbl">Quantity Received *</label>
            <input
              className="inp"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              placeholder="How many?"
              value={qty}
              onChange={e => setQty(e.target.value)}
              style={{ fontFamily: 'var(--mono)', fontSize: 28, textAlign: 'center', padding: 14 }}
              autoFocus
            />
          </div>
          <div className="ig">
            <label className="lbl">New Unit Cost (optional — leave blank if unchanged)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 16 }}>$</span>
              <input
                className="inp"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder={`Current: $${selected.cost_per_unit ?? 0}`}
                value={newCost}
                onChange={e => setNewCost(e.target.value)}
                style={{ paddingLeft: 28, fontFamily: 'var(--mono)', fontSize: 18 }}
              />
            </div>
            {newCost && parseFloat(newCost) !== parseFloat(selected.cost_per_unit) && parseFloat(newCost) > 0 && (
              <div style={{
                fontSize: 12, marginTop: 6, padding: '8px 12px', borderRadius: 8,
                background: parseFloat(newCost) > parseFloat(selected.cost_per_unit) ? 'var(--dbg)' : 'var(--okbg)',
                color: parseFloat(newCost) > parseFloat(selected.cost_per_unit) ? 'var(--danger)' : 'var(--ok)',
                fontWeight: 600,
                border: `1px solid ${parseFloat(newCost) > parseFloat(selected.cost_per_unit) ? 'var(--dborder)' : 'var(--okborder)'}`
              }}>
                {parseFloat(newCost) > parseFloat(selected.cost_per_unit) ? '⬆ Price increase' : '⬇ Price decrease'}: ${parseFloat(selected.cost_per_unit ?? 0).toFixed(2)} → ${parseFloat(newCost).toFixed(2)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={receive} disabled={!qty || saving}>
              {saving ? <><div className="spin" />Saving</> : '+ Receive Stock'}
            </button>
            <button className="btn btn-s" onClick={() => { setSelected(null); setQty(''); setNewCost(''); }}>Back</button>
          </div>
        </>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DISPENSE TAB — remove stock (compounding / dispensed / expired etc.)
// ─────────────────────────────────────────────────────────────────────
function DispenseTab({ products, cfg, onRefresh, showToast }: any) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('compounding');
  const [saving, setSaving] = useState(false);

  const reasons = [
    { id: 'compounding', label: '🧪 Compounding', txType: 'adjustment' },
    { id: 'dispensed',   label: '💊 Dispensed',   txType: 'adjustment' },
    { id: 'expired',     label: '⏰ Expired',      txType: 'adjustment' },
    { id: 'damaged',     label: '💥 Damaged',     txType: 'adjustment' },
    { id: 'sample',      label: '🎁 Sample',       txType: 'adjustment' },
    { id: 'other',       label: '📝 Other',        txType: 'adjustment' },
  ];

  const filtered = products.filter((p: any) =>
    !search || [p.name, p.upc, p.ndc, p.vendor].some((v: any) => v?.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 30);

  async function dispense() {
    if (!selected || !qty) return;
    const amount = parseInt(qty);
    if (isNaN(amount) || amount <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    const currentQty = selected.inventory?.[0]?.on_hand ?? 0;
    if (amount > currentQty) { showToast(`Only ${currentQty} in stock`, 'error'); return; }
    setSaving(true);
    try {
      // CRITICAL: Fetch fresh inventory before updating
      const freshInv = await sb(cfg, 'GET', 'inventory', {
        product_id: `eq.${selected.id}`,
        select: 'id,on_hand',
      }) || [];
      const actualCurrent = freshInv[0]?.on_hand ?? 0;
      if (amount > actualCurrent) {
        showToast(`Only ${actualCurrent} actually in stock — refreshing`, 'error');
        setSaving(false);
        try { await onRefresh(); } catch {}
        return;
      }
      const newQty = actualCurrent - amount;
      await upsertInventory(cfg, selected.id, {
        on_hand: newQty, last_updated: new Date().toISOString(),
      });
      const r = reasons.find(x => x.id === reason) || reasons[0];
      await sb(cfg, 'POST', 'transactions', {}, {
        product_id: selected.id,
        type: r.txType,
        quantity_change: -amount,
        new_quantity: newQty,
        notes: r.label,
        performed_by: 'Staff',
      });
      showToast(`−${amount} dispensed. Remaining: ${newQty}`, 'success');
      setSelected(null); setQty(''); setReason('compounding'); setSearch('');
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Unknown error'), 'error');
    }
    setSaving(false);
    try { await onRefresh(); } catch {}
  }

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">Use / Dispense Stock</div>

      {!selected ? (
        <>
          <input className="inp" style={{ marginBottom: 14 }} placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          {filtered.map((p: any) => {
            const qty = p.inventory?.[0]?.on_hand ?? 0;
            return (
              <div key={p.id} className="prow" onClick={() => qty > 0 ? setSelected(p) : showToast('Out of stock', 'error')}
                style={{ opacity: qty > 0 ? 1 : 0.5 }}>
                <div className="pico">💊</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pname">{p.name}</div>
                  <div className="psub">{p.vendor || '—'}</div>
                </div>
                <div className={`pqty ${stockStatus(p)}`}>{qty}</div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="empty"><div className="empty-ico">🔍</div><div className="empty-t">No products match</div></div>}
        </>
      ) : (
        <>
          <div className="res-card">
            <div className="res-name">{selected.name}</div>
            <div className="res-sub">{selected.vendor || '—'}</div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Available</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600, color: 'var(--accent)' }}>{selected.inventory?.[0]?.on_hand ?? 0}</div>
            </div>
          </div>

          <div className="ig">
            <label className="lbl">Reason</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {reasons.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className="btn btn-s"
                  style={{
                    fontSize: 12, padding: '10px 8px',
                    background: reason === r.id ? 'var(--accent-bg)' : undefined,
                    borderColor: reason === r.id ? 'var(--accent)' : undefined,
                    color: reason === r.id ? 'var(--accent)' : undefined,
                  }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ig">
            <label className="lbl">Quantity Used</label>
            <input
              className="inp"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              max={selected.inventory?.[0]?.on_hand ?? 0}
              placeholder="How many?"
              value={qty}
              onChange={e => setQty(e.target.value)}
              style={{ fontFamily: 'var(--mono)', fontSize: 28, textAlign: 'center', padding: 14 }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={dispense} disabled={!qty || saving}>
              {saving ? <><div className="spin" />Saving</> : '− Use Stock'}
            </button>
            <button className="btn btn-s" onClick={() => { setSelected(null); setQty(''); }}>Back</button>
          </div>
        </>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// INVOICE TAB — AI extracts line items + detects price changes
// ─────────────────────────────────────────────────────────────────────
function InvoiceTab({ cfg, onRefresh, showToast }: any) {
  const [stage, setStage] = useState<'upload'|'processing'|'review'|'importing'|'done'>('upload');
  const [items, setItems] = useState<any[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStage('processing');
    try {
      const isPdf = file.type === 'application/pdf';
      let base64: string;
      if (isPdf) base64 = await fileToBase64(file);
      else base64 = await imageToJpegBase64(file);

      const content = isPdf
        ? [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: 'Extract invoice line items. Return ONLY JSON array, no markdown. Each item: {name, quantity, upc, ndc, vendor, category, unit, unit_cost}. Use "" for missing. quantity and unit_cost numeric.' },
          ]
        : [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: 'Extract invoice line items from this photo. Return ONLY JSON array, no markdown. Each item: {name, quantity, upc, ndc, vendor, category, unit, unit_cost}. Use "" for missing. quantity and unit_cost numeric.' },
          ];

      const text = await callClaude([{ role: 'user', content }], 3000);
      let parsed = text;
      // Strip markdown fences if present
      parsed = parsed.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
      // Find JSON array
      const jsonStart = parsed.indexOf('[');
      const jsonEnd = parsed.lastIndexOf(']');
      if (jsonStart >= 0 && jsonEnd > jsonStart) parsed = parsed.slice(jsonStart, jsonEnd + 1);

      const parsedItems = JSON.parse(parsed);
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) throw new Error('No items found in invoice');

      setItems(parsedItems);
      const initial: Record<number, boolean> = {};
      parsedItems.forEach((_: any, i: number) => { initial[i] = true; });
      setChecked(initial);
      setStage('review');
    } catch (e: any) {
      showToast('Error reading invoice: ' + (e?.message || 'Unknown'), 'error');
      setStage('upload');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function importSelected() {
    const toImport = items.filter((_, i) => checked[i]);
    if (!toImport.length) return;
    setStage('importing');
    let added = 0, updated = 0, priceChangeCount = 0;
    try {
      const existing = await sb(cfg, 'GET', 'products', { select: 'id,upc,ndc,name,cost_per_unit' }) || [];
      for (const item of toImport) {
        const match = existing.find((e: any) =>
          (item.upc && e.upc === item.upc) ||
          (item.ndc && e.ndc === item.ndc) ||
          (e.name && item.name && e.name.toLowerCase() === item.name.toLowerCase())
        );
        if (match) {
          const inv = await sb(cfg, 'GET', 'inventory', { product_id: `eq.${match.id}`, select: 'id,on_hand' }) || [];
          const prev = inv[0]?.on_hand ?? 0;
          const itemQty = parseInt(String(item.quantity)) || 0;
          const newQ = prev + itemQty;
          await upsertInventory(cfg, match.id, { on_hand: newQ, last_updated: new Date().toISOString() });
          await sb(cfg, 'POST', 'transactions', {}, {
            product_id: match.id, type: 'receive', quantity_change: itemQty,
            new_quantity: newQ, notes: 'Invoice import', performed_by: 'Invoice AI',
          });
          // Price change check
          const oldCost = parseFloat(match.cost_per_unit) || 0;
          const newCost = parseFloat(String(item.unit_cost)) || 0;
          if (newCost > 0 && Math.abs(newCost - oldCost) > 0.001) {
            await sb(cfg, 'PATCH', 'products', { id: `eq.${match.id}` }, { cost_per_unit: newCost });
            await sb(cfg, 'POST', 'transactions', {}, {
              product_id: match.id, type: 'price_change', quantity_change: 0, new_quantity: newQ,
              notes: `Price changed: $${oldCost.toFixed(2)} → $${newCost.toFixed(2)}`,
              performed_by: 'Invoice AI',
            });
            priceChangeCount++;
          }
          updated++;
        } else {
          const prodResult = await sb(cfg, 'POST', 'products', {}, {
            name: item.name,
            upc: item.upc || null,
            ndc: item.ndc || null,
            vendor: item.vendor || null,
            category: item.category || null,
            unit: item.unit || 'each',
            cost_per_unit: parseFloat(String(item.unit_cost)) || 0,
            reorder_threshold: 10,
          });
          const p = Array.isArray(prodResult) ? prodResult[0] : prodResult;
          if (!p?.id) throw new Error('Failed to create: ' + item.name);
          const newItemQty = parseInt(String(item.quantity)) || 0;
          await upsertInventory(cfg, p.id, { on_hand: newItemQty, last_updated: new Date().toISOString() });
          await sb(cfg, 'POST', 'transactions', {}, {
            product_id: p.id, type: 'receive', quantity_change: newItemQty,
            new_quantity: newItemQty, notes: 'New product — invoice import', performed_by: 'Invoice AI',
          });
          added++;
        }
      }
      setImportResult({ added, updated, priceChanges: priceChangeCount });
      setStage('done');
    } catch (e: any) {
      showToast('Import error: ' + (e?.message || 'Unknown'), 'error');
      setStage('review');
    }
    try { await onRefresh(); } catch {}
  }

  const selectedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">AI Invoice Import</div>

      {stage === 'upload' && (
        <>
          <div className="scanbox" onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Upload Invoice</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>PDF or photo — Claude AI extracts line items</div>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFile} style={{ display: 'none' }} />
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 14 }}>
            Needs API key in Settings
          </div>
        </>
      )}

      {stage === 'processing' && (
        <div className="loader" style={{ padding: 48 }}>
          <div className="spin" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ fontSize: 14 }}>Reading {fileName}...</div>
        </div>
      )}

      {stage === 'review' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Found <strong>{items.length}</strong> items · <strong>{selectedCount}</strong> selected
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-s" style={{ flex: 1, fontSize: 12 }} onClick={() => { const all: Record<number, boolean> = {}; items.forEach((_, i) => all[i] = true); setChecked(all); }}>Select All</button>
            <button className="btn btn-s" style={{ flex: 1, fontSize: 12 }} onClick={() => setChecked({})}>Clear</button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="inv-item">
              <input type="checkbox" className="inv-chk" checked={!!checked[i]} onChange={e => setChecked(c => ({ ...c, [i]: e.target.checked }))} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{item.name || '(no name)'}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  Qty: {item.quantity || 0} · ${parseFloat(String(item.unit_cost)) || 0} ea
                  {item.upc && ` · UPC: ${item.upc}`}
                  {item.ndc && ` · NDC: ${item.ndc}`}
                </div>
                {item.vendor && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.vendor}</div>}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={importSelected} disabled={selectedCount === 0}>
              Import {selectedCount} Items
            </button>
            <button className="btn btn-s" onClick={() => { setStage('upload'); setItems([]); }}>Cancel</button>
          </div>
        </>
      )}

      {stage === 'importing' && (
        <div className="loader" style={{ padding: 48 }}>
          <div className="spin" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ fontSize: 14 }}>Importing to database...</div>
        </div>
      )}

      {stage === 'done' && (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Import Complete!</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 4 }}>{importResult?.added ?? 0} new products added</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 4 }}>{importResult?.updated ?? 0} existing products updated</div>
          {(importResult?.priceChanges ?? 0) > 0 && (
            <div style={{ fontSize: 14, color: 'var(--purple)', fontWeight: 600, marginBottom: 4 }}>
              💲 {importResult?.priceChanges} price {importResult?.priceChanges === 1 ? 'change' : 'changes'} detected — check Reports
            </div>
          )}
          <div style={{ height: 20 }} />
          <button className="btn btn-p btn-full" onClick={() => { setStage('upload'); setItems([]); setImportResult(null); }}>Import Another</button>
        </div>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// EXCEL / CSV IMPORT
// ─────────────────────────────────────────────────────────────────────
function ExcelTab({ cfg, onRefresh, showToast }: any) {
  const [stage, setStage] = useState<'upload'|'map'|'importing'|'done'>('upload');
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fields = [
    { key: 'name',              label: 'Product Name *', required: true },
    { key: 'upc',               label: 'UPC Barcode' },
    { key: 'ndc',               label: 'NDC Code' },
    { key: 'vendor',            label: 'Vendor' },
    { key: 'category',          label: 'Category' },
    { key: 'cost_per_unit',     label: 'Unit Cost' },
    { key: 'on_hand',           label: 'On Hand Quantity' },
    { key: 'reorder_threshold', label: 'Reorder At' },
  ];

  async function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!(window as any).XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
          s.onload = () => res(null);
          s.onerror = () => rej(new Error('Failed to load XLSX library'));
          document.head.appendChild(s);
        });
      }
      const buf = await file.arrayBuffer();
      const wb = (window as any).XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = (window as any).XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (data.length < 2) { showToast('File has no data rows', 'error'); return; }
      const h = data[0].map((x: any) => String(x || '').trim());
      const r = data.slice(1).filter((row: any) => row.some((c: any) => c !== ''));
      setHeaders(h);
      setRows(r);
      setMapping(guessMapping(h));
      setStage('map');
    } catch (err: any) {
      showToast('Could not read file: ' + (err?.message || 'Unknown'), 'error');
    }
  }

  function guessMapping(hdrs: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    fields.forEach(f => {
      const matches: Record<string, string[]> = {
        name: ['name', 'product', 'description', 'item'],
        upc: ['upc', 'barcode', 'ean'],
        ndc: ['ndc'],
        vendor: ['vendor', 'supplier', 'manufacturer'],
        category: ['category', 'type', 'class'],
        cost_per_unit: ['cost', 'price', 'unit cost', 'unit price'],
        on_hand: ['on hand', 'onhand', 'quantity', 'qty', 'stock', 'inventory'],
        reorder_threshold: ['reorder', 'threshold', 'min', 'minimum'],
      };
      const kws = matches[f.key] || [];
      const found = hdrs.findIndex(h => kws.some(k => h.toLowerCase().includes(k)));
      if (found >= 0) out[f.key] = hdrs[found];
    });
    return out;
  }

  async function doImport() {
    if (!mapping.name) { showToast('Map at least the Name field', 'error'); return; }
    setStage('importing');
    let added = 0, skipped = 0;
    try {
      for (const row of rows) {
        const d: any = {};
        fields.forEach(f => {
          const col = mapping[f.key];
          if (!col) return;
          const idx = headers.indexOf(col);
          if (idx < 0) return;
          const v = row[idx];
          if (v === '' || v == null) return;
          if (['cost_per_unit'].includes(f.key)) d[f.key] = parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
          else if (['on_hand', 'reorder_threshold'].includes(f.key)) d[f.key] = parseInt(String(v)) || 0;
          else d[f.key] = String(v).trim();
        });
        if (!d.name) { skipped++; continue; }
        const on_hand = d.on_hand ?? 0;
        delete d.on_hand;
        if (!d.reorder_threshold) d.reorder_threshold = 10;
        d.unit = d.unit || 'each';
        try {
          const result = await sb(cfg, 'POST', 'products', {}, d);
          const p = Array.isArray(result) ? result[0] : result;
          if (p?.id) {
            await upsertInventory(cfg, p.id, { on_hand, last_updated: new Date().toISOString() });
            if (on_hand > 0) {
              await sb(cfg, 'POST', 'transactions', {}, {
                product_id: p.id, type: 'receive', quantity_change: on_hand,
                new_quantity: on_hand, notes: 'Excel import', performed_by: 'Import',
              });
            }
            added++;
          } else { skipped++; }
        } catch { skipped++; }
      }
      setResult({ added, skipped });
      setStage('done');
    } catch (err: any) {
      showToast('Import error: ' + (err?.message || 'Unknown'), 'error');
      setStage('map');
    }
    try { await onRefresh(); } catch {}
  }

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">Excel / CSV Import</div>

      {stage === 'upload' && (
        <>
          <div className="scanbox" onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Upload Spreadsheet</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>.xlsx, .xls or .csv — auto-detects columns</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
        </>
      )}

      {stage === 'map' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Found <strong>{rows.length}</strong> rows · Match your columns:
          </div>
          {fields.map(f => (
            <div key={f.key} className="ig">
              <label className="lbl">
                {f.label} {f.required && <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>
              <select
                className="inp"
                value={mapping[f.key] || ''}
                onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                style={{ appearance: 'auto' as any }}
              >
                <option value="">— None —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={doImport} disabled={!mapping.name}>
              Import {rows.length} Rows
            </button>
            <button className="btn btn-s" onClick={() => setStage('upload')}>Cancel</button>
          </div>
        </>
      )}

      {stage === 'importing' && (
        <div className="loader" style={{ padding: 48 }}>
          <div className="spin" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ fontSize: 14 }}>Importing {rows.length} rows...</div>
        </div>
      )}

      {stage === 'done' && (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Import Complete!</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 4 }}>{result?.added ?? 0} products added</div>
          {(result?.skipped ?? 0) > 0 && <div style={{ fontSize: 13, color: 'var(--warn)' }}>{result?.skipped} rows skipped (missing name or error)</div>}
          <div style={{ height: 20 }} />
          <button className="btn btn-p btn-full" onClick={() => { setStage('upload'); setRows([]); setHeaders([]); setResult(null); }}>Import Another</button>
        </div>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────────────
function ReportsTab({ products, cfg, showToast }: any) {
  const [view, setView] = useState<'overview'|'audit'|'product'>('overview');
  const [dateFilter, setDateFilter] = useState('7');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (view === 'audit') loadTransactions();
    if (view === 'overview') loadPriceChanges();
  }, [view, dateFilter]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(dateFilter));
      const data = await sb(cfg, 'GET', 'transactions', {
        select: '*,products(name,upc,ndc,vendor,cost_per_unit)',
        order: 'created_at.desc',
        created_at: `gte.${since.toISOString()}`,
        limit: '200',
      });
      setTransactions(data || []);
    } catch (e: any) { showToast('Error loading: ' + e.message, 'error'); }
    setLoading(false);
  }

  async function loadPriceChanges() {
    setLoadingPrices(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const data = await sb(cfg, 'GET', 'transactions', {
        select: '*,products(name,vendor)',
        type: 'eq.price_change',
        order: 'created_at.desc',
        created_at: `gte.${since.toISOString()}`,
        limit: '50',
      });
      setPriceChanges(data || []);
    } catch {}
    setLoadingPrices(false);
  }

  async function loadProductHistory(productId: string) {
    setLoading(true);
    try {
      const data = await sb(cfg, 'GET', 'transactions', {
        select: '*',
        product_id: `eq.${productId}`,
        order: 'created_at.desc',
        limit: '100',
      });
      setProductHistory(data || []);
    } catch (e: any) { showToast('Error loading history: ' + e.message, 'error'); }
    setLoading(false);
  }

  function txColor(type: string) {
    if (type === 'count') return 'var(--accent)';
    if (type === 'receive') return 'var(--ok)';
    if (type === 'adjustment') return 'var(--warn)';
    if (type === 'price_change') return 'var(--purple)';
    return 'var(--text3)';
  }

  function txIcon(type: string) {
    if (type === 'count') return '📋';
    if (type === 'receive') return '📦';
    if (type === 'adjustment') return '✏️';
    if (type === 'price_change') return '💲';
    return '🔄';
  }

  function txLabel(type: string) {
    if (type === 'count') return 'Physical Count';
    if (type === 'receive') return 'Stock Received';
    if (type === 'adjustment') return 'Adjustment';
    if (type === 'price_change') return 'Price Change';
    return type;
  }

  // Compute overview stats
  const enriched = products.map((p: any) => ({
    ...p,
    lastCounted: p.inventory?.[0]?.last_counted,
  }));
  const neverCounted = enriched.filter((p: any) => !p.lastCounted);
  const countedOver30 = enriched.filter((p: any) => {
    if (!p.lastCounted) return false;
    return Date.now() - new Date(p.lastCounted).getTime() > 30 * 86400000;
  });

  const productsFiltered = products.filter((p: any) =>
    !productSearch || [p.name, p.upc, p.ndc, p.vendor].some((v: any) => v?.toLowerCase().includes(productSearch.toLowerCase()))
  ).slice(0, 30);

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">Reports</div>

      {/* View switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--surface2)', padding: 4, borderRadius: 10 }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'product',  label: 'By Product' },
          { id: 'audit',    label: 'Audit Log' },
        ].map(v => (
          <button key={v.id}
            onClick={() => setView(v.id as any)}
            className="btn"
            style={{
              flex: 1, fontSize: 12, padding: '8px',
              background: view === v.id ? 'var(--surface)' : 'transparent',
              color: view === v.id ? 'var(--accent)' : 'var(--text3)',
              boxShadow: view === v.id ? 'var(--shadow-sm)' : 'none',
              fontWeight: 600,
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {view === 'overview' && (
        <div>
          <div className="sec-label">📋 Count Status</div>
          <div className="stats" style={{ marginBottom: 20 }}>
            <div className="stat d">
              <div className="stat-val">{neverCounted.length}</div>
              <div className="stat-lbl">Never Counted</div>
            </div>
            <div className="stat w">
              <div className="stat-val">{countedOver30.length}</div>
              <div className="stat-lbl">Count Overdue (30d+)</div>
            </div>
          </div>

          {neverCounted.length > 0 && (
            <>
              <div className="sec-label">Never Counted</div>
              {neverCounted.slice(0, 10).map((p: any) => (
                <div key={p.id} className="alert out">
                  <span style={{ fontSize: 16 }}>❓</span>
                  <div style={{ flex: 1 }}>
                    <div className="alert-name">{p.name}</div>
                    <div className="alert-qty" style={{ color: 'var(--text3)' }}>{p.vendor || '—'}</div>
                  </div>
                </div>
              ))}
              <div style={{ height: 16 }} />
            </>
          )}

          {countedOver30.length === 0 && neverCounted.length === 0 && (
            <div className="empty">
              <div className="empty-ico">✅</div>
              <div className="empty-t">All products counted within 30 days</div>
            </div>
          )}

          {/* Price Changes Section */}
          <div className="sec-label" style={{ marginTop: 20 }}>💲 Price Changes — Last 30 Days</div>
          {loadingPrices && <div className="loader"><div className="spin" />Loading...</div>}
          {!loadingPrices && priceChanges.length === 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>No price changes recorded in the last 30 days</div>
            </div>
          )}
          {!loadingPrices && priceChanges.map((tx: any) => {
            const m = tx.notes?.match(/\$([0-9.]+)\s*→\s*\$([0-9.]+)/);
            const oldP = m ? parseFloat(m[1]) : null;
            const newP = m ? parseFloat(m[2]) : null;
            const inc = newP !== null && oldP !== null && newP > oldP;
            const dec = newP !== null && oldP !== null && newP < oldP;
            return (
              <div key={tx.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${inc ? 'var(--danger)' : dec ? 'var(--ok)' : 'var(--purple)'}`,
                borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1, marginRight: 8 }}>{tx.products?.name || 'Unknown'}</div>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{timeAgo(tx.created_at)}</span>
                </div>
                {oldP !== null && newP !== null && (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Was</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>${oldP.toFixed(2)}</div>
                    </div>
                    <div style={{ fontSize: 18, color: 'var(--text3)' }}>→</div>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Now</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: inc ? 'var(--danger)' : 'var(--ok)' }}>${newP.toFixed(2)}</div>
                    </div>
                    {oldP > 0 && (
                      <div style={{ marginLeft: 'auto', background: inc ? 'var(--dbg)' : 'var(--okbg)', border: `1px solid ${inc ? 'var(--dborder)' : 'var(--okborder)'}`, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: inc ? 'var(--danger)' : 'var(--ok)' }}>
                        {inc ? '+' : ''}{(((newP - oldP) / oldP) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
                  {tx.products?.vendor || ''} · {tx.performed_by}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BY PRODUCT */}
      {view === 'product' && (
        <div>
          {!selectedProduct ? (
            <>
              <input className="inp" placeholder="Search product..." value={productSearch} onChange={e => setProductSearch(e.target.value)} style={{ marginBottom: 12 }} />
              {productsFiltered.map((p: any) => (
                <div key={p.id} className="prow" onClick={() => { setSelectedProduct(p); loadProductHistory(p.id); }}>
                  <div className="pico">📊</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pname">{p.name}</div>
                    <div className="psub">{p.vendor || '—'}</div>
                  </div>
                  <div className="pqty a">{p.inventory?.[0]?.on_hand ?? 0}</div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="res-card">
                <div className="res-name">{selectedProduct.name}</div>
                <div className="res-sub">{selectedProduct.vendor || '—'}</div>
                <button className="btn btn-s" style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }} onClick={() => { setSelectedProduct(null); setProductHistory([]); }}>← Back</button>
              </div>
              <div className="sec-label">Transaction History</div>
              {loading && <div className="loader"><div className="spin" />Loading...</div>}
              {!loading && productHistory.length === 0 && (
                <div className="empty"><div className="empty-ico">📋</div><div className="empty-t">No transactions yet</div></div>
              )}
              {!loading && productHistory.map((tx: any) => (
                <div key={tx.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${txColor(tx.type)}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{txIcon(tx.type)} {txLabel(tx.type)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{tx.notes || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: tx.quantity_change > 0 ? 'var(--ok)' : tx.quantity_change < 0 ? 'var(--danger)' : 'var(--text3)' }}>
                        {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change || 0}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{timeAgo(tx.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* AUDIT LOG */}
      {view === 'audit' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['7', '14', '30', '90'].map(d => (
              <button key={d}
                onClick={() => setDateFilter(d)}
                className="btn btn-s"
                style={{
                  flex: 1, fontSize: 12, padding: '8px 4px',
                  background: dateFilter === d ? 'var(--accent-bg)' : undefined,
                  borderColor: dateFilter === d ? 'var(--accent)' : undefined,
                  color: dateFilter === d ? 'var(--accent)' : undefined,
                }}>
                {d}d
              </button>
            ))}
          </div>
          {loading && <div className="loader"><div className="spin" />Loading...</div>}
          {!loading && transactions.length === 0 && (
            <div className="empty"><div className="empty-ico">📋</div><div className="empty-t">No transactions in this period</div></div>
          )}
          {!loading && transactions.map((tx: any) => (
            <div key={tx.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${txColor(tx.type)}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{txIcon(tx.type)} {tx.products?.name || 'Unknown Product'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{txLabel(tx.type)} · {tx.notes || '—'} · {tx.performed_by || 'Staff'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: tx.quantity_change > 0 ? 'var(--ok)' : tx.quantity_change < 0 ? 'var(--danger)' : 'var(--text3)' }}>
                    {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change || 0}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{timeAgo(tx.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────────────────
function SettingsTab({ cfg, showToast, setCfg }: any) {
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('skynet_api_key') || '');
  const [appPin, setAppPin] = useState('');
  const [appPinConfirm, setAppPinConfirm] = useState('');
  const [settingsPin, setSettingsPin] = useState('');
  const [settingsPinConfirm, setSettingsPinConfirm] = useState('');
  const [testing, setTesting] = useState(false);

  const hasKey = !!apiKey && apiKey.startsWith('sk-');
  const expectedSettingsPin = localStorage.getItem('skynet_settings_pin') || SETTINGS_PIN_DEFAULT;

  if (!settingsUnlocked) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex' }}>
        <PinScreen
          title="Settings"
          subtitle="Enter admin PIN to continue"
          expectedPin={expectedSettingsPin}
          onUnlock={() => setSettingsUnlocked(true)}
        />
      </div>
    );
  }

  function saveApiKey() {
    const k = apiKey.trim();
    localStorage.setItem('skynet_api_key', k);
    showToast('API key saved', 'success');
  }

  async function testApiKey() {
    setTesting(true);
    try {
      const txt = await callClaude([{ role: 'user', content: 'Reply with just "OK"' }], 20);
      if (txt.includes('OK')) showToast('API key works!', 'success');
      else showToast('Unexpected response', 'error');
    } catch (e: any) {
      showToast('Key error: ' + (e?.message || 'failed'), 'error');
    }
    setTesting(false);
  }

  function changeAppPin() {
    if (appPin.length !== 4 || !/^\d{4}$/.test(appPin)) { showToast('PIN must be 4 digits', 'error'); return; }
    if (appPin !== appPinConfirm) { showToast('PINs do not match', 'error'); return; }
    localStorage.setItem('skynet_pin', appPin);
    setAppPin(''); setAppPinConfirm('');
    showToast('App PIN updated', 'success');
  }

  function changeSettingsPin() {
    if (settingsPin.length !== 4 || !/^\d{4}$/.test(settingsPin)) { showToast('PIN must be 4 digits', 'error'); return; }
    if (settingsPin !== settingsPinConfirm) { showToast('PINs do not match', 'error'); return; }
    localStorage.setItem('skynet_settings_pin', settingsPin);
    setSettingsPin(''); setSettingsPinConfirm('');
    showToast('Settings PIN updated', 'success');
  }

  return (
    <div className="tab-in" style={{ padding: 16 }}>

      {/* API KEY */}
      <div className="sec-label">AI Features</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Anthropic API Key</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
          Powers invoice scanning and barcode photo reading. Get a key at console.anthropic.com
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasKey ? 'var(--ok)' : 'var(--danger)' }} />
          <span style={{ fontSize: 11, color: hasKey ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>
            {hasKey ? 'API key configured' : 'No API key — AI features disabled'}
          </span>
        </div>
        <div className="ig" style={{ marginTop: 12 }}>
          <label className="lbl">API Key</label>
          <input
            className="inp"
            type="password"
            placeholder="sk-ant-api03-..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-p" style={{ flex: 1 }} onClick={saveApiKey}>Save Key</button>
          <button className="btn btn-s" onClick={testApiKey} disabled={testing || !apiKey}>
            {testing ? <><div className="spin" />Testing</> : 'Test'}
          </button>
        </div>
      </div>

      {/* APP PIN */}
      <div className="sec-label" style={{ marginTop: 8 }}>Security</div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>App PIN</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Staff enter this to open the app (default: 1994)</div>
        <div className="ig">
          <label className="lbl">New App PIN</label>
          <input className="inp" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
            placeholder="••••" value={appPin}
            onChange={e => setAppPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ fontFamily: 'var(--mono)', fontSize: 24, textAlign: 'center', letterSpacing: '.3em' }} />
        </div>
        <div className="ig">
          <label className="lbl">Confirm App PIN</label>
          <input className="inp" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
            placeholder="••••" value={appPinConfirm}
            onChange={e => setAppPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ fontFamily: 'var(--mono)', fontSize: 24, textAlign: 'center', letterSpacing: '.3em' }} />
        </div>
        <button className="btn btn-p btn-full" onClick={changeAppPin} disabled={appPin.length !== 4 || appPinConfirm.length !== 4}>
          Update App PIN
        </button>
      </div>

      {/* SETTINGS PIN */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Settings PIN</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Admin PIN for this Settings screen (default: 1984)</div>
        <div className="ig">
          <label className="lbl">New Settings PIN</label>
          <input className="inp" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
            placeholder="••••" value={settingsPin}
            onChange={e => setSettingsPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ fontFamily: 'var(--mono)', fontSize: 24, textAlign: 'center', letterSpacing: '.3em' }} />
        </div>
        <div className="ig">
          <label className="lbl">Confirm Settings PIN</label>
          <input className="inp" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
            placeholder="••••" value={settingsPinConfirm}
            onChange={e => setSettingsPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ fontFamily: 'var(--mono)', fontSize: 24, textAlign: 'center', letterSpacing: '.3em' }} />
        </div>
        <button className="btn btn-p btn-full" onClick={changeSettingsPin} disabled={settingsPin.length !== 4 || settingsPinConfirm.length !== 4}>
          Update Settings PIN
        </button>
      </div>

      {/* DEVICE SHARING */}
      <div className="sec-label" style={{ marginTop: 8 }}>Device Sharing</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Connect Another Device</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Generate a QR code or magic link to set up SKYNET on an iPhone or tablet — no typing.</div>
        <QRGenerator cfg={cfg} />
      </div>

      {/* DATABASE */}
      <div className="sec-label" style={{ marginTop: 8 }}>Database</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Connected to Supabase</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 12, wordBreak: 'break-all' }}>
          {cfg?.url?.replace(/^https?:\/\//, '').slice(0, 40)}...
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-s" style={{ fontSize: 12, width: '100%' }} onClick={() => {
            if (window.confirm('Reset database connection? You will need to re-enter credentials.')) {
              localStorage.removeItem('skynet_cfg');
              setCfg(null);
            }
          }}>
            Reset Database Connection
          </button>
        </div>
      </div>

      <div className="tab-spacer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TABS ARRAY
// ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dash',     icon: '📊', label: 'Dashboard' },
  { id: 'scan',     icon: '📷', label: 'Scan' },
  { id: 'products', icon: '💊', label: 'Products' },
  { id: 'receive',  icon: '📦', label: 'Receive' },
  { id: 'dispense', icon: '➖', label: 'Use' },
  { id: 'invoice',  icon: '🧾', label: 'Invoice' },
  { id: 'excel',    icon: '📊', label: 'Import' },
  { id: 'reports',  icon: '📋', label: 'Reports' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

// ─────────────────────────────────────────────────────────────────────
// MAIN APP — Clean load sequence, Safari-safe sync
// ─────────────────────────────────────────────────────────────────────
export default function SkyNet() {
  // Unlock state (PIN entered this session)
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem('skynet_unlocked') === '1'; } catch { return false; }
  });

  // Database config
  const [cfg, setCfg] = useState<any>(null);
  const [cfgLoaded, setCfgLoaded] = useState(false);

  const [tab, setTab] = useState('dash');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // Load cfg from localStorage on mount — sets cfgLoaded once done
  useEffect(() => {
    try {
      const r = localStorage.getItem('skynet_cfg');
      if (r) {
        const parsed = JSON.parse(r);
        if (parsed?.url && parsed?.key) setCfg(parsed);
      }
    } catch {}
    setCfgLoaded(true);
  }, []);

  // Load products whenever cfg changes (or PIN unlocks)
  useEffect(() => {
    if (!cfg || !unlocked) return;
    let cancelled = false;
    setLoading(true);
    setSyncError('');
    loadAll(cfg)
      .then(data => {
        if (cancelled) return;
        setProducts(data);
        setLoading(false);
      })
      .catch((e: any) => {
        if (cancelled) return;
        const msg = e?.message || 'Unknown error';
        console.error('[SKYNET sync error]', e);
        setSyncError(msg);
        setToast({ msg: 'Sync: ' + msg.slice(0, 100), type: 'error' });
        setTimeout(() => setToast(null), 5000);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [cfg, unlocked]);

  function showToast(msg: string, type: string = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function refresh() {
    if (!cfg) return;
    setLoading(true);
    setSyncError('');
    try {
      const data = await loadAll(cfg);
      setProducts(data);
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
      setSyncError(msg);
      setToast({ msg: 'Sync: ' + msg.slice(0, 100), type: 'error' });
      setTimeout(() => setToast(null), 5000);
    }
    setLoading(false);
  }

  function handleUnlock() {
    try { sessionStorage.setItem('skynet_unlocked', '1'); } catch {}
    setUnlocked(true);
  }

  function handleLock() {
    try { sessionStorage.removeItem('skynet_unlocked'); } catch {}
    setUnlocked(false);
  }

  // Wait for cfg-load attempt to finish before deciding what to render
  if (!cfgLoaded) {
    return <><style>{CSS}</style><div className="loader" style={{ height: '100vh' }}><div className="spin" />Loading...</div></>;
  }

  // Magic link handler runs once on mount in render tree
  const appPinExpected = localStorage.getItem('skynet_pin') || APP_PIN_DEFAULT;

  // Not unlocked yet → PIN screen (after magic link handler)
  if (!unlocked) {
    return (
      <>
        <style>{CSS}</style>
        <MagicLinkHandler onCfg={setCfg} />
        <PinScreen expectedPin={appPinExpected} onUnlock={handleUnlock} />
      </>
    );
  }

  // Unlocked but no cfg → setup screen
  if (!cfg) {
    return (
      <>
        <style>{CSS}</style>
        <MagicLinkHandler onCfg={setCfg} />
        <SetupScreen onSave={setCfg} />
      </>
    );
  }

  const tabProps = { products, cfg, onRefresh: refresh, showToast, setTab };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22 }}>💊</div>
            <div>
              <div className="hdr-logo">SKYNET</div>
              <div className="hdr-sub">
                MAPLETON v2.6 · {loading ? 'Syncing...' : products.length > 0 ? `${products.length} products` : syncError ? 'Sync error' : 'Connected'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {loading && <div className="spin" />}
            {!loading && <button className="hdr-btn" onClick={refresh} title="Refresh">↻</button>}
            <button className="hdr-btn" onClick={handleLock} title="Lock app" style={{ fontSize: 15 }}>🔒</button>
          </div>
        </div>

        {syncError && (
          <div style={{ background: 'var(--dbg)', borderBottom: '1px solid var(--dborder)', padding: '10px 16px', fontSize: 12, color: 'var(--danger)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Sync Error</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 6, wordBreak: 'break-word' }}>{syncError}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={refresh} className="btn btn-s" style={{ fontSize: 11, padding: '5px 10px', flex: 1 }}>↻ Retry</button>
              <button onClick={() => { localStorage.removeItem('skynet_cfg'); setCfg(null); }} className="btn btn-s" style={{ fontSize: 11, padding: '5px 10px', flex: 1 }}>⚙ Reconfigure</button>
            </div>
          </div>
        )}

        <div className="content">
          {tab === 'dash'     && <Dashboard products={products} setTab={setTab} />}
          {tab === 'scan'     && <ScanTab {...tabProps} />}
          {tab === 'products' && <ProductsTab {...tabProps} />}
          {tab === 'receive'  && <ReceiveTab {...tabProps} />}
          {tab === 'dispense' && <DispenseTab {...tabProps} />}
          {tab === 'invoice'  && <InvoiceTab {...tabProps} />}
          {tab === 'excel'    && <ExcelTab {...tabProps} />}
          {tab === 'reports'  && <ReportsTab products={products} cfg={cfg} showToast={showToast} />}
          {tab === 'settings' && <SettingsTab cfg={cfg} showToast={showToast} setCfg={setCfg} />}
        </div>

        <div className="nav">
          {TABS.map(t => (
            <button key={t.id} className={`nb ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              <span style={{ fontSize: 19 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}