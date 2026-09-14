# SKYNET — Mapleton Pharmacy Inventory (v5, self-contained)

A phone-first inventory app for the pharmacy. Scan barcodes, count stock, receive
deliveries, log what was used, import invoices with AI, and see what needs
reordering. Everything lives on the Netlify site itself — **no Supabase, no
database account, nothing to connect, nothing that pauses.**

## What changed in v5

| v4 | v5 |
|---|---|
| Supabase free-tier database (paused after 7 idle days; every device needed the URL + key pasted in or a magic link) | Data stored in **Netlify Blobs**, built into the same site. Open the address, enter the PIN, done. |
| Each device did its own "read, then write" — two iPads receiving at once could overwrite each other | Every change is a single server-side operation applied against the latest data, with conflict detection and retry. 25 simultaneous receives land as exactly 25. |
| PINs stored per device in the browser | PINs stored centrally. Change the app PIN once → every device uses the new one. |
| Deleting a product deleted its history | History is kept (with the product's name) so the audit log stays complete. |
| No backups | Automatic daily snapshot (30 kept) + one-tap JSON backup/restore + CSV export. |
| Live camera scan only on Chrome/Android | Live scan on iPhone too (ZXing decoder bundled), photo scan tries the local decoder first and only asks Claude if needed. |
| Spreadsheet re-import created duplicates | Rows are matched by barcode / NDC / name and updated instead. |
| "Unit Cost" column could land in the Unit field | Smarter column detection. |
| Several colours referenced CSS variables that didn't exist (error boxes, price badges rendered plain) | Fixed. Bottom nav no longer covers the buttons at the bottom of a sheet. |
| One 3,700-line file | Split into small modules (`src/lib`, `src/components`, `src/tabs`, `netlify/lib`). |

Also new: reorder list grouped by vendor (copy → paste into an email), optional
staff names on the audit trail, value by category, "who's working" picker,
home-screen icon / PWA manifest, offline banner, background refresh so other
devices' changes appear within 30 s.

## Deploying (one time)

1. Put these files in the GitHub repo (`John-Mapleton/Skynet_Pharmacy`, `main`
   branch) — replacing the old ones. Netlify auto-deploys.
2. In Netlify → **Site configuration → Environment variables** add
   `ANTHROPIC_API_KEY` (only needed for AI invoice reading and the photo
   barcode fallback — everything else works without it). Then
   **Deploys → Trigger deploy**.
3. Open the site. Default app PIN is **1994**, default Settings PIN **1984** —
   change both in Settings on first use.

Build settings are in `netlify.toml` (build `vite build`, publish `dist`,
Node 22). Nothing else to configure.

## Using it

- **Dashboard** – stock value, low/out counts, alerts, "copy order list".
- **Scan** – live camera / photo / type the code → enter the physical count.
  Unknown barcode → add the product on the spot.
- **Products** – search, filter Low/Out, add/edit/delete, per-product history.
- **Receive** – add a delivery; optional new unit cost (price changes are logged).
- **Use** – compounding / dispensed / expired / damaged / sample / other.
  Crossing the reorder level sets off the alarm.
- **Invoice** – PDF or photo → Claude extracts the lines → you review/fix → import.
- **Import** – .xlsx/.csv with any column names; auto-mapped, re-import safe.
- **Reports** – overview, reorder list by vendor, per-product history, audit log,
  CSV exports.
- **Settings** (admin PIN) – PINs, staff names, backup/restore, snapshots, AI status.

## Where the data lives

One JSON document (`db`) in the Netlify Blobs store `skynet` on this site,
plus daily snapshots under `backup/YYYY-MM-DD`. The function
`netlify/functions/api.ts` is the only thing that reads or writes it. Reads use
strong consistency; writes are conditional on the document's ETag and retried
on conflict (`netlify/lib/store.ts`).

API (all under `/api`, staff PIN in header `x-skynet-pin`, admin PIN in
`x-skynet-admin`): `GET /health`, `POST /unlock`, `GET /state`,
`GET /transactions`, `POST /op` (`product.add|update|delete`,
`stock.count|receive|use`, `import`, `settings.update`, `db.restore`,
`db.restoreBackup`, `db.reset`), `GET /export`, `GET /backups`, `POST /claude`.

## Developing locally

```bash
npm install
npm run dev        # Vite on :5173 + local API on :8788 (in-memory store, no Netlify needed)
npm test           # typecheck + 32 API tests (concurrency, auth lockout, streaming AI proxy)
npm run build
node scripts/e2e.mjs   # browser walk-through of the built app (needs Playwright, see script header)
```

`DEV_DB=./skynet-dev.json npm run dev:api` keeps local data between runs.
`scripts/dev-api.mjs` mimics Netlify Blobs' conditional writes so the exact
same handler code runs locally and in production.
