export type { Product, Transaction, TxType } from '../netlify/lib/types';
import type { Product } from '../netlify/lib/types';

export type StockStatus = 'a' | 'w' | 'd'; // ok / low (warn) / out (danger)
export type ToastType = 'success' | 'error' | 'info';
export type ShowToast = (msg: string, type?: ToastType) => void;

export interface AppState {
  products: Product[];
  staff: string[];
  updatedAt: string;
  transactionCount: number;
}

export interface TabProps {
  products: Product[];
  refresh: () => Promise<void>;
  applyState: (s: AppState) => void;
  showToast: ShowToast;
  setTab: (t: string) => void;
  user: string;
}
