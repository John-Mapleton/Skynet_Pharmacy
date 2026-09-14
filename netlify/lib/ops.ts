// Business operations. Every function here takes the whole document, mutates
// it in place, and returns a result. They run inside `mutateDb`, so they are
// applied atomically against the latest data — no more "check then update"
// races between devices.

import type { DbDoc, Product, Transaction, TxType } from './types';

export class BadRequest extends Error {
  status = 400;
  constructor(msg: string) { super(msg); }
}

const now = () => new Date().toISOString();

export function uid(): string {
  // crypto.randomUUID exists in Node 19+ and every modern browser
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const cleanBarcode = (raw: unknown) => String(raw ?? '').replace(/[^0-9]/g, '');
const str = (v: unknown, max = 200) => (v == null ? '' : String(v)).trim().slice(0, max);
const strOrNull = (v: unknown) => str(v) || null;
const num = (v: unknown, d = 0) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : d; };
const int = (v: unknown, d = 0) => Math.round(num(v, d));
const money = (n: number) => Math.round(n * 100) / 100;

function findProduct(doc: DbDoc, id: string): Product {
  const p = doc.products.find(x => x.id === id);
  if (!p) throw new BadRequest('Product not found (it may have been deleted on another device)');
  return p;
}

function log(doc: DbDoc, p: Product, type: TxType, change: number, notes: string, by: string): Transaction {
  const tx: Transaction = {
    id: uid(), created_at: now(), product_id: p.id, product_name: p.name,
    type, quantity_change: change, new_quantity: p.on_hand, notes, performed_by: by || 'Staff',
  };
  doc.transactions.unshift(tx);
  return tx;
}

/** Find an existing product by barcode / NDC / exact name (case-insensitive). */
export function matchProduct(doc: DbDoc, item: { upc?: unknown; ndc?: unknown; name?: unknown }): Product | undefined {
  const upc = cleanBarcode(item.upc);
  const ndc = cleanBarcode(item.ndc);
  const name = str(item.name).toLowerCase();
  return doc.products.find(p =>
    (upc && cleanBarcode(p.upc) === upc) ||
    (ndc && cleanBarcode(p.ndc) === ndc) ||
    (name && p.name.toLowerCase() === name));
}

export function sanitiseProductInput(input: any): Partial<Product> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequest('Invalid product data');
  const out: Partial<Product> = {};
  // invoices call it unit_cost; spreadsheets/products call it cost_per_unit
  if (!('cost_per_unit' in input) && 'unit_cost' in input) input = { ...input, cost_per_unit: input.unit_cost };
  if ('name' in input) out.name = str(input.name);
  if ('upc' in input) out.upc = strOrNull(cleanBarcode(input.upc));
  if ('ndc' in input) out.ndc = strOrNull(input.ndc);
  if ('vendor' in input) out.vendor = strOrNull(input.vendor);
  if ('category' in input) out.category = strOrNull(input.category);
  if ('unit' in input) out.unit = str(input.unit) || 'each';
  if ('cost_per_unit' in input) out.cost_per_unit = money(Math.max(0, num(input.cost_per_unit)));
  if ('reorder_threshold' in input) out.reorder_threshold = Math.max(0, int(input.reorder_threshold, 10));
  return out;
}

// ── Products ─────────────────────────────────────────────────────────
export function addProduct(doc: DbDoc, input: any, by: string): Product {
  const f = sanitiseProductInput(input);
  if (!f.name) throw new BadRequest('Product name is required');
  const dupe = matchProduct(doc, { upc: f.upc, ndc: f.ndc, name: f.name });
  if (dupe) throw new BadRequest(`"${dupe.name}" already exists with that name/barcode`);
  const t = now();
  const p: Product = {
    id: uid(), created_at: t, name: f.name,
    upc: f.upc ?? null, ndc: f.ndc ?? null, vendor: f.vendor ?? null, category: f.category ?? null,
    unit: f.unit ?? 'each', cost_per_unit: f.cost_per_unit ?? 0, reorder_threshold: f.reorder_threshold ?? 10,
    on_hand: Math.max(0, int(input.on_hand, 0)), last_counted: null, last_updated: t,
  };
  doc.products.push(p);
  doc.products.sort((a, b) => a.name.localeCompare(b.name));
  log(doc, p, 'created', p.on_hand, p.on_hand > 0 ? 'Added with opening stock' : 'Product created', by);
  return p;
}

