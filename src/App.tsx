import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F5F7;--s1:#FFFFFF;--s2:#F0F3F7;--border:#D8DCE8;
  --accent:#29ABE2;--a2:#1565C0;--abg:rgba(41,171,226,.1);--aborder:rgba(41,171,226,.35);
  --warn:#FF9500;--wbg:rgba(255,149,0,.1);--wborder:rgba(255,149,0,.35);
  --danger:#FF3B30;--dbg:rgba(255,59,48,.08);--dborder:rgba(255,59,48,.3);
  --ok:#34C759;--okbg:rgba(52,199,89,.1);--okborder:rgba(52,199,89,.3);
  --text:#1D1D1F;--muted:#86868B;--subtle:#C7C7CC;
  --font:'Plus Jakarta Sans',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;
  --r:12px;--shadow:0 2px 12px rgba(0,0,0,.08),0 1px 3px rgba(0,0,0,.06);
}
html,body{height:100%;overflow:hidden}
body{font-family:var(--font);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
.app{max-width:480px;margin:0 auto;height:100vh;display:flex;flex-direction:column;overflow:hidden}

/* HEADER */
.hdr{padding:12px 18px 11px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.85);backdrop-filter:blur(12px);flex-shrink:0}
.hdr-logo{font-size:15px;font-weight:700;color:var(--text);letter-spacing:-.01em}
.hdr-sub{font-size:10px;color:var(--muted);margin-top:1px;letter-spacing:.01em}
.hdr-sync{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}

/* NAV */
.nav{display:flex;border-top:1px solid var(--border);background:rgba(255,255,255,.92);backdrop-filter:blur(12px);flex-shrink:0;padding-bottom:env(safe-area-inset-bottom)}
.nb{flex:1;padding:9px 4px 10px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border:none;background:none;color:var(--muted);font-size:9.5px;font-family:var(--font);font-weight:500;transition:color .15s;letter-spacing:.01em}
.nb.on{color:var(--accent)}
.nb-dot{width:4px;height:4px;border-radius:50%;background:var(--accent);opacity:0;transition:opacity .15s;margin-top:1px}
.nb.on .nb-dot{opacity:1}

/* SCROLL CONTENT */
.content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}

/* CARDS & SECTIONS */
.section{padding:16px 16px 0}
.section+.section{padding-top:18px}
.sec-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.card{background:var(--s1);border-radius:var(--r);box-shadow:var(--shadow);padding:16px}

/* STATS */
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stat{background:var(--s1);border-radius:var(--r);box-shadow:var(--shadow);padding:14px 16px}
.stat-val{font-family:var(--mono);font-size:28px;font-weight:600;line-height:1}
.stat-lbl{font-size:11px;color:var(--muted);margin-top:4px;font-weight:500}
.stat.a .stat-val{color:var(--accent)}
.stat.w .stat-val{color:var(--warn)}
.stat.d .stat-val{color:var(--danger)}

