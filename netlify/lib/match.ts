// Product identity + matching. Pure functions, shared by the server (ops.ts)
// and the app (src/lib/util.ts re-exports these), so "does this invoice line /
// scanned code belong to an existing product?" is answered the same way
// everywhere.
//
// Every product has THREE kinds of identifier:
//   • upc     – the manufacturer barcode (may be missing)
//   • ndc     – NDC / DIN (may be missing)
//   • sku     – SKYNET's own code, assigned automatically to EVERY product.
//               It is a real EAN-13 number in the 200… "in-store" range, so it
//               can be printed as a label and scanned like any other barcode.
//   • codes[] – extra codes that also mean this product: a second pack-size
//               barcode, a vendor's item number learned from an invoice, …

import type { Product } from './types';

export const cleanBarcode = (raw: unknown) => String(raw ?? '').replace(/[^0-9]/g, '');
/** Upper-case alphanumerics only — how every code is compared. */
export const normCode = (raw: unknown) => String(raw ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');

/**
 * Key used to compare two codes. Long all-digit codes lose their leading
 * zeros so a UPC-A read as EAN-13 ("0" + 12 digits) still matches.
 */
export function codeKey(raw: unknown): string {
  const n = normCode(raw);
  if (n.length >= 8 && /^\d+$/.test(n)) return n.replace(/^0+/, '');
  return n;
}

// ── SKYNET internal codes (EAN-13, prefix 200 = in-store use) ────────
const SKU_PREFIX = '200';

export function ean13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}
export function makeSku(seq: number): string {
  const body = SKU_PREFIX + String(Math.max(1, Math.floor(seq))).padStart(9, '0');
  return body + ean13CheckDigit(body);
}
export const isSku = (code: unknown) => /^200\d{10}$/.test(String(code ?? ''));
/** The short number staff see: "#0042" for 2000000000429 */
export function skuSeq(sku: unknown): number {
  const s = String(sku ?? '');
  return isSku(s) ? parseInt(s.slice(3, 12)) : 0;
}
export const skuLabel = (sku: unknown) => (skuSeq(sku) ? '#' + String(skuSeq(sku)).padStart(4, '0') : '');

/** Give every product without a SKU the next free one. Deterministic: oldest products first. */
export function assignSkus(products: Product[]): number {
  let max = 0;
  for (const p of products) max = Math.max(max, skuSeq(p.sku));
  const missing = products.filter(p => !isSku(p.sku)).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id));
  for (const p of missing) p.sku = makeSku(++max);
  return missing.length;
}

// ── Scanned-code interpretation ──────────────────────────────────────
/**
 * A scanner can hand us the same product in several shapes: UPC-A (12),
 * EAN-13 (13), GTIN-14, or a GS1 DataMatrix "(01)GTIN(17)expiry(10)lot" string.
 * Return every code worth looking up, most specific first.
 */
export function scanCandidates(raw: unknown): string[] {
  const out: string[] = [];
  const add = (c: string) => { if (c && !out.includes(c)) out.push(c); };
  const s = String(raw ?? '').trim();
  const norm = normCode(s);
  const digits = cleanBarcode(s);
  add(norm);
  add(digits);
  // GS1 element string: AI 01 + 14-digit GTIN
  const gs1 = s.replace(/[()\s]/g, '');
  if (/^01\d{14}/.test(gs1)) { const g = gs1.slice(2, 16); add(g); add(g.replace(/^0+/, '')); }
  if (digits.length === 14) add(digits.slice(1));
  if (digits.length === 13 && digits[0] === '0') add(digits.slice(1));
  if (digits.length === 12) add('0' + digits);
  return out;
}

/** All codes that identify a product, as comparison keys. */
export function productCodeKeys(p: Product): string[] {
  const keys = [p.upc, p.ndc, p.sku, ...(p.codes || [])].map(codeKey).filter(Boolean);
  return [...new Set(keys)];
}

/** Find a product by any scanned / typed code. Short numbers (≤ 6 digits) also match the SKYNET "#" number. */
export function findByCode(products: Product[], raw: unknown): Product | undefined {
  const cands = scanCandidates(raw).map(codeKey).filter(Boolean);
  if (!cands.length) return undefined;
  for (const c of cands) {
    const hit = products.find(p => productCodeKeys(p).includes(c));
    if (hit) return hit;
  }
  const short = cleanBarcode(raw);
  if (short && short.length <= 6) {
    const n = parseInt(short);
    const hit = products.find(p => skuSeq(p.sku) === n);
    if (hit) return hit;
  }
  return undefined;
}

