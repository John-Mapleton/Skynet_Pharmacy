// Storage layer. `BlobStore` is the tiny subset of the Netlify Blobs Store API
// we rely on, so the same code runs against the real store in production and
// against an in-memory store in local tests (see scripts/dev-server.mjs).

import { type DbDoc, type Product, type Transaction, MAX_BACKUPS, MAX_TRANSACTIONS, emptyDb } from './types';

const uidFallback = () => (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));

export interface BlobStore {
  getWithMetadata(key: string, opts: { type: 'json' }): Promise<{ data: any; etag?: string } | null>;
  setJSON(key: string, data: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }): Promise<{ modified: boolean; etag?: string }>;
  list(opts?: { prefix?: string }): Promise<{ blobs: { key: string; etag?: string }[] }>;
  delete(key: string): Promise<void>;
}

export const DB_KEY = 'db';
export const BACKUP_PREFIX = 'backup/';

export class ConflictError extends Error {
  constructor() { super('Database was modified by another device at the same time — please retry'); }
}

/** Load the document (creating an empty one on first run). */
export async function loadDb(store: BlobStore): Promise<{ doc: DbDoc; etag?: string }> {
  const entry = await store.getWithMetadata(DB_KEY, { type: 'json' });
  if (!entry || !entry.data) {
    const doc = emptyDb();
    const res = await store.setJSON(DB_KEY, doc, { onlyIfNew: true });
    if (res.modified) return { doc, etag: res.etag };
    // Someone else created it a millisecond ago — read again
    const again = await store.getWithMetadata(DB_KEY, { type: 'json' });
    return { doc: normalise(again?.data), etag: again?.etag };
  }
  return { doc: normalise(entry.data), etag: entry.etag };
}

/**
 * Read → apply `fn` → conditional write. If another device wrote in between,
 * the etag no longer matches, the write is refused and we retry from a fresh
 * read. This is what makes "two iPads receiving stock at once" safe without a
 * real database.
 */
export async function mutateDb<T>(
  store: BlobStore,
  fn: (doc: DbDoc) => T | Promise<T>,
  opts: { attempts?: number; snapshotLabel?: string } = {},
): Promise<{ doc: DbDoc; result: T }> {
  const attempts = opts.attempts ?? 6;
  for (let i = 0; i < attempts; i++) {
    const { doc, etag } = await loadDb(store);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // Snapshot the data BEFORE today's first change (= how things stood at the
    // end of yesterday), and before any destructive operation.
    const snapshots: { key: string; doc: DbDoc }[] = [];
    if (doc.lastBackupDate !== today) {
      snapshots.push({ key: today, doc: JSON.parse(JSON.stringify(doc)) });
      doc.lastBackupDate = today;
    }
    if (opts.snapshotLabel) {
      snapshots.push({ key: `${now.slice(0, 16).replace(':', '')}-${opts.snapshotLabel}`, doc: JSON.parse(JSON.stringify(doc)) });
    }

    const result = await fn(doc);
    doc.updatedAt = now;
    trimTransactions(doc);

    // Snapshots go first (idempotent per key) so a failed snapshot never gets
    // "marked done" by the main write. Best effort — never blocks the user.
    for (const s of snapshots) {
      try { await writeBackup(store, s.doc, s.key); }
      catch (e) { console.error('[skynet] snapshot failed', s.key, e); doc.lastBackupDate = null; }
    }

    const write = etag
      ? await store.setJSON(DB_KEY, doc, { onlyIfMatch: etag })
      : await store.setJSON(DB_KEY, doc, { onlyIfNew: true });

    if (write.modified) return { doc, result };
    // conflict → small jittered wait, then retry with a fresh read
    await new Promise(r => setTimeout(r, 40 + Math.random() * 120 * (i + 1)));
  }
  throw new ConflictError();
}

