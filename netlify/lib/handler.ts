// HTTP layer: turns a fetch `Request` into a `Response`. Framework-agnostic so
// the same code runs in the Netlify Function and in the local dev server.

import { type BlobStore, ConflictError, listBackups, loadDb, mutateDb, readBackup } from './store';
import * as ops from './ops';
import { normalise } from './store';
import { emptyDb, type DbDoc } from './types';

export interface Env {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_BASE_URL?: string; // tests only
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
const err = (message: string, status = 400) => json({ error: message }, status);

/** Route = everything after `/api` (works whether we're reached via /api/* or /.netlify/functions/api/*). */
function routeOf(req: Request): string {
  const path = new URL(req.url).pathname;
  const m = path.match(/(?:^|\/)api(\/.*)?$/);
  return (m?.[1] || '/').replace(/\/+$/, '') || '/';
}

// ── Brute-force protection for the 4-digit PIN ──
// Kept in its own blob key so failed attempts never contend with real writes.
const AUTH_KEY = 'auth';
const MAX_FAILS = 5;
const LOCK_MS = 60_000;
async function authGate(store: BlobStore): Promise<number> {
  const e = await store.getWithMetadata(AUTH_KEY, { type: 'json' }).catch(() => null);
  const lockedUntil = e?.data?.lockedUntil ? new Date(e.data.lockedUntil).getTime() : 0;
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}
async function authFailed(store: BlobStore) {
  const e = await store.getWithMetadata(AUTH_KEY, { type: 'json' }).catch(() => null);
  const failed = (e?.data?.failed || 0) + 1;
  const lock = failed >= MAX_FAILS;
  await store.setJSON(AUTH_KEY, { failed: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MS).toISOString() : null }).catch(() => {});
}
async function authSucceeded(store: BlobStore) {
  const e = await store.getWithMetadata(AUTH_KEY, { type: 'json' }).catch(() => null);
  if (e?.data?.failed) await store.setJSON(AUTH_KEY, { failed: 0, lockedUntil: null }).catch(() => {});
}

