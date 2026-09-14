// Thin client for the SKYNET API (netlify/functions/api.ts).
// The staff PIN is kept in sessionStorage after unlock and sent on every call.

import type { AppState, Transaction } from '../types';

const PIN_KEY = 'skynet_pin_session';
const ADMIN_KEY = 'skynet_admin_session';
const USER_KEY = 'skynet_user';

export class ApiError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}

export const session = {
  get pin() { try { return sessionStorage.getItem(PIN_KEY) || ''; } catch { return ''; } },
  set pin(v: string) { try { v ? sessionStorage.setItem(PIN_KEY, v) : sessionStorage.removeItem(PIN_KEY); } catch {} },
  get adminPin() { try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; } },
  set adminPin(v: string) { try { v ? sessionStorage.setItem(ADMIN_KEY, v) : sessionStorage.removeItem(ADMIN_KEY); } catch {} },
  get user() { try { return localStorage.getItem(USER_KEY) || ''; } catch { return ''; } },
  set user(v: string) { try { v ? localStorage.setItem(USER_KEY, v) : localStorage.removeItem(USER_KEY); } catch {} },
};

// Fired when the server says our PIN is no longer valid (changed on another device)
export const onLocked: { handler: (() => void) | null } = { handler: null };

async function request<T = any>(path: string, init: RequestInit = {}, opts: { admin?: boolean; raw?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as any) };
  if (init.body) headers['content-type'] = 'application/json';
  if (session.pin) headers['x-skynet-pin'] = session.pin;
  if (opts.admin && session.adminPin) headers['x-skynet-admin'] = session.adminPin;

  let res: Response;
  try {
    res = await fetch('/api' + path, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new ApiError('No connection — check Wi-Fi and try again', 0);
  }
  if (res.status === 401 && path !== '/unlock') {
    session.pin = '';
    onLocked.handler?.();
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text.slice(0, 200) }; }
  if (!res.ok) throw new ApiError(data?.error || `Server error ${res.status}`, res.status);
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean; ai: boolean; model: string; storage: string }>('/health'),

  unlock: async (pin: string, admin = false) => {
    const r = await request<{ ok: boolean; role: string; staff?: string[] }>('/unlock', { method: 'POST', body: JSON.stringify({ pin, admin }) });
    if (admin) session.adminPin = pin; else session.pin = pin;
    return r;
  },

  state: () => request<AppState>('/state'),

  transactions: (q: { product_id?: string; type?: string; days?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return request<{ transactions: Transaction[] }>('/transactions?' + params.toString());
  },

  /** Every write goes through here. Returns the op result + the fresh state. */
  op: <T = any>(body: Record<string, unknown>, admin = false) =>
    request<T & { state: AppState }>('/op', { method: 'POST', body: JSON.stringify({ by: session.user || 'Staff', ...body }) }, { admin }),

  export: () => request<any>('/export', {}, { admin: true }),
  backups: () => request<{ backups: string[]; lastBackupDate: string | null }>('/backups', {}, { admin: true }),

  /** Streams the Anthropic response through the server proxy. Returns the raw Response. */
  claudeStream: async (messages: any[], max_tokens = 1000): Promise<Response> => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (session.pin) headers['x-skynet-pin'] = session.pin;
    let res: Response;
    try { res = await fetch('/api/claude', { method: 'POST', headers, body: JSON.stringify({ messages, max_tokens }) }); }
    catch { throw new ApiError('No connection — check Wi-Fi and try again', 0); }
    if (res.status === 401) { session.pin = ''; onLocked.handler?.(); }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data?.error || `AI error ${res.status}`, res.status);
    }
    return res;
  },
};