/* ALERTS */
.alert{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:10px;margin-bottom:8px;border:1px solid var(--wborder);background:var(--s1);box-shadow:var(--shadow)}
.alert.out{border-color:var(--dborder)}
.alert-name{font-size:13px;font-weight:600}
.alert-qty{font-size:11px;color:var(--warn);margin-top:2px;font-family:var(--mono)}
.alert.out .alert-qty{color:var(--danger)}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px 18px;border-radius:980px;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .15s;-webkit-tap-highlight-color:transparent}
.btn-p{background:var(--accent);color:#fff;letter-spacing:-.01em}
.btn-p:active{transform:scale(.97);filter:brightness(.93)}
.btn-s{background:var(--s2);color:var(--text);border:1px solid var(--border)}
.btn-s:hover{border-color:var(--accent);color:var(--accent)}
.btn-full{width:100%;padding:13px;border-radius:var(--r)}
.btn:disabled{opacity:.4;cursor:not-allowed}

/* INPUTS */
.ig{margin-bottom:14px}
.lbl{display:block;font-size:11px;font-weight:600;color:var(--muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em}
.inp{width:100%;background:var(--s1);border:1.5px solid var(--border);color:var(--text);border-radius:10px;padding:10px 13px;font-family:var(--font);font-size:14px;outline:none;transition:border-color .15s;-webkit-appearance:none;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(41,171,226,.15)}
.inp::placeholder{color:var(--subtle)}

/* PRODUCT LIST */
.prow{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;background:var(--s1)}
.prow:first-child{border-top-left-radius:var(--r);border-top-right-radius:var(--r)}
.prow:last-child{border-bottom:none;border-bottom-left-radius:var(--r);border-bottom-right-radius:var(--r)}
.prow:active{background:var(--s2)}
.pico{width:36px;height:36px;background:var(--abg);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px}
.pname{font-weight:600;font-size:14px;line-height:1.3;letter-spacing:-.01em}
.psub{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:3px}
.pqty{font-family:var(--mono);font-size:22px;font-weight:600;flex-shrink:0}
.pqty.a{color:var(--accent)}
.pqty.w{color:var(--warn)}
.pqty.d{color:var(--danger)}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.04em}
.badge-w{background:var(--wbg);color:var(--warn)}
.badge-d{background:var(--dbg);color:var(--danger)}
.badge-a{background:var(--abg);color:var(--accent)}

/* SCAN */
.scanbox{background:var(--s1);border:2px dashed var(--border);border-radius:16px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;box-shadow:var(--shadow)}
.scanbox:hover{border-color:var(--accent);background:var(--abg)}
.cam{width:100%;aspect-ratio:4/3;background:#000;border-radius:12px;overflow:hidden;position:relative}
.cam video{width:100%;height:100%;object-fit:cover}
.scanline{position:absolute;left:10%;right:10%;height:2px;background:var(--accent);box-shadow:0 0 10px var(--accent);animation:sl 2s ease-in-out infinite}
@keyframes sl{0%,100%{top:12%}50%{top:84%}}
.res-card{background:var(--abg);border:1.5px solid var(--aborder);border-radius:var(--r);padding:16px;margin-bottom:14px}
.res-name{font-weight:700;font-size:16px;letter-spacing:-.01em}
.res-sub{font-family:var(--mono);font-size:11px;color:var(--accent);margin-top:4px}
.res-card.bad{background:var(--dbg);border-color:var(--dborder)}
.res-card.bad .res-sub{color:var(--danger)}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:flex-end;animation:fo .2s}
@keyframes fo{from{opacity:0}to{opacity:1}}
.modal{background:var(--s1);border-radius:20px 20px 0 0;padding:24px;width:100%;max-height:88vh;overflow-y:auto;animation:su .22s ease;box-shadow:0 -8px 40px rgba(0,0,0,.15)}
@keyframes su{from{transform:translateY(40px)}to{transform:translateY(0)}}
.handle{width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 20px}
.mtitle{font-size:19px;font-weight:700;margin-bottom:18px;letter-spacing:-.02em}

/* TOAST */
.toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);padding:11px 20px;border-radius:40px;font-size:13px;font-weight:600;z-index:99;white-space:nowrap;animation:tf .2s ease;box-shadow:0 4px 20px rgba(0,0,0,.15)}
@keyframes tf{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.toast.success{background:var(--text);color:#fff}
.toast.error{background:var(--danger);color:#fff}

/* SPINNER */
.spin{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:sp .7s linear infinite;flex-shrink:0}
@keyframes sp{to{transform:rotate(360deg)}}
.loader{display:flex;align-items:center;justify-content:center;gap:8px;padding:32px;color:var(--muted);font-size:13px}

/* EMPTY */
.empty{text-align:center;padding:48px 24px;color:var(--muted)}
.empty-ico{font-size:42px;margin-bottom:12px}
.empty-t{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;letter-spacing:-.01em}

/* SETUP */
.setup{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:36px 24px;background:var(--bg);overflow-y:auto}
.setup-logo{font-size:24px;font-weight:700;color:var(--text);letter-spacing:-.02em}
.setup-sub{color:var(--muted);font-size:13px;margin-bottom:28px}
.step-card{background:var(--s1);border-radius:var(--r);box-shadow:var(--shadow);padding:14px 16px;margin-bottom:10px}
.step-n{font-size:10px;font-weight:700;color:var(--accent);margin-bottom:4px;letter-spacing:.08em;text-transform:uppercase}
.step-t{font-size:13px;line-height:1.65;color:var(--text)}
.sql{background:var(--text);color:#A8FF60;border-radius:10px;padding:13px;font-family:var(--mono);font-size:10.5px;line-height:1.7;white-space:pre-wrap;overflow-x:auto;max-height:190px;overflow-y:auto}
.copy-btn{padding:6px 14px;font-size:12px;font-family:var(--font);font-weight:600;border-radius:20px;cursor:pointer;background:var(--s2);border:1.5px solid var(--border);color:var(--text);margin-top:8px;transition:all .15s}
.copy-btn:hover{border-color:var(--accent);color:var(--accent)}

/* INVOICE */
.inv-item{display:flex;gap:10px;align-items:flex-start;padding:12px;background:var(--s1);border-radius:10px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.inv-chk{accent-color:var(--accent);width:18px;height:18px;margin-top:2px;flex-shrink:0;cursor:pointer}

/* SEARCH BAR */
.sbar{padding:10px 16px;position:sticky;top:0;background:rgba(245,245,247,.92);backdrop-filter:blur(8px);z-index:5;border-bottom:1px solid var(--border)}

/* DIVIDER */
.div{height:1px;background:var(--border);margin:14px 0}

.tab-in{animation:ti .18s ease}
@keyframes ti{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}

/* 90s EASTER EGG — hidden marquee in footer */
.marquee-wrap{overflow:hidden;padding:3px 0;background:var(--abg);border-top:1px solid var(--aborder)}
.marquee{display:inline-block;white-space:nowrap;animation:mq 28s linear infinite;font-size:10px;color:var(--accent);font-family:var(--mono);letter-spacing:.05em}
@keyframes mq{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}
`;

// ─────────────────────────────────────────────
// SUPABASE HELPERS
// ─────────────────────────────────────────────
async function sb(cfg, method, table, params = {}, body = null) {
  const q = new URLSearchParams(params).toString();
  const url = `${cfg.url}/rest/v1/${table}${q ? '?' + q : ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function loadAll(cfg) {
  const data = await sb(cfg, 'GET', 'products', {
    select: '*,inventory(*)',
    order: 'name.asc',
  });
  return data || [];
}

function stockStatus(p) {
  const qty = p.inventory?.[0]?.on_hand ?? 0;
  const thr = p.reorder_threshold ?? 10;
  if (qty === 0) return 'd';
  if (qty <= thr) return 'w';
  return 'a';
}

// ─────────────────────────────────────────────
// SQL SCHEMA
// ─────────────────────────────────────────────
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
  product_id UUID REFERENCES products(id)
    ON DELETE CASCADE UNIQUE,
  on_hand INT DEFAULT 0,
  last_counted TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  product_id UUID REFERENCES products(id),
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

// ─────────────────────────────────────────────
// PIN LOCK SCREEN
// ─────────────────────────────────────────────
const DEFAULT_PIN = '1994';

function PinScreen({ onUnlock }) {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const savedPin = (() => {
    try {
      return localStorage.getItem('skynet_pin') || DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  })();

  function press(val) {
    if (entered.length >= 4) return;
    const next = entered + val;
    setEntered(next);
    setError(false);
    if (next.length === 4) {
      if (next === savedPin) {
        setTimeout(() => onUnlock(), 200);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => {
          setEntered('');
          setShake(false);
        }, 800);
      }
    }
  }

  function del() {
    setEntered((e) => e.slice(0, -1));
    setError(false);
  }

  const dots = [0, 1, 2, 3].map((i) => (
    <div
      key={i}
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background:
          i < entered.length
            ? error
              ? 'var(--danger)'
              : 'var(--accent)'
            : 'var(--border)',
        transition: 'background .15s',
        boxShadow:
          i < entered.length && !error ? '0 0 8px rgba(41,171,226,.4)' : 'none',
      }}
    />
  ));

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <div
          style={{
            fontFamily: 'var(--font)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-.02em',
          }}
        >
          SKYNET
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginTop: 4,
            letterSpacing: '.04em',
          }}
        >
          MAPLETON PHARMACY · Enter PIN
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 40,
          animation: shake ? 'pinshake .4s ease' : 'none',
        }}
      >
        {dots}
      </div>

      {error && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--danger)',
            marginBottom: 20,
            marginTop: -30,
          }}
        >
          Incorrect PIN — try again
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          width: 240,
        }}
      >
        {keys.map((k, i) => (
          <button
            key={i}
            onClick={() => (k === '⌫' ? del() : k ? press(k) : null)}
            style={{
              height: 64,
              borderRadius: 16,
              border: '1.5px solid var(--border)',
              background: k === '' ? 'transparent' : 'var(--s1)',
              color: k === '⌫' ? 'var(--muted)' : 'var(--text)',
              fontSize: k === '⌫' ? 20 : 22,
              fontWeight: 600,
              cursor: k === '' ? 'default' : 'pointer',
              boxShadow: k === '' ? 'none' : 'var(--shadow)',
              transition: 'all .1s',
              fontFamily: 'var(--mono)',
              border: k === '' ? 'none' : '1.5px solid var(--border)',
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <style>{`@keyframes pinshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETUP SCREEN
// ─────────────────────────────────────────────
function SetupScreen({ onSave }) {
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
    });
  }

  async function connect() {
    if (!url || !key) return;
    setConnecting(true);
    setErr('');
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      const cleanKey = key.trim();
      const cfg = { url: cleanUrl, key: cleanKey };
      const testUrl = `${cleanUrl}/rest/v1/products?limit=1`;
      const res = await fetch(testUrl, {
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.text();
        setErr(`HTTP ${res.status}: ${body.slice(0, 200)}`);
        setConnecting(false);
        return;
      }
      try {
        await window.storage.set('skynet_cfg', JSON.stringify(cfg));
      } catch {}
      onSave(cfg);
    } catch (e) {
      setErr(
        `Network error: ${e.message}. Make sure your URL is correct and Supabase project is active.`
      );
    }
    setConnecting(false);
  }

  return (
    <div className="setup">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2329ABE2'/%3E%3Ctext x='50' y='67' font-size='50' text-anchor='middle' fill='white'%3E%F0%9F%92%8A%3C/text%3E%3C/svg%3E"
          alt="Mapleton Pharmacy"
          style={{
            width: 56,
            height: 56,
            objectFit: 'contain',
            mixBlendMode: 'multiply',
            filter: 'saturate(1.4) brightness(1.1)',
          }}
        />
        <div>
          <div className="setup-logo">SKYNET</div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--accent)',
              fontFamily: 'var(--mono)',
              letterSpacing: '.08em',
              marginTop: 3,
            }}
          >
            MAPLETON PHARMACY
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[1, 2].map((n) => (
          <button
            key={n}
            className="btn btn-s"
            style={{
              flex: 1,
              fontSize: 12,
              padding: '8px',
              borderColor: step === n ? 'var(--accent)' : undefined,
              color: step === n ? 'var(--accent)' : undefined,
            }}
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
              Go to{' '}
              <strong style={{ color: 'var(--accent)' }}>supabase.com</strong> —
              create a free project → open SQL Editor → run the schema below.
              It\'s easier than setting up AOL Instant Messenger. 📟
            </div>
          </div>
          <div className="sql">{SQL}</div>
          <button className="copy-btn" onClick={copy}>
            {copied ? '✓ Copied!' : '📋 Copy SQL'}
          </button>
          <button
            className="btn btn-p btn-full"
            style={{ marginTop: 16 }}
            onClick={() => setStep(2)}
          >
            Next: Connect →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="step-card">
            <div className="step-n">STEP 2 OF 2</div>
            <div className="step-t">
              In Supabase: Settings → API. Copy your Project URL and anon key.
              Guard these like your MySpace password. 🔐
            </div>
          </div>
          <div className="ig">
            <label className="lbl">Supabase Project URL</label>
            <input
              className="inp"
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="ig">
            <label className="lbl">Anon Public Key</label>
            <input
              className="inp"
              placeholder="eyJhbGciOiJ..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              type="password"
            />
          </div>
          {err && (
            <div
              style={{
                background: 'var(--dbg)',
                border: '1px solid var(--dborder)',
                padding: '10px 12px',
                border: '1px solid var(--dborder)',
                fontSize: 13,
                color: 'var(--danger)',
                marginBottom: 14,
              }}
            >
              {err}
            </div>
          )}
          <button
            className="btn btn-p btn-full"
            onClick={connect}
            disabled={!url || !key || connecting}
          >
            {connecting ? (
              <>
                <div className="spin" />
                Connecting...
              </>
            ) : (
              'Launch Rx Inventory'
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ products }) {
  const enriched = products.map((p) => ({
    ...p,
    qty: p.inventory?.[0]?.on_hand ?? 0,
    status: stockStatus(p),
  }));
  const totalSkus = products.length;
  const lowStock = enriched.filter((p) => p.status === 'w').length;
  const outStock = enriched.filter((p) => p.status === 'd').length;
  const totalVal = enriched.reduce(
    (s, p) => s + p.qty * (p.cost_per_unit ?? 0),
    0
  );
  const alerts = enriched
    .filter((p) => p.status !== 'a')
    .sort((a, b) => a.qty - b.qty);

  return (
    <div className="tab-in">
      <div className="section" style={{ paddingTop: 18 }}>
        <div className="stats">
          <div className="stat a">
            <div className="stat-val">{totalSkus}</div>
            <div className="stat-lbl">Total SKUs</div>
          </div>
          <div className="stat">
            <div
              className="stat-val"
              style={{ fontSize: totalVal >= 10000 ? 20 : 26 }}
            >
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

      {alerts.length > 0 && (
        <div className="section" style={{ paddingTop: 20 }}>
          <div className="sec-label">⚠ Reorder Needed</div>
          {alerts.slice(0, 8).map((p) => (
            <div
              key={p.id}
              className={`alert ${p.status === 'd' ? 'out' : ''}`}
            >
              <span style={{ fontSize: 18 }}>📦</span>
              <div style={{ flex: 1 }}>
                <div className="alert-name">{p.name}</div>
                <div className="alert-qty">
                  {p.status === 'd'
                    ? 'OUT OF STOCK'
                    : `${p.qty} left (reorder at ${p.reorder_threshold})`}
                </div>
              </div>
              <span
                className={`badge ${p.status === 'd' ? 'badge-d' : 'badge-w'}`}
              >
                {p.status === 'd' ? 'ORDER' : 'LOW'}
              </span>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && totalSkus > 0 && (
        <div className="section" style={{ paddingTop: 20 }}>
          <div
            style={{
              background: 'var(--okbg)',
              border: '1px solid var(--okborder)',
              borderLeft: '3px solid var(--ok)',
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div
              style={{
                fontFamily: 'var(--font)',
                fontSize: 20,
                letterSpacing: '.1em',
                color: 'var(--ok)',
                textShadow: '0 0 8px rgba(0,255,65,.5)',
              }}
            >
              ✌️ All Stock Looking Fresh
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}
            >
              No reorder alerts — as if!
            </div>
          </div>
        </div>
      )}

      {totalSkus === 0 && (
        <div
          className="section"
          style={{ paddingTop: 40, textAlign: 'center' }}
        >
          <div className="empty-ico">🏗️</div>
          <div className="empty-t">No products yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Import an invoice or add products manually. Don\'t worry, be happy.
            🎵
          </div>
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SCAN TAB
// ─────────────────────────────────────────────
function ScanTab({ products, cfg, onRefresh, showToast }) {
  const [mode, setMode] = useState('options');
  const [upc, setUpc] = useState('');
  const [found, setFound] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [countVal, setCountVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const fileRef = useRef(null);

  const lookup = useCallback(
    (code) => {
      stopCamera();
      const clean = code.trim();
      const p = products.find((pr) => pr.upc === clean || pr.ndc === clean);
      if (p) {
        setFound(p);
        setUpc(clean);
        setNotFound(false);
      } else {
        setFound(null);
        setUpc(clean);
        setNotFound(true);
      }
      setMode('result');
    },
    [products]
  );

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }
  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      if ('BarcodeDetector' in window) {
        const det = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes.length > 0) {
              clearInterval(intervalRef.current);
              lookup(codes[0].rawValue);
            }
          } catch {}
        }, 300);
      }
    } catch {
      alert('Camera access denied. Use Photo Scan or Manual entry.');
      setMode('options');
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setMode('manual');
    setUpc('Reading barcode...');
    try {
      const base64 = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.readAsDataURL(file);
      });
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: file.type || 'image/jpeg',
                    data: base64,
                  },
                },
                {
                  type: 'text',
                  text: 'Read the barcode, UPC, or EAN code in this image. Reply with ONLY the numeric/alphanumeric code. If none found, reply NONE.',
                },
              ],
            },
          ],
        }),
      });
      const data = await resp.json();
      const code = data.content?.[0]?.text?.trim();
      if (!code || code === 'NONE') {
        setUpc('');
        showToast('No barcode found in photo', 'error');
      } else lookup(code);
    } catch {
      setUpc('');
      showToast('Error reading photo', 'error');
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
      if (inv)
        await sb(
          cfg,
          'PATCH',
          'inventory',
          { product_id: `eq.${found.id}` },
          {
            on_hand: newQty,
            last_counted: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          }
        );
      else
        await sb(
          cfg,
          'POST',
          'inventory',
          {},
          {
            product_id: found.id,
            on_hand: newQty,
            last_counted: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          }
        );
      await sb(
        cfg,
        'POST',
        'transactions',
        {},
        {
          product_id: found.id,
          type: 'count',
          quantity_change: newQty - prev,
          new_quantity: newQty,
          notes: 'Physical count',
          performed_by: 'Staff',
        }
      );
      showToast(`Count saved: ${found.name}`, 'success');
      onRefresh();
      reset();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    setSaving(false);
  }

  function reset() {
    setMode('options');
    setFound(null);
    setUpc('');
    setCountVal('');
    setNotFound(false);
    stopCamera();
  }

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">Scan &amp; Count</div>

      {mode === 'options' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-s btn-full" onClick={startCamera}>
            📸 Live Camera Scan{' '}
            <span
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginLeft: 'auto',
              }}
            >
              Chrome/Android
            </span>
          </button>
          <button
            className="btn btn-s btn-full"
            onClick={() => fileRef.current?.click()}
          >
            {processing ? (
              <>
                <div className="spin" />
                Loading... please wait... *dial-up noises*
              </>
            ) : (
              '🖼️ Photo Scan — iOS / iPad'
            )}
          </button>
          <button
            className="btn btn-s btn-full"
            onClick={() => setMode('manual')}
          >
            ⌨️ Enter UPC Manually
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            style={{ display: 'none' }}
          />
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            Photo Scan uses Claude AI to read any barcode
          </div>
        </div>
      )}

      {mode === 'camera' && (
        <div>
          <div className="cam">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="scanline" />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 11,
                color: 'rgba(255,255,255,.6)',
              }}
            >
              {'BarcodeDetector' in window
                ? 'Scanning — point at barcode'
                : 'Auto-detect not available. Use Photo mode.'}
            </div>
          </div>
          <button
            className="btn btn-s btn-full"
            style={{ marginTop: 12 }}
            onClick={reset}
          >
            Cancel
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <div className="ig">
            <label className="lbl">UPC / NDC Code</label>
            <input
              className="inp"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 18,
                letterSpacing: '.05em',
              }}
              placeholder="Enter barcode number"
              value={upc}
              onChange={(e) => setUpc(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-p"
              style={{ flex: 1 }}
              onClick={() => lookup(upc)}
              disabled={!upc || processing}
            >
              Lookup
            </button>
            <button className="btn btn-s" onClick={reset}>
              Cancel
            </button>
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
                <div className="res-sub">UPC: {upc}</div>
                <div
                  style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}
                >
                  This barcode isn\'t in your database. Add it in Products. Talk
                  to the hand. ✋
                </div>
              </div>
              <button className="btn btn-s btn-full" onClick={reset}>
                Scan Another
              </button>
            </>
          ) : (
            <>
              <div className="res-card">
                <div className="res-name">{found?.name}</div>
                <div className="res-sub">
                  UPC: {found?.upc || '—'} · {found?.vendor || 'No vendor'}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                      }}
                    >
                      On Hand
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 24,
                        fontWeight: 600,
                        color: 'var(--accent)',
                      }}
                    >
                      {found?.inventory?.[0]?.on_hand ?? 0}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                      }}
                    >
                      Unit Cost
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 24,
                        fontWeight: 600,
                      }}
                    >
                      ${found?.cost_per_unit ?? 0}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ig">
                <label className="lbl">New Physical Count</label>
                <input
                  className="inp"
                  type="number"
                  min="0"
                  placeholder="Enter count"
                  value={countVal}
                  onChange={(e) => setCountVal(e.target.value)}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 28,
                    textAlign: 'center',
                    padding: 14,
                  }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-p"
                  style={{ flex: 1 }}
                  onClick={saveCount}
                  disabled={!countVal || saving}
                >
                  {saving ? (
                    <>
                      <div className="spin" />
                      Saving
                    </>
                  ) : (
                    '✓ Save Count'
                  )}
                </button>
                <button className="btn btn-s" onClick={reset}>
                  ↩
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PRODUCTS TAB
// ─────────────────────────────────────────────
function ProductsTab({ products, cfg, onRefresh, showToast }) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    upc: '',
    ndc: '',
    vendor: '',
    category: '',
    unit: 'each',
    cost_per_unit: '',
    reorder_threshold: '10',
  });
  const f = (k) => (e) => setForm((x) => ({ ...x, [k]: e.target.value }));

  const filtered = products.filter(
    (p) =>
      !search ||
      [p.name, p.upc, p.ndc, p.vendor, p.category].some((v) =>
        v?.toLowerCase().includes(search.toLowerCase())
      )
  );

  async function addProduct() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const [product] = await sb(
        cfg,
        'POST',
        'products',
        {},
        {
          name: form.name.trim(),
          upc: form.upc || null,
          ndc: form.ndc || null,
          vendor: form.vendor || null,
          category: form.category || null,
          unit: form.unit,
          cost_per_unit: parseFloat(form.cost_per_unit) || 0,
          reorder_threshold: parseInt(form.reorder_threshold) || 10,
        }
      );
      await sb(
        cfg,
        'POST',
        'inventory',
        {},
        { product_id: product.id, on_hand: 0 }
      );
      showToast('Product added!', 'success');
      onRefresh();
      setShowAdd(false);
      setForm({
        name: '',
        upc: '',
        ndc: '',
        vendor: '',
        category: '',
        unit: 'each',
        cost_per_unit: '',
        reorder_threshold: '10',
      });
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    setSaving(false);
  }

  return (
    <div className="tab-in">
      <div className="sbar">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="inp"
            placeholder="Search name, UPC, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-p"
            style={{ padding: '10px 14px', flexShrink: 0 }}
            onClick={() => setShowAdd(true)}
          >
            + Add
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-ico">🔍</div>
          <div className="empty-t">
            {search
              ? 'No results'
              : 'Your database is emptier than a Tamagotchi graveyard 🪦'}
          </div>
        </div>
      )}

      {filtered.map((p) => {
        const qty = p.inventory?.[0]?.on_hand ?? 0;
        const st = stockStatus(p);
        return (
          <div key={p.id} className="prow" onClick={() => setDetail(p)}>
            <div className="pico">💊</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pname">{p.name}</div>
              <div className="psub">
                {p.upc || p.ndc || 'No barcode'} · {p.vendor || '—'}
              </div>
            </div>
            <div className={`pqty ${st}`}>{qty}</div>
          </div>
        );
      })}
      <div style={{ height: 16 }} />

      {showAdd && (
        <div
          className="overlay"
          onClick={(e) => e.currentTarget === e.target && setShowAdd(false)}
        >
          <div className="modal">
            <div className="handle" />
            <div className="mtitle">Add Product</div>
            {[
              ['name', 'Product Name *'],
              ['upc', 'UPC Barcode'],
              ['ndc', 'NDC Code'],
              ['vendor', 'Vendor / Supplier'],
              ['category', 'Category'],
            ].map(([k, l]) => (
              <div className="ig" key={k}>
                <label className="lbl">{l}</label>
                <input className="inp" value={form[k]} onChange={f(k)} />
              </div>
            ))}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <div className="ig">
                <label className="lbl">Unit Cost $</label>
                <input
                  className="inp"
                  type="number"
                  step="0.01"
                  value={form.cost_per_unit}
                  onChange={f('cost_per_unit')}
                />
              </div>
              <div className="ig">
                <label className="lbl">Reorder At</label>
                <input
                  className="inp"
                  type="number"
                  value={form.reorder_threshold}
                  onChange={f('reorder_threshold')}
                />
              </div>
            </div>
            <button
              className="btn btn-p btn-full"
              onClick={addProduct}
              disabled={!form.name || saving}
            >
              {saving ? (
                <>
                  <div className="spin" />
                  Adding...
                </>
              ) : (
                'Add Product'
              )}
            </button>
          </div>
        </div>
      )}

      {detail && (
        <div
          className="overlay"
          onClick={(e) => e.currentTarget === e.target && setDetail(null)}
        >
          <div className="modal">
            <div className="handle" />
            <div className="mtitle">{detail.name}</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                [
                  'On Hand',
                  detail.inventory?.[0]?.on_hand ?? 0,
                  'var(--accent)',
                ],
                ['Unit Cost', `$${detail.cost_per_unit ?? 0}`, null],
                ['Reorder At', detail.reorder_threshold ?? 10, 'var(--warn)'],
                [
                  'Total Value',
                  `$${(
                    (detail.inventory?.[0]?.on_hand ?? 0) *
                    (detail.cost_per_unit ?? 0)
                  ).toFixed(2)}`,
                  null,
                ],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--s2)', padding: 12 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--muted)',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                    }}
                  >
                    {l}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 20,
                      fontWeight: 600,
                      color: c || 'var(--text)',
                    }}
                  >
                    {v}
                  </div>
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
            ]
              .filter(([, v]) => v)
              .map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {l}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: ['UPC', 'NDC'].includes(l)
                        ? 'var(--mono)'
                        : undefined,
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            <button
              className="btn btn-s btn-full"
              style={{ marginTop: 16 }}
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// RECEIVE TAB
// ─────────────────────────────────────────────
function ReceiveTab({ products, cfg, onRefresh, showToast }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = products.filter(
    (p) =>
      !search ||
      [p.name, p.upc, p.vendor].some((v) =>
        v?.toLowerCase().includes(search.toLowerCase())
      )
  );

  async function receive() {
    if (!selected || !qty) return;
    setSaving(true);
    try {
      const amount = parseInt(qty);
      const inv = selected.inventory?.[0];
      const prev = inv?.on_hand ?? 0;
      const newQty = prev + amount;
      if (inv)
        await sb(
          cfg,
          'PATCH',
          'inventory',
          { product_id: `eq.${selected.id}` },
          { on_hand: newQty, last_updated: new Date().toISOString() }
        );
      else
        await sb(
          cfg,
          'POST',
          'inventory',
          {},
          { product_id: selected.id, on_hand: newQty }
        );
      await sb(
        cfg,
        'POST',
        'transactions',
        {},
        {
          product_id: selected.id,
          type: 'receive',
          quantity_change: amount,
          new_quantity: newQty,
          notes: 'Manual receive',
          performed_by: 'Staff',
        }
      );
      showToast(`+${amount} × ${selected.name}`, 'success');
      onRefresh();
      setSelected(null);
      setQty('');
      setSearch('');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    setSaving(false);
  }

  return (
    <div className="tab-in">
      {selected ? (
        <div style={{ padding: 16 }}>
          <div className="sec-label">Receive Stock</div>
          <div className="res-card" style={{ marginBottom: 16 }}>
            <div className="res-name">{selected.name}</div>
            <div className="res-sub">
              Current: {selected.inventory?.[0]?.on_hand ?? 0} {selected.unit} ·{' '}
              {selected.vendor || 'No vendor'}
            </div>
          </div>
          <div className="ig">
            <label className="lbl">Quantity Received</label>
            <input
              className="inp"
              type="number"
              min="1"
              placeholder="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 28,
                textAlign: 'center',
                padding: 14,
              }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-p"
              style={{ flex: 1 }}
              onClick={receive}
              disabled={!qty || saving}
            >
              {saving ? (
                <>
                  <div className="spin" />
                  Saving
                </>
              ) : (
                '+ Receive Stock'
              )}
            </button>
            <button
              className="btn btn-s"
              onClick={() => {
                setSelected(null);
                setQty('');
              }}
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sbar">
            <input
              className="inp"
              placeholder="Search product to receive..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {filtered.length === 0 && (
            <div className="empty">
              <div className="empty-ico">📦</div>
              <div className="empty-t">
                {search ? 'No results' : 'No products'}
              </div>
            </div>
          )}
          {filtered.map((p) => (
            <div key={p.id} className="prow" onClick={() => setSelected(p)}>
              <div className="pico">📦</div>
              <div style={{ flex: 1 }}>
                <div className="pname">{p.name}</div>
                <div className="psub">{p.vendor || 'No vendor'}</div>
              </div>
              <div className={`pqty ${stockStatus(p)}`}>
                {p.inventory?.[0]?.on_hand ?? 0}
              </div>
            </div>
          ))}
          <div style={{ height: 16 }} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// INVOICE TAB (AI-powered)
// ─────────────────────────────────────────────
function InvoiceTab({ cfg, onRefresh, showToast }) {
  const [stage, setStage] = useState('upload');
  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState({});
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  async function processFile(file) {
    setStage('processing');
    try {
      const base64 = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.readAsDataURL(file);
      });
      const isDoc = file.type === 'application/pdf';
      const contentBlock = isDoc
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type || 'image/jpeg',
              data: base64,
            },
          };

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                contentBlock,
                {
                  type: 'text',
                  text: `This is a supplier invoice for a compounding pharmacy. Extract every line item and return ONLY a JSON array with no other text:
[{"name":"product name","upc":"UPC if present or null","ndc":"NDC if present or null","vendor":"supplier name","quantity":number,"unit_cost":number,"unit":"each/bottle/box/g/ml etc","category":"category or null"}]
Extract all items. Use null for missing values. Return only valid JSON array, no markdown.`,
                },
              ],
            },
          ],
        }),
      });
      const data = await resp.json();
      const raw = data.content?.[0]?.text?.trim() || '[]';
      const extracted = JSON.parse(
        raw.replace(/```json\n?|\n?```/g, '').trim()
      );
      const initChecked = {};
      extracted.forEach((_, i) => {
        initChecked[i] = true;
      });
      setItems(extracted);
      setChecked(initChecked);
      setStage('review');
    } catch (e) {
      showToast('Error processing invoice: ' + e.message, 'error');
      setStage('upload');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function importSelected() {
    const toImport = items.filter((_, i) => checked[i]);
    if (!toImport.length) return;
    setSaving(true);
    let added = 0,
      updated = 0;
    try {
      const existing =
        (await sb(cfg, 'GET', 'products', { select: 'id,upc,ndc,name' })) || [];
      for (const item of toImport) {
        const match = existing.find(
          (e) =>
            (item.upc && e.upc === item.upc) ||
            (item.ndc && e.ndc === item.ndc) ||
            e.name.toLowerCase() === item.name.toLowerCase()
        );
        if (match) {
          const inv =
            (await sb(cfg, 'GET', 'inventory', {
              product_id: `eq.${match.id}`,
              select: 'id,on_hand',
            })) || [];
          const prev = inv[0]?.on_hand ?? 0;
          const newQ = prev + (item.quantity || 0);
          if (inv[0])
            await sb(
              cfg,
              'PATCH',
              'inventory',
              { product_id: `eq.${match.id}` },
              { on_hand: newQ, last_updated: new Date().toISOString() }
            );
          await sb(
            cfg,
            'POST',
            'transactions',
            {},
            {
              product_id: match.id,
              type: 'receive',
              quantity_change: item.quantity,
              new_quantity: newQ,
              notes: 'Invoice import',
              performed_by: 'Invoice AI',
            }
          );
          updated++;
        } else {
          const [p] = await sb(
            cfg,
            'POST',
            'products',
            {},
            {
              name: item.name,
              upc: item.upc,
              ndc: item.ndc,
              vendor: item.vendor,
              category: item.category,
              unit: item.unit || 'each',
              cost_per_unit: item.unit_cost || 0,
              reorder_threshold: 10,
            }
          );
          await sb(
            cfg,
            'POST',
            'inventory',
            {},
            { product_id: p.id, on_hand: item.quantity || 0 }
          );
          await sb(
            cfg,
            'POST',
            'transactions',
            {},
            {
              product_id: p.id,
              type: 'receive',
              quantity_change: item.quantity,
              new_quantity: item.quantity,
              notes: 'New product — invoice import',
              performed_by: 'Invoice AI',
            }
          );
          added++;
        }
      }
      setImportResult({ added, updated });
      onRefresh();
      setStage('done');
    } catch (e) {
      showToast('Import error: ' + e.message, 'error');
    }
    setSaving(false);
  }

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">AI Invoice Processing</div>

      {stage === 'upload' && (
        <>
          <div className="scanbox" onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🧾</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              Upload Supplier Invoice
            </div>
            <div
              style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}
            >
              PDF or photo — Claude reads every line item
            </div>
            <button
              className="btn btn-p"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
            >
              Choose File
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) =>
              e.target.files?.[0] && processFile(e.target.files[0])
            }
            style={{ display: 'none' }}
          />
          <div
            style={{
              marginTop: 16,
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              How It Works 💿
            </div>
            {[
              "Upload any supplier invoice (PDF, photo, even a fax if you're fancy 📠)",
              "AI extracts every product, quantity, and cost — it's all that and a bag of chips",
              "Review items — uncheck anything sketchy. Don't go chasing waterfalls.",
              "Confirm — database updated. You're on a roll like a Dunkaroos kid. 🍪",
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    color: 'var(--accent)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    minWidth: 18,
                    paddingTop: 2,
                  }}
                >
                  {i + 1}.
                </span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stage === 'processing' && (
        <div style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
          <div
            style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}
            style={{
              fontFamily: 'var(--font)',
              fontSize: 22,
              letterSpacing: '.15em',
              color: 'var(--accent)',
            }}
          >
            Reading your invoice...
          </div>
          <div
            style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}
          >
            Hang tight — this is faster than a 56k modem, we promise 📠
          </div>
          <div
            className="spin"
            style={{ margin: '0 auto', width: 32, height: 32, borderWidth: 3 }}
          />
        </div>
      )}

      {stage === 'review' && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 14,
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>
                {items.length} items found
              </span>
              <span
                style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}
              >
                Uncheck to skip
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: 'var(--accent)',
                fontFamily: 'var(--mono)',
              }}
            >
              {Object.values(checked).filter(Boolean).length} selected
            </span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="inv-item">
              <input
                type="checkbox"
                className="inv-chk"
                checked={!!checked[i]}
                onChange={(e) =>
                  setChecked((c) => ({ ...c, [i]: e.target.checked }))
                }
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--muted)',
                    marginTop: 3,
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {item.upc
                    ? `UPC: ${item.upc}`
                    : item.ndc
                    ? `NDC: ${item.ndc}`
                    : 'No code'}
                  {item.vendor ? ` · ${item.vendor}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontWeight: 600,
                    color: 'var(--accent)',
                  }}
                >
                  ×{item.quantity ?? '?'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  ${item.unit_cost ?? '?'}/ea
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-p"
              style={{ flex: 1 }}
              onClick={importSelected}
              disabled={saving || !Object.values(checked).some(Boolean)}
            >
              {saving ? (
                <>
                  <div className="spin" />
                  Importing...
                </>
              ) : (
                `Import ${Object.values(checked).filter(Boolean).length} Items`
              )}
            </button>
            <button className="btn btn-s" onClick={() => setStage('upload')}>
              Back
            </button>
          </div>
        </>
      )}

      {stage === 'done' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div
            style={{
              fontFamily: 'var(--font)',
              fontSize: 24,
              letterSpacing: '.15em',
              color: 'var(--ok)',
            }}
          >
            Import Complete 💾
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>
            {importResult?.added ?? 0} new products added to your database 🆕
          </div>
          <div
            style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}
          >
            {importResult?.updated ?? 0} existing products updated — totally
            radical 🤙
          </div>
          <button
            className="btn btn-p"
            onClick={() => {
              setStage('upload');
              setItems([]);
              setChecked({});
              setImportResult(null);
            }}
          >
            Process Another Invoice
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// EXCEL IMPORT TAB
// ─────────────────────────────────────────────
function ExcelTab({ cfg, onRefresh, showToast }) {
  const [stage, setStage] = useState('upload');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [checked, setChecked] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const FIELDS = [
    { key: 'name', label: 'Product Name', required: true },
    { key: 'upc', label: 'UPC Barcode' },
    { key: 'ndc', label: 'NDC Code' },
    { key: 'vendor', label: 'Vendor / Supplier' },
    { key: 'category', label: 'Category' },
    { key: 'cost_per_unit', label: 'Unit Cost ($)' },
    { key: 'on_hand', label: 'Current Stock (Qty)' },
    { key: 'reorder_threshold', label: 'Reorder At (Qty)' },
    { key: 'unit', label: 'Unit (each/bottle/g etc)' },
  ];

  // Auto-guess column mappings
  function guessMapping(hdrs) {
    const guesses = {};
    const norm = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
    hdrs.forEach((h) => {
      const n = norm(h);
      if (
        n.includes('name') ||
        n.includes('product') ||
        n.includes('description') ||
        n.includes('item')
      )
        guesses.name = guesses.name || h;
      if (n.includes('upc') || n.includes('barcode') || n.includes('ean'))
        guesses.upc = guesses.upc || h;
      if (n.includes('ndc')) guesses.ndc = guesses.ndc || h;
      if (
        n.includes('vendor') ||
        n.includes('supplier') ||
        n.includes('manufacturer') ||
        n.includes('brand')
      )
        guesses.vendor = guesses.vendor || h;
      if (n.includes('category') || n.includes('type') || n.includes('class'))
        guesses.category = guesses.category || h;
      if (n.includes('cost') || n.includes('price') || n.includes('unit'))
        guesses.cost_per_unit = guesses.cost_per_unit || h;
      if (
        n.includes('qty') ||
        n.includes('quantity') ||
        n.includes('stock') ||
        n.includes('onhand') ||
        n.includes('count')
      )
        guesses.on_hand = guesses.on_hand || h;
      if (
        n.includes('reorder') ||
        n.includes('minimum') ||
        n.includes('min') ||
        n.includes('threshold')
      )
        guesses.reorder_threshold = guesses.reorder_threshold || h;
    });
    return guesses;
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Load SheetJS dynamically
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src =
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = window.XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
      });
      if (data.length < 2) {
        showToast('File appears empty', 'error');
        return;
      }
      const hdrs = data[0].map(String);
      const dataRows = data.slice(1).filter((r) => r.some((c) => c !== ''));
      setHeaders(hdrs);
      setRows(dataRows);
      setMapping(guessMapping(hdrs));
      const init = {};
      dataRows.forEach((_, i) => {
        init[i] = true;
      });
      setChecked(init);
      setStage('map');
    } catch (err) {
      showToast('Could not read file: ' + err.message, 'error');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function getVal(row, fieldKey) {
    const col = mapping[fieldKey];
    if (!col) return null;
    const idx = headers.indexOf(col);
    if (idx < 0) return null;
    const v = row[idx];
    return v === '' || v === undefined ? null : v;
  }

  async function doImport() {
    const toImport = rows.filter((_, i) => checked[i]);
    if (!toImport.length) return;
    setSaving(true);
    let added = 0,
      skipped = 0;
    try {
      const existing =
        (await sb(cfg, 'GET', 'products', { select: 'id,upc,ndc,name' })) || [];
      for (const row of toImport) {
        const name = getVal(row, 'name');
        if (!name) {
          skipped++;
          continue;
        }
        const upc = String(getVal(row, 'upc') || '').trim() || null;
        const ndc = String(getVal(row, 'ndc') || '').trim() || null;
        const cost = parseFloat(getVal(row, 'cost_per_unit')) || 0;
        const qty = parseInt(getVal(row, 'on_hand')) || 0;
        const reorder = parseInt(getVal(row, 'reorder_threshold')) || 10;
        const vendor = getVal(row, 'vendor')
          ? String(getVal(row, 'vendor'))
          : null;
        const category = getVal(row, 'category')
          ? String(getVal(row, 'category'))
          : null;
        const unit = getVal(row, 'unit') ? String(getVal(row, 'unit')) : 'each';
        const match = existing.find(
          (e) =>
            (upc && e.upc === upc) ||
            (ndc && e.ndc === ndc) ||
            e.name.toLowerCase() === String(name).toLowerCase()
        );
        if (match) {
          skipped++;
          continue;
        }
        const [p] = await sb(
          cfg,
          'POST',
          'products',
          {},
          {
            name: String(name),
            upc,
            ndc,
            vendor,
            category,
            unit,
            cost_per_unit: cost,
            reorder_threshold: reorder,
          }
        );
        await sb(
          cfg,
          'POST',
          'inventory',
          {},
          { product_id: p.id, on_hand: qty }
        );
        added++;
      }
      setResult({ added, skipped });
      onRefresh();
      setStage('done');
    } catch (err) {
      showToast('Import error: ' + err.message, 'error');
    }
    setSaving(false);
  }

  const preview = rows.filter((_, i) => checked[i]).slice(0, 5);

  return (
    <div className="tab-in" style={{ padding: 16 }}>
      <div className="sec-label">📊 Excel / CSV Import</div>

      {stage === 'upload' && (
        <>
          <div className="scanbox" onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              Upload Product Spreadsheet
            </div>
            <div
              style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}
            >
              Excel (.xlsx) or CSV — any format works
            </div>
            <button
              className="btn btn-p"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
            >
              Choose File
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <div
            style={{
              marginTop: 16,
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Tips 💾
            </div>
            {[
              'Your spreadsheet needs at least a Product Name column',
              'Column names are auto-detected — UPC, Cost, Vendor, Stock etc.',
              'Duplicate products (same name or UPC) are skipped automatically',
              'You can re-import later to add new products — existing ones stay untouched',
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 7,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: 'var(--accent)', minWidth: 16 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stage === 'map' && (
        <>
          <div
            style={{
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Match Your Columns
            </div>
            <div
              style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}
            >
              We auto-detected these — fix any that look wrong:
            </div>
            {FIELDS.map((f) => (
              <div
                key={f.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 130,
                    fontSize: 12,
                    color: f.required ? 'var(--text)' : 'var(--muted)',
                    fontWeight: f.required ? 600 : 400,
                    flexShrink: 0,
                  }}
                >
                  {f.label}
                  {f.required && (
                    <span style={{ color: 'var(--danger)' }}> *</span>
                  )}
                </div>
                <select
                  value={mapping[f.key] || ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [f.key]: e.target.value || undefined,
                    }))
                  }
                  style={{
                    flex: 1,
                    background: 'var(--s2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 8px',
                    fontSize: 12,
                    color: 'var(--text)',
                    outline: 'none',
                    fontFamily: 'var(--font)',
                  }}
                >
                  <option value="">— skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Preview — {Object.values(checked).filter(Boolean).length} of{' '}
              {rows.length} rows selected
            </div>
            {preview.map((row, i) => (
              <div key={i} className="inv-item">
                <input
                  type="checkbox"
                  className="inv-chk"
                  checked={!!checked[rows.indexOf(row)]}
                  onChange={(e) =>
                    setChecked((c) => ({
                      ...c,
                      [rows.indexOf(row)]: e.target.checked,
                    }))
                  }
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getVal(row, 'name') || (
                      <span style={{ color: 'var(--danger)' }}>
                        No name — will skip
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--muted)',
                      marginTop: 2,
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {getVal(row, 'upc') ? `UPC: ${getVal(row, 'upc')}` : ''}
                    {getVal(row, 'vendor') ? ` · ${getVal(row, 'vendor')}` : ''}
                    {getVal(row, 'cost_per_unit')
                      ? ` · $${getVal(row, 'cost_per_unit')}`
                      : ''}
                    {getVal(row, 'on_hand')
                      ? ` · Qty: ${getVal(row, 'on_hand')}`
                      : ''}
                  </div>
                </div>
              </div>
            ))}
            {rows.length > 5 && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  padding: '8px 0',
                }}
              >
                ...and {rows.length - 5} more rows
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-p"
              style={{ flex: 1 }}
              onClick={doImport}
              disabled={
                saving || !Object.values(checked).some(Boolean) || !mapping.name
              }
            >
              {saving ? (
                <>
                  <div className="spin" />
                  Importing...
                </>
              ) : (
                `Import ${
                  Object.values(checked).filter(Boolean).length
                } Products`
              )}
            </button>
            <button
              className="btn btn-s"
              onClick={() => {
                setStage('upload');
                setRows([]);
                setHeaders([]);
                setMapping({});
              }}
            >
              Back
            </button>
          </div>
          {!mapping.name && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--danger)',
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              ⚠ Please map the Product Name column above
            </div>
          )}
        </>
      )}

      {stage === 'done' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 8,
            }}
          >
            Import Complete!
          </div>
          <div
            style={{
              fontSize: 15,
              color: 'var(--accent)',
              fontFamily: 'var(--mono)',
              marginBottom: 4,
            }}
          >
            {result?.added} new products added 🆕
          </div>
          <div
            style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}
          >
            {result?.skipped} skipped (duplicates or missing name)
          </div>
          <button
            className="btn btn-p"
            onClick={() => {
              setStage('upload');
              setRows([]);
              setHeaders([]);
              setMapping({});
              setResult(null);
            }}
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
const TABS = [
  { id: 'dash', icon: '📊', label: 'Dashboard' },
  { id: 'scan', icon: '📷', label: 'Scan' },
  { id: 'products', icon: '💊', label: 'Products' },
  { id: 'receive', icon: '📦', label: 'Receive' },
  { id: 'invoice', icon: '🧾', label: 'Invoice' },
  { id: 'excel', icon: '📊', label: 'Import' },
];

export default function SkyNet() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('skynet_unlocked') === '1';
    } catch {
      return false;
    }
  });
  const [cfg, setCfg] = useState(null);
  const [tab, setTab] = useState('dash');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get('skynet_cfg');
        if (r?.value) setCfg(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  async function refresh() {
    if (!cfg) return;
    setLoading(true);
    try {
      setProducts(await loadAll(cfg));
    } catch (e) {
      showToast('Sync failed', 'error');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (cfg) refresh();
  }, [cfg]);

  // 🕹️ 90s EASTER EGG — Konami Code
  useEffect(() => {
    const code = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];
    let idx = 0;
    const handler = (e) => {
      if (e.key === code[idx]) {
        idx++;
        if (idx === code.length) {
          showToast('🕹️ +30 Lives! Cheat code activated!', 'success');
          idx = 0;
        }
      } else idx = 0;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  function handleUnlock() {
    try {
      sessionStorage.setItem('skynet_unlocked', '1');
    } catch {}
    setUnlocked(true);
  }

  if (!unlocked)
    return (
      <>
        <style>{CSS}</style>
        <PinScreen onUnlock={handleUnlock} />
      </>
    );
  if (!cfg)
    return (
      <>
        <style>{CSS}</style>
        <SetupScreen onSave={setCfg} />
      </>
    );

  const tabProps = { products, cfg, onRefresh: refresh, showToast };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="hdr">
          <div>
            <div className="hdr-logo">SKYNET</div>
            <div className="hdr-sub">Mapleton Pharmacy · SKYNET v1.0</div>
          </div>
          <div className="hdr-sync">
            {loading && (
              <>
                <div className="spin" style={{ width: 13, height: 13 }} />
                Syncing
              </>
            )}
            {!loading && (
              <button
                onClick={refresh}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
                title="Refresh — like F5 on Netscape Navigator"
              >
                ↻
              </button>
            )}
            <button
              onClick={() => {
                try {
                  sessionStorage.removeItem('skynet_unlocked');
                } catch {}
                setUnlocked(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: 14,
                marginLeft: 2,
              }}
              title="Lock app"
            >
              🔒
            </button>
          </div>
        </div>

        <div className="content">
          {tab === 'dash' && <Dashboard products={products} />}
          {tab === 'scan' && <ScanTab {...tabProps} />}
          {tab === 'products' && <ProductsTab {...tabProps} />}
          {tab === 'receive' && <ReceiveTab {...tabProps} />}
          {tab === 'invoice' && (
            <InvoiceTab cfg={cfg} onRefresh={refresh} showToast={showToast} />
          )}
          {tab === 'excel' && (
            <ExcelTab cfg={cfg} onRefresh={refresh} showToast={showToast} />
          )}
        </div>

        <div className="marquee-wrap">
          <span className="marquee">
            💿 SKYNET INVENTORY v1.0 &nbsp;·&nbsp; POWERED BY MAPLETON PHARMACY
            &nbsp;·&nbsp; BE KIND, REWIND &nbsp;·&nbsp; DON'T FORGET TO FEED
            YOUR TAMAGOTCHI &nbsp;·&nbsp; YOU'VE GOT STOCK! &nbsp;·&nbsp; TALK
            TO THE HAND ✋ &nbsp;·&nbsp; AS IF! &nbsp;·&nbsp; ALL THAT AND A BAG
            OF CHIPS &nbsp;·&nbsp; EST. 1994 💿 &nbsp;·&nbsp;
          </span>
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nb ${tab === t.id ? 'on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span style={{ fontSize: 19 }}>{t.icon}</span>
              <span>{t.label}</span>
              <div className="nb-dot" />
            </button>
          ))}
        </nav>

        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    </>
  );
}