export function updateProduct(doc: DbDoc, id: string, patch: any, by: string): Product {
  const p = findProduct(doc, id);
  const f = sanitiseProductInput(patch);
  if ('name' in f && !f.name) throw new BadRequest('Product name cannot be blank');
  if (f.upc || f.ndc || f.name) {
    const clash = doc.products.find(o => o.id !== id && (
      (f.upc && cleanBarcode(o.upc) === f.upc) ||
      (f.ndc && o.ndc && o.ndc === f.ndc) ||
      (f.name && o.name.toLowerCase() === f.name.toLowerCase())));
    if (clash) throw new BadRequest(`"${clash.name}" already uses that name/barcode`);
  }
  const oldCost = p.cost_per_unit;
  Object.assign(p, f);
  p.last_updated = now();
  if ('cost_per_unit' in f && Math.abs(f.cost_per_unit! - oldCost) > 0.001) {
    log(doc, p, 'price_change', 0, `Price changed: $${oldCost.toFixed(2)} → $${p.cost_per_unit.toFixed(2)}`, by);
  }
  doc.products.sort((a, b) => a.name.localeCompare(b.name));
  return p;
}

export function deleteProduct(doc: DbDoc, id: string, by: string): void {
  const p = findProduct(doc, id);
  log(doc, p, 'deleted', -p.on_hand, `Product deleted (had ${p.on_hand} on hand)`, by);
  doc.products = doc.products.filter(x => x.id !== id);
  // history is kept — the audit log still shows the product's name
}

// ── Stock movements ──────────────────────────────────────────────────
export function countStock(doc: DbDoc, id: string, qty: unknown, by: string, notes = 'Physical count') {
  const p = findProduct(doc, id);
  const n = int(qty, NaN);
  if (!Number.isFinite(n) || n < 0) throw new BadRequest('Enter a valid count (0 or more)');
  const change = n - p.on_hand;
  p.on_hand = n;
  p.last_counted = now();
  p.last_updated = p.last_counted;
  const tx = log(doc, p, 'count', change, notes, by);
  return { product: p, tx };
}

export function receiveStock(doc: DbDoc, id: string, qty: unknown, by: string, opts: { cost?: unknown; notes?: string } = {}) {
  const p = findProduct(doc, id);
  const n = int(qty, NaN);
  if (!Number.isFinite(n) || n <= 0) throw new BadRequest('Quantity received must be 1 or more');
  p.on_hand += n;
  p.last_updated = now();
  const tx = log(doc, p, 'receive', n, opts.notes || 'Stock received', by);
  let priceChange: { from: number; to: number } | null = null;
  if (opts.cost != null && String(opts.cost).trim() !== '') {
    const c = money(num(opts.cost));
    if (c > 0 && Math.abs(c - p.cost_per_unit) > 0.001) {
      priceChange = { from: p.cost_per_unit, to: c };
      p.cost_per_unit = c;
      log(doc, p, 'price_change', 0, `Price changed: $${priceChange.from.toFixed(2)} → $${c.toFixed(2)}`, by);
    }
  }
  return { product: p, tx, priceChange };
}

export function useStock(doc: DbDoc, id: string, qty: unknown, reason: string, by: string) {
  const p = findProduct(doc, id);
  const n = int(qty, NaN);
  if (!Number.isFinite(n) || n <= 0) throw new BadRequest('Quantity must be 1 or more');
  if (n > p.on_hand) throw new BadRequest(`Only ${p.on_hand} in stock`);
  const before = p.on_hand;
  p.on_hand -= n;
  p.last_updated = now();
  const tx = log(doc, p, 'adjustment', -n, str(reason) || 'Used', by);
  const crossedThreshold = before > p.reorder_threshold && p.on_hand <= p.reorder_threshold;
  return { product: p, tx, crossedThreshold };
}

// ── Bulk import (Excel / invoice) ────────────────────────────────────
export interface ImportItem {
  name?: unknown; upc?: unknown; ndc?: unknown; vendor?: unknown; category?: unknown; unit?: unknown;
  cost_per_unit?: unknown; unit_cost?: unknown; reorder_threshold?: unknown; quantity?: unknown; on_hand?: unknown;
}
export interface ImportResult { added: number; updated: number; skipped: number; priceChanges: number; errors: string[] }

/**
 * mode 'excel'   → spreadsheet is the source of truth: matching products are
 *                  updated and, if an On Hand column was mapped, that becomes
 *                  the new count.
 * mode 'invoice' → received goods: matching products get quantity ADDED and
 *                  the invoice price becomes the new unit cost.
 */