// ── Name matching ────────────────────────────────────────────────────
const FILLER = new Set(['usp', 'bp', 'nf', 'ep', 'fcc', 'acs', 'the', 'of', 'and', 'grade', 'pharma', 'pharmaceutical', 'each', 'ea']);
const UNIT_ALIASES: Record<string, string> = { gram: 'g', grams: 'g', gm: 'g', gms: 'g', kilogram: 'kg', kilograms: 'kg', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml', litre: 'l', liter: 'l', litres: 'l', liters: 'l', milligram: 'mg', milligrams: 'mg', microgram: 'mcg', micrograms: 'mcg', ug: 'mcg', µg: 'mcg', capsules: 'caps', capsule: 'caps', cap: 'caps', tablets: 'tabs', tablet: 'tabs', tab: 'tabs', pct: '%', percent: '%' };

/** Normalised comparison key for a product name: "Lidocaine HCl USP, 100 g" ≡ "LIDOCAINE HCL 100G". */
export function nameKey(name: unknown): string {
  let s = String(name ?? '').toLowerCase();
  s = s.replace(/[®™]/g, ' ').replace(/(\d),(\d{3})/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/[^a-z0-9%.µ]+/g, ' ');
  s = s.replace(/(\d)\s+(g|kg|mg|mcg|ug|µg|ml|l|%|gm|gram|grams|oz|lb|caps?|tabs?|iu|mm|cm)(?![a-z])/g, '$1$2');
  const tokens = s.split(' ').map(t => t.replace(/\.$/, '')).map(t => UNIT_ALIASES[t] || t)
    .map(t => t.replace(/^(\d+(?:\.\d+)?)(gram|grams|gm)$/, '$1g').replace(/^(\d+(?:\.\d+)?)(ug|µg)$/, '$1mcg').replace(/^(\d+(?:\.\d+)?)(ml|l|g|kg|mg|mcg|%)$/, '$1$2'))
    .filter(t => t && !FILLER.has(t));
  return tokens.join(' ');
}

export const nameTokens = (name: unknown) => new Set(nameKey(name).split(' ').filter(Boolean));

/** 0–1 similarity of two product names (token Dice coefficient, numbers must agree). */
export function nameSimilarity(a: unknown, b: unknown): number {
  const ka = nameKey(a), kb = nameKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  const ta = new Set(ka.split(' ')), tb = new Set(kb.split(' '));
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  let score = (2 * common) / (ta.size + tb.size);
  // containment: "lidocaine 100g" inside "lidocaine hcl 100g"
  if (score < 0.9 && ka.length >= 6 && kb.length >= 6 && (ka.includes(kb) || kb.includes(ka))) score = Math.max(score, 0.85);
  // a different strength/size is a different product
  const na = [...ta].filter(t => /\d/.test(t)), nb = [...tb].filter(t => /\d/.test(t));
  if (na.length && nb.length && !na.some(t => nb.includes(t))) score *= 0.5;
  return Math.round(score * 100) / 100;
}

export interface MatchInput { upc?: unknown; ndc?: unknown; name?: unknown; item_code?: unknown; codes?: unknown; sku?: unknown }
export interface MatchResult { exact?: Product; how?: 'upc' | 'ndc' | 'sku' | 'code' | 'name'; candidates: { p: Product; score: number }[] }

/**
 * exact       – a match we trust without asking (same code, or same normalised name)
 * candidates  – similar names for a human to confirm; never merged automatically
 */
export function findMatches(products: Product[], item: MatchInput): MatchResult {
  // vendor item numbers are matched only when reasonably long (a bare "12" would collide)
  const tryCode = (raw: unknown, how: MatchResult['how']): MatchResult | null => {
    const k = codeKey(raw);
    if (!k || k.length < (how === 'code' ? 4 : 2)) return null;
    const p = products.find(x => productCodeKeys(x).includes(k));
    return p ? { exact: p, how, candidates: [] } : null;
  };
  const byCode = tryCode(item.upc, 'upc') || tryCode(item.sku, 'sku') || tryCode(item.ndc, 'ndc') || tryCode(item.item_code, 'code');
  if (byCode) return byCode;
  if (Array.isArray(item.codes)) for (const c of item.codes) { const r = tryCode(c, 'code'); if (r) return r; }

  const key = nameKey(item.name);
  if (!key) return { candidates: [] };
  const exact = products.find(p => nameKey(p.name) === key);
  if (exact) return { exact, how: 'name', candidates: [] };

  const candidates = products
    .map(p => ({ p, score: nameSimilarity(item.name, p.name) }))
    .filter(x => x.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  return { candidates };
}
