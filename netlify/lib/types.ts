// Shared data types for the SKYNET database document.
// The whole inventory lives in ONE JSON document stored in Netlify Blobs.
// It is small (a pharmacy has hundreds of products, not millions), so
// read-modify-write of the whole document is simple, fast and safe when
// combined with the conditional (etag) writes in store.ts.

export type TxType = 'count' | 'receive' | 'adjustment' | 'price_change' | 'created' | 'deleted' | 'restore';

export interface Product {
  id: string;
  created_at: string;
  name: string;
  upc: string | null;      // manufacturer barcode (optional)
  ndc: string | null;      // NDC / DIN (optional)
  sku: string;             // SKYNET code — EAN-13 in the 200… in-store range, assigned automatically to every product
  codes: string[];         // extra codes that also identify this product (other pack-size barcodes, vendor item numbers)
  vendor: string | null;
  category: string | null;
  unit: string;
  cost_per_unit: number;
  reorder_threshold: number;
  on_hand: number;
  last_counted: string | null;
  last_updated: string;
}

export interface Transaction {
  id: string;
  created_at: string;
  product_id: string;
  product_name: string; // denormalised so history survives product deletion
  type: TxType;
  quantity_change: number;
  new_quantity: number;
  notes: string;
  performed_by: string;
}

export interface Settings {
  appPin: string;      // staff PIN to open the app
  settingsPin: string; // admin PIN for the Settings tab
  staff: string[];     // optional list of names for "who's working" (audit trail)
}

export interface DbDoc {
  schema: 1;
  products: Product[];
  transactions: Transaction[];
  settings: Settings;
  createdAt: string;
  updatedAt: string;
  lastBackupDate: string | null; // YYYY-MM-DD of the most recent automatic snapshot
}

export const DEFAULT_APP_PIN = '1994';
export const DEFAULT_SETTINGS_PIN = '1984';
export const MAX_TRANSACTIONS = 5000;
export const MAX_BACKUPS = 30;

export function emptyDb(now = new Date().toISOString()): DbDoc {
  return {
    schema: 1,
    products: [],
    transactions: [],
    settings: { appPin: DEFAULT_APP_PIN, settingsPin: DEFAULT_SETTINGS_PIN, staff: [] },
    createdAt: now,
    updatedAt: now,
    lastBackupDate: null,
  };
}