export function importItems(doc: DbDoc, items: ImportItem[], mode: 'excel' | 'invoice', by: string): ImportResult {
  const res: ImportResult = { added: 0, updated: 0, skipped: 0, priceChanges: 0, errors: [] };
  const source = mode === 'invoice' ? 'Invoice import' : 'Spreadsheet import';
  for (const raw of items) {
    try {
      if (!raw || typeof raw !== 'object') { res.skipped++; continue; }
      const name = str(raw.name);
      if (!name) { res.skipped++; continue; }
      const fields = sanitiseProductInput(raw);
      const qtyRaw = mode === 'invoice' ? raw.quantity : raw.on_hand;
      const hasQty = qtyRaw != null && String(qtyRaw).trim() !== '';
      const qty = hasQty ? Math.max(0, int(qtyRaw)) : null;
      const existing = matchProduct(doc, { upc: fields.upc, ndc: fields.ndc, name });

      if (existing) {
        // Update descriptive fields that the import actually provided
        const patch: any = {};
        for (const k of ['vendor', 'category', 'unit', 'upc', 'ndc'] as const) {
          if (fields[k]) patch[k] = fields[k];
        }
        if (mode === 'excel' && 'reorder_threshold' in raw && str(raw.reorder_threshold)) patch.reorder_threshold = fields.reorder_threshold;
        Object.assign(existing, patch);
        existing.last_updated = now();

        if (fields.cost_per_unit != null && fields.cost_per_unit > 0 && Math.abs(fields.cost_per_unit - existing.cost_per_unit) > 0.001) {
          const from = existing.cost_per_unit;
          existing.cost_per_unit = fields.cost_per_unit;
          log(doc, existing, 'price_change', 0, `Price changed: $${from.toFixed(2)} → $${fields.cost_per_unit.toFixed(2)} (${source})`, by);
          res.priceChanges++;
        }
        if (qty != null) {
          if (mode === 'invoice') {
            if (qty > 0) { existing.on_hand += qty; log(doc, existing, 'receive', qty, source, by); }
          } else {
            const change = qty - existing.on_hand;
            existing.on_hand = qty; existing.last_counted = now();
            log(doc, existing, 'count', change, source, by);
          }
        }
        res.updated++;
      } else {
        const t = now();
        const p: Product = {
          id: uid(), created_at: t, name,
          upc: fields.upc ?? null, ndc: fields.ndc ?? null, vendor: fields.vendor ?? null, category: fields.category ?? null,
          unit: fields.unit ?? 'each', cost_per_unit: fields.cost_per_unit ?? 0, reorder_threshold: fields.reorder_threshold ?? 10,
          on_hand: qty ?? 0, last_counted: mode === 'excel' && qty != null ? t : null, last_updated: t,
        };
        doc.products.push(p);
        log(doc, p, mode === 'invoice' ? 'receive' : 'created', p.on_hand, `New product — ${source}`, by);
        res.added++;
      }
    } catch (e: any) {
      res.skipped++;
      res.errors.push(`${str(raw?.name) || '(no name)'}: ${e?.message || 'error'}`);
    }
  }
  doc.products.sort((a, b) => a.name.localeCompare(b.name));
  return res;
}

// ── Settings ─────────────────────────────────────────────────────────
export function updateSettings(doc: DbDoc, patch: any) {
  if (patch.appPin != null) {
    if (!/^\d{4,8}$/.test(String(patch.appPin))) throw new BadRequest('App PIN must be 4–8 digits');
    doc.settings.appPin = String(patch.appPin);
  }
  if (patch.settingsPin != null) {
    if (!/^\d{4,8}$/.test(String(patch.settingsPin))) throw new BadRequest('Settings PIN must be 4–8 digits');
    doc.settings.settingsPin = String(patch.settingsPin);
  }
  if (Array.isArray(patch.staff)) {
    doc.settings.staff = [...new Set(patch.staff.map((s: unknown) => str(s)).filter(Boolean))].slice(0, 50) as string[];
  }
  return { staff: doc.settings.staff };
}

/** Public view of the document for staff devices (no PINs). */
export function publicState(doc: DbDoc) {
  return {
    products: doc.products,
    staff: doc.settings.staff,
    updatedAt: doc.updatedAt,
    transactionCount: doc.transactions.length,
  };
}
