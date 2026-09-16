# SKYNET — Mapleton Pharmacy Inventory (v5.1, self-contained)

A phone-first inventory app for the pharmacy. Scan barcodes, count stock, receive
deliveries, log what was used, import invoices with AI, and see what needs
reordering. Everything lives on the Netlify site itself — **no Supabase, no
database account, nothing to connect, nothing that pauses.**

## What changed in v5.1 (Sept 2026)

Three problems reported after launch, and what was done about each:

**1. Products with no barcode or DIN.** Every product now carries a **SKYNET
code** — a real EAN-13 number in the 200… "in-store" range (shown as `#0042`),
assigned automatically, including to products that already existed. Open the
product → **Print label** (or Products → "No barcode" filter → 🏷️ Labels) and
stick the sticker on the bin, shelf or jar; it scans like any barcode. You can
also just type `42` on the Scan tab, or use the new **Find it by name** search
under the scanner. A product can hold any number of *other codes* (a second
pack-size barcode, a vendor item number); when an unknown code is scanned, the
Scan tab offers **Link to an existing product** instead of only "add new".

**2. Invoices creating duplicate products.** Matching was exact-only, so
"LIDOCAINE HCL USP 100G" never matched "Lidocaine HCl 100 g". Now names are
normalised (case, punctuation, units, USP/BP), vendor **item numbers** are read
from the invoice and remembered, and the review screen shows for every line
whether it *matches*, *probably matches* (amber — confirm it), or is *new*, with
a **change** button to pick the right product or force a new one. Nothing
similar-but-different is ever merged silently. Each product's file has a
**From invoice** action that runs the same flow with that product's line
pre-selected. An AI-misread UPC never overwrites a real one.

**3. Low-stock alarm not firing.** It only fired on the exact crossing from
above to below the reorder level, only from the Use tab, and on iPhone/iPad the
sound was blocked because it played outside a tap. Now the alarm fires from
**Count, Use and the product file** whenever stock is at/below the reorder
level after going down, audio is primed during the tap, and the Dashboard tab
shows a red badge with the number of products needing attention.

Also: GS1 DataMatrix codes on pharma packs are understood (the GTIN inside is
matched), scanned codes may contain letters, and CSV export includes the codes.

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
- **Scan** – live camera / photo / type the code, or find it by name → enter the
  physical count. Unknown code → link it to an existing product, or add a new one.
- **Products** – search (name, any code, `#42`), filter Low/Out/No barcode,
  print labels; a product's file has Count / Receive / Use / From invoice /
  Print label plus its identifiers and history.
- **Receive** – add a delivery; optional new unit cost (price changes are logged).
- **Use** – compounding / dispensed / expired / damaged / sample / other.
  Dropping to or below the reorder level sets off the alarm.
- **Invoice** – PDF or photo → Claude extracts the lines → you confirm each
  match (or change it) → import. Vendor item numbers are learned for next time.
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
`GET /transactions`, `POST /op` (`product.add|update|delete|addCode`,
`stock.count|receive|use`, `import`, `settings.update`, `db.restore`,
`db.restoreBackup`, `db.reset`), `GET /export`, `GET /backups`, `POST /claude`.

## Developing locally

```bash
npm install
npm run dev        # Vite on :5173 + local API on :8788 (in-memory store, no Netlify needed)
npm test           # typecheck + 46 API/unit tests (matching, aliases, alarms, labels, concurrency, auth, AI proxy)
npm run build
node scripts/e2e.mjs   # browser walk-through of the built app (needs Playwright, see script header)
```

`DEV_DB=./skynet-dev.json npm run dev:api` keeps local data between runs.
`scripts/dev-api.mjs` mimics Netlify Blobs' conditional writes so the exact
same handler code runs locally and in production.