export function createHandler(getStore: () => BlobStore, env: Env) {
  return async function handle(req: Request): Promise<Response> {
    const route = routeOf(req);
    const method = req.method.toUpperCase();
    if (method === 'OPTIONS') return new Response(null, { status: 204 });

    try {
      const store = getStore();

      // ── Public ──
      if (route === '/health') {
        return json({ ok: true, storage: 'netlify-blobs', ai: !!env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || DEFAULT_MODEL, time: new Date().toISOString() });
      }

      if (route === '/unlock' && method === 'POST') {
        const wait = await authGate(store);
        if (wait > 0) return err(`Too many attempts — try again in ${wait}s`, 429);
        const body = await readJson(req);
        const pin = String(body.pin ?? '');
        const { doc } = await loadDb(store);
        const expected = body.admin ? doc.settings.settingsPin : doc.settings.appPin;
        if (pin !== expected) { await authFailed(store); return err('Incorrect PIN', 401); }
        await authSucceeded(store);
        return body.admin ? json({ ok: true, role: 'admin' }) : json({ ok: true, role: 'staff', staff: doc.settings.staff });
      }

      // ── Everything below needs the staff PIN ──
      const pin = req.headers.get('x-skynet-pin') || '';
      const adminPin = req.headers.get('x-skynet-admin') || '';
      const { doc: current } = await loadDb(store);
      const isStaff = !!pin && pin === current.settings.appPin;
      const isAdmin = !!adminPin && adminPin === current.settings.settingsPin;
      if (!isStaff && !isAdmin) {
        if (pin || adminPin) await authFailed(store); // guessing via headers counts too
        return err('Locked — enter the app PIN', 401);
      }
      const requireAdmin = () => { if (!isAdmin) throw Object.assign(new Error('Admin PIN required'), { status: 403 }); };

      if (route === '/state' && method === 'GET') return json(ops.publicState(current));

      if (route === '/transactions' && method === 'GET') {
        const q = new URL(req.url).searchParams;
        const productId = q.get('product_id');
        const type = q.get('type');
        const days = parseInt(q.get('days') || '0');
        const limit = Math.min(1000, parseInt(q.get('limit') || '200') || 200);
        const since = days > 0 ? Date.now() - days * 86400000 : 0;
        const rows = current.transactions
          .filter(t => (!productId || t.product_id === productId) && (!type || t.type === type) && (!since || new Date(t.created_at).getTime() >= since))
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, limit);
        return json({ transactions: rows });
      }

      if (route === '/export' && method === 'GET') {
        requireAdmin();
        const { settings, ...rest } = current;
        return json({ ...rest, settings: { staff: settings.staff }, exportedAt: new Date().toISOString() }, 200, {
          'content-disposition': `attachment; filename="skynet-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        });
      }

      if (route === '/backups' && method === 'GET') {
        requireAdmin();
        return json({ backups: await listBackups(store), lastBackupDate: current.lastBackupDate });
      }

      if (route === '/claude' && method === 'POST') {
        return proxyClaude(req, env);
      }

      if (route === '/op' && method === 'POST') {
        const body = await readJson(req);
        const by = (typeof body.by === 'string' && body.by.trim()) ? body.by.trim().slice(0, 60) : 'Staff';
        const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) : undefined;
        const op = String(body.op || '');
        const adminOps = new Set(['settings.update', 'db.restore', 'db.restoreBackup', 'db.reset']);
        if (adminOps.has(op)) requireAdmin();

        let restoreSource: DbDoc | null = null;
        if (op === 'db.restoreBackup') {
          const date = String(body.date || '');
          if (!/^\d{4}-\d{2}-\d{2}(T\d{4}-\w+)?$/.test(date)) return err('Invalid backup name');
          restoreSource = await readBackup(store, date);
          if (!restoreSource) return err('Backup not found', 404);
        }

        const destructive = op === 'db.restore' || op === 'db.restoreBackup' || op === 'db.reset';
        const { doc, result } = await mutateDb(store, d => {
          switch (op) {
            case 'product.add': return { product: ops.addProduct(d, body.product || {}, by) };
            case 'product.update': return { product: ops.updateProduct(d, String(body.id), body.patch || {}, by) };
            case 'product.delete': ops.deleteProduct(d, String(body.id), by); return { ok: true };
            case 'product.addCode': return { product: ops.addProductCode(d, String(body.id), body.code, by, notes) };
            case 'stock.count': return ops.countStock(d, String(body.id), body.qty, by, notes);
            case 'stock.receive': return ops.receiveStock(d, String(body.id), body.qty, by, { cost: body.cost, notes });
            case 'stock.use': return ops.useStock(d, String(body.id), body.qty, String(body.reason || ''), by);
            case 'import': {
              if (!Array.isArray(body.items)) throw new ops.BadRequest('items must be an array');
              if (body.items.length > 2000) throw new ops.BadRequest('Import at most 2000 rows at a time');
              return ops.importItems(d, body.items, body.mode === 'invoice' ? 'invoice' : 'excel', by);
            }
            case 'settings.update': return ops.updateSettings(d, body.patch || {});
            case 'db.restore': {
              if (!body.db || typeof body.db !== 'object' || !Array.isArray(body.db.products)) throw new ops.BadRequest('That is not a SKYNET backup file');
              const incoming = normalise(body.db);
              if (!incoming.products.length && !body.allowEmpty) throw new ops.BadRequest('That backup has no products in it');
              replaceData(d, incoming, `Restored from uploaded file`, by);
              return { products: d.products.length };
            }
            case 'db.restoreBackup': {
              replaceData(d, restoreSource!, `Restored from backup ${body.date}`, by);
              return { products: d.products.length };
            }
            case 'db.reset': {
              d.products = []; d.transactions = [];
              return { ok: true };
            }
            default: throw new ops.BadRequest(`Unknown operation "${op}"`);
          }
        }, { snapshotLabel: destructive ? op.replace('db.', '') : undefined });
        return json({ ...result, state: ops.publicState(doc) });
      }

      return err('Not found', 404);
    } catch (e: any) {
      const status = e?.status || (e instanceof ConflictError ? 409 : 500);
      if (status >= 500) { console.error('[skynet api]', e); return err('Server error — please try again', status); }
      return err(e?.message || 'Request failed', status);
    }
  };
}

/** Replace products + history, keeping the current PINs/staff. */
function replaceData(target: DbDoc, source: DbDoc, note: string, by: string) {
  target.products = source.products;
  target.transactions = source.transactions;
  target.transactions.unshift({
    id: ops.uid(), created_at: new Date().toISOString(), product_id: '', product_name: '—',
    type: 'restore', quantity_change: 0, new_quantity: 0, notes: note, performed_by: by,
  });
}

async function readJson(req: Request): Promise<any> {
  try { return (await req.json()) ?? {}; } catch { throw new ops.BadRequest('Invalid JSON body'); }
}

/**
 * Server-side Anthropic proxy — the API key never leaves the server.
 * The upstream call is STREAMED through: Netlify synchronous functions have a
 * ~10 s limit on buffered responses, but a streamed response starts within a
 * second and can keep going, which invoice reading needs.
 */
const MAX_OUTPUT_TOKENS = 4096;
async function proxyClaude(req: Request, env: Env): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return err('AI is not configured on the server. Add ANTHROPIC_API_KEY in Netlify → Site configuration → Environment variables.', 503);
  const body = await readJson(req);
  if (!Array.isArray(body.messages) || !body.messages.length) return err('messages required');
  const payload = {
    model: env.ANTHROPIC_MODEL || DEFAULT_MODEL, // server decides the model
    max_tokens: Math.min(MAX_OUTPUT_TOKENS, parseInt(body.max_tokens) || 1000),
    messages: body.messages,
    stream: true,
  };
  const upstream = await fetch((env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload),
  });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    let msg = `AI error ${upstream.status}`;
    try { msg = JSON.parse(text)?.error?.message || msg; } catch {}
    return err(msg, upstream.status === 429 ? 429 : 502);
  }
  return new Response(upstream.body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

export { emptyDb };