async function writeBackup(store: BlobStore, doc: DbDoc, key: string) {
  await store.setJSON(BACKUP_PREFIX + key, doc);
  const { blobs } = await store.list({ prefix: BACKUP_PREFIX });
  const keys = blobs.map(b => b.key).sort(); // ISO dates sort chronologically
  const excess = keys.length - MAX_BACKUPS;
  for (let i = 0; i < excess; i++) await store.delete(keys[i]);
}

export async function listBackups(store: BlobStore): Promise<string[]> {
  const { blobs } = await store.list({ prefix: BACKUP_PREFIX });
  return blobs.map(b => b.key.slice(BACKUP_PREFIX.length)).sort().reverse();
}

export async function readBackup(store: BlobStore, date: string): Promise<DbDoc | null> {
  const entry = await store.getWithMetadata(BACKUP_PREFIX + date, { type: 'json' });
  return entry?.data ? normalise(entry.data) : null;
}

/** Keep the audit log bounded (newest first, oldest trimmed). */
function trimTransactions(doc: DbDoc) {
  if (doc.transactions.length > MAX_TRANSACTIONS) {
    doc.transactions.sort((a, b) => b.created_at.localeCompare(a.created_at));
    doc.transactions.length = MAX_TRANSACTIONS;
  }
}

/** Defensive: fill in anything missing so an old/partial doc never crashes the app. */
export function normalise(raw: any): DbDoc {
  const base = emptyDb();
  if (!raw || typeof raw !== 'object') return base;
  const doc: DbDoc = {
    schema: 1,
    products: Array.isArray(raw.products) ? raw.products : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    settings: {
      appPin: typeof raw.settings?.appPin === 'string' ? raw.settings.appPin : base.settings.appPin,
      settingsPin: typeof raw.settings?.settingsPin === 'string' ? raw.settings.settingsPin : base.settings.settingsPin,
      staff: Array.isArray(raw.settings?.staff) ? raw.settings.staff.filter((s: any) => typeof s === 'string') : [],
    },
    createdAt: raw.createdAt || base.createdAt,
    updatedAt: raw.updatedAt || base.updatedAt,
    lastBackupDate: raw.lastBackupDate ?? null,
  };
  const s = (v: unknown, max = 200) => (typeof v === 'string' || typeof v === 'number') ? String(v).trim().slice(0, max) : '';
  const sOrNull = (v: unknown) => s(v) || null;
  const num = (v: unknown, d: number) => (Number.isFinite(+v!) && v !== '' && v !== null) ? +v! : d;
  doc.products = doc.products
    .filter((p: any) => p && typeof p === 'object' && s(p.name))
    .map((p: any): Product => ({
      id: s(p.id) || uidFallback(),
      created_at: s(p.created_at) || doc.updatedAt,
      name: s(p.name),
      upc: sOrNull(p.upc), ndc: sOrNull(p.ndc), vendor: sOrNull(p.vendor), category: sOrNull(p.category),
      unit: s(p.unit) || 'each',
      cost_per_unit: Math.max(0, num(p.cost_per_unit, 0)),
      reorder_threshold: Math.max(0, Math.round(num(p.reorder_threshold, 10))),
      on_hand: Math.max(0, Math.round(num(p.on_hand, 0))),
      last_counted: sOrNull(p.last_counted),
      last_updated: s(p.last_updated) || s(p.created_at) || doc.updatedAt,
    }));
  doc.transactions = doc.transactions
    .filter((t: any) => t && typeof t === 'object' && s(t.created_at) && s(t.type))
    .map((t: any): Transaction => ({
      id: s(t.id) || uidFallback(),
      created_at: s(t.created_at),
      product_id: s(t.product_id),
      product_name: s(t.product_name) || '—',
      type: s(t.type) as Transaction['type'],
      quantity_change: Math.round(num(t.quantity_change, 0)),
      new_quantity: Math.round(num(t.new_quantity, 0)),
      notes: s(t.notes, 300),
      performed_by: s(t.performed_by, 60) || 'Staff',
    }));
  return doc;
}
