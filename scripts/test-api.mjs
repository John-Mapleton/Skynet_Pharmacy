// End-to-end API tests against the local dev server (no Netlify needed).
//   node scripts/test-api.mjs
import assert from 'node:assert/strict';
import { startServer } from './dev-api.mjs';

const { server, port, store } = await startServer({ port: 8799, env: {} });
const base = `http://localhost:${port}/api`;
const PIN = { 'x-skynet-pin': '1994' };
const ADMIN = { 'x-skynet-admin': '1984' };
const call = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
};
const op = (body, headers = PIN) => call('/op', { method: 'POST', body, headers });

let passed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name, '\n    ', e.message); process.exitCode = 1; } };

console.log('API tests');
await test('health is public', async () => { const r = await call('/health'); assert.equal(r.status, 200); assert.equal(r.body.storage, 'netlify-blobs'); });
await test('state requires PIN', async () => { assert.equal((await call('/state')).status, 401); });
await test('wrong PIN rejected', async () => { assert.equal((await call('/unlock', { method: 'POST', body: { pin: '0000' } })).status, 401); });
await test('default PIN unlocks', async () => { const r = await call('/unlock', { method: 'POST', body: { pin: '1994' } }); assert.equal(r.body.role, 'staff'); });
await test('fresh db is empty', async () => { const r = await call('/state', { headers: PIN }); assert.deepEqual(r.body.products, []); });

let lido;
await test('add product', async () => {
  const r = await op({ op: 'product.add', product: { name: 'Lidocaine 2%', upc: '0 12345-67890 5', cost_per_unit: '12.5', reorder_threshold: 5 }, by: 'John' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  lido = r.body.product;
  assert.equal(lido.upc, '0123456789 05'.replace(/\s/g, ''));
  assert.equal(lido.on_hand, 0);
  assert.equal(r.body.state.products.length, 1);
});
await test('duplicate barcode rejected', async () => {
  const r = await op({ op: 'product.add', product: { name: 'Other', upc: '012345678905' } });
  assert.equal(r.status, 400);
});
await test('blank name rejected', async () => { assert.equal((await op({ op: 'product.add', product: { name: '  ' } })).status, 400); });
await test('receive stock + price change', async () => {
  const r = await op({ op: 'stock.receive', id: lido.id, qty: 20, cost: '13.00', by: 'John' });
  assert.equal(r.body.product.on_hand, 20);
  assert.deepEqual(r.body.priceChange, { from: 12.5, to: 13 });
});
await test('use stock crosses threshold', async () => {
  const r = await op({ op: 'stock.use', id: lido.id, qty: 16, reason: 'Compounding' });
  assert.equal(r.body.product.on_hand, 4);
  assert.equal(r.body.crossedThreshold, true);
});
await test('cannot use more than on hand', async () => { assert.equal((await op({ op: 'stock.use', id: lido.id, qty: 99, reason: 'x' })).status, 400); });
await test('count sets absolute quantity', async () => {
  const r = await op({ op: 'stock.count', id: lido.id, qty: 7 });
  assert.equal(r.body.product.on_hand, 7);
  assert.equal(r.body.tx.quantity_change, 3);
  assert.ok(r.body.product.last_counted);
});
await test('transactions endpoint filters', async () => {
  const all = await call('/transactions?days=7', { headers: PIN });
  assert.equal(all.body.transactions.length, 5); // created, receive, price_change, adjustment, count
  const price = await call('/transactions?type=price_change', { headers: PIN });
  assert.equal(price.body.transactions.length, 1);
  assert.match(price.body.transactions[0].notes, /\$12\.50 → \$13\.00/);
});
await test('excel import: new + merge by name, on_hand = count', async () => {
  const r = await op({ op: 'import', mode: 'excel', items: [
    { name: 'lidocaine 2%', vendor: 'Medisca', on_hand: '30' },
    { name: 'Testosterone Cypionate', upc: '111', cost_per_unit: '$45.00', on_hand: 3, reorder_threshold: 2 },
    { name: '' },
  ] });
  assert.equal(r.body.added, 1); assert.equal(r.body.updated, 1); assert.equal(r.body.skipped, 1);
  const p = r.body.state.products.find(p => p.id === lido.id);
  assert.equal(p.on_hand, 30); assert.equal(p.vendor, 'Medisca');
});
await test('invoice import: adds quantity + price change', async () => {
  const r = await op({ op: 'import', mode: 'invoice', items: [{ name: 'Testosterone Cypionate', quantity: 5, unit_cost: 50 }, { upc: '111', name: 'ignored name', quantity: 1 }] });
  assert.equal(r.body.updated, 2);
  assert.equal(r.body.priceChanges, 1); // unit_cost 45 → 50 (invoice field name)
  const p = r.body.state.products.find(p => p.upc === '111');
  assert.equal(p.on_hand, 9); assert.equal(p.cost_per_unit, 50);
});
await test('update product with clash rejected', async () => {
  const r = await op({ op: 'product.update', id: lido.id, patch: { upc: '111' } });
  assert.equal(r.status, 400);
});
await test('settings need admin', async () => {
  assert.equal((await op({ op: 'settings.update', patch: { staff: ['A'] } })).status, 403);
  const r = await op({ op: 'settings.update', patch: { staff: ['Josée', 'Luella', 'Josée'], appPin: '2468' } }, ADMIN);
  assert.equal(r.status, 200); assert.deepEqual(r.body.staff, ['Josée', 'Luella']);
});
await test('old PIN now rejected, new PIN works', async () => {
  assert.equal((await call('/state', { headers: PIN })).status, 401);
  assert.equal((await call('/state', { headers: { 'x-skynet-pin': '2468' } })).status, 200);
  await op({ op: 'settings.update', patch: { appPin: '1994' } }, ADMIN);
});
await test('export strips PINs', async () => {
  const r = await call('/export', { headers: ADMIN });
  assert.equal(r.status, 200); assert.equal(r.body.settings.appPin, undefined); assert.equal(r.body.products.length, 2);
});
await test('daily backup was written', async () => {
  const r = await call('/backups', { headers: ADMIN });
  assert.equal(r.body.backups.length, 1);
});
await test('delete keeps history', async () => {
  const r = await op({ op: 'product.delete', id: lido.id });
  assert.equal(r.body.state.products.length, 1);
  const tx = await call(`/transactions?product_id=${lido.id}`, { headers: PIN });
  assert.ok(tx.body.transactions.length >= 5);
  assert.equal(tx.body.transactions[0].type, 'deleted');
});
await test('concurrent receives never lose updates', async () => {
  const r = await op({ op: 'product.add', product: { name: 'Race Cream', on_hand: 0 } });
  const id = r.body.product.id;
  const results = await Promise.all(Array.from({ length: 25 }, () => op({ op: 'stock.receive', id, qty: 1 })));
  assert.ok(results.every(x => x.status === 200), 'all writes succeeded: ' + results.map(x => x.status).join(','));
  const state = await call('/state', { headers: PIN });
  assert.equal(state.body.products.find(p => p.id === id).on_hand, 25);
});
await test('restore from backup (daily snapshot = state before first change)', async () => {
  const list = await call('/backups', { headers: ADMIN });
  const r = await op({ op: 'db.restoreBackup', date: list.body.backups[0] }, ADMIN);
  assert.equal(r.status, 200);
  assert.equal(r.body.state.products.length, 0); // snapshot was taken before anything was added today
  const after = await call('/backups', { headers: ADMIN });
  assert.equal(after.body.backups.length, 2); // + a pre-restore safety snapshot
  assert.match(after.body.backups[0], /restoreBackup$/);
  // and the safety snapshot brings everything back
  const back = await op({ op: 'db.restoreBackup', date: after.body.backups[0] }, ADMIN);
  assert.equal(back.body.state.products.length, 2);
});
await test('restore from file', async () => {
  const file = (await call('/export', { headers: ADMIN })).body;
  file.products.push({ id: 'zzz', name: 'Restored Item', on_hand: '4', cost_per_unit: 'x' });
  const r = await op({ op: 'db.restore', db: file }, ADMIN);
  assert.equal(r.status, 200);
  const p = r.body.state.products.find(p => p.id === 'zzz');
  assert.equal(p.on_hand, 4); assert.equal(p.cost_per_unit, 0); assert.equal(p.unit, 'each');
});
await test('unknown op', async () => { assert.equal((await op({ op: 'nope' })).status, 400); });
await test('primitive product / patch → clean 400', async () => {
  assert.equal((await op({ op: 'product.add', product: 'nope' })).status, 400);
  assert.equal((await op({ op: 'product.update', id: lido.id, patch: 5 })).status, 400);
  assert.equal((await op({ op: 'import', mode: 'excel', items: [null, 'x', { name: 'Ok Item' }] })).body.added, 1);
});
await test('restore rejects non-backup input', async () => {
  assert.equal((await op({ op: 'db.restore', db: 'garbage' }, ADMIN)).status, 400);
  assert.equal((await op({ op: 'db.restore', db: { products: [] } }, ADMIN)).status, 400);
  assert.equal((await op({ op: 'db.restoreBackup', date: '../db' }, ADMIN)).status, 400);
});
await test('restore of a malformed file cannot break later requests', async () => {
  const r = await op({ op: 'db.restore', db: { products: [{ name: 'Good One', on_hand: 2 }, { id: 'bad' }, 'junk', { name: '', id: 'x' }], transactions: [{ id: 't' }, 'z'] } }, ADMIN);
  assert.equal(r.status, 200); assert.equal(r.body.state.products.length, 1);
  assert.equal((await op({ op: 'product.add', product: { name: 'After Restore' } })).status, 200);
  assert.equal((await call('/transactions', { headers: PIN })).status, 200);
  const back = await call('/backups', { headers: ADMIN });
  const pre = back.body.backups.find(b => /restore$/.test(b));
  assert.ok(pre, 'pre-restore snapshot exists');
  await op({ op: 'db.restoreBackup', date: pre }, ADMIN);
});
await test('5 wrong PINs → locked for 60s, correct PIN also blocked, 429 not 401', async () => {
  await store.setJSON('auth', { failed: 0, lockedUntil: null }); // earlier tests sent bad PINs on purpose
  for (let i = 0; i < 5; i++) assert.equal((await call('/unlock', { method: 'POST', body: { pin: '0000' } })).status, 401);
  const r = await call('/unlock', { method: 'POST', body: { pin: '1994' } });
  assert.equal(r.status, 429); assert.match(r.body.error, /try again in \d+s/);
  await store.setJSON('auth', { failed: 0, lockedUntil: null }); // clear for remaining tests
});
await test('AI proxy reports missing key clearly', async () => { const r = await call('/claude', { method: 'POST', body: { messages: [] }, headers: PIN }); assert.equal(r.status, 503); });

// ── v5.1: identity, matching, alarms ──
console.log('\nIdentity & matching');
await op({ op: 'db.reset' }, ADMIN);
let cream, lipo;
await test('every product gets a SKYNET code (EAN-13, 200… prefix, valid check digit)', async () => {
  const r = await op({ op: 'product.add', product: { name: 'Versabase Cream 1 kg', vendor: 'PCCA' } });
  cream = r.body.product;
  assert.match(cream.sku, /^200\d{10}$/);
  const d = cream.sku.split('').map(Number);
  const sum = d.slice(0, 12).reduce((s, x, i) => s + x * (i % 2 ? 3 : 1), 0);
  assert.equal(d[12], (10 - sum % 10) % 10);
  const r2 = await op({ op: 'product.add', product: { name: 'Lipoderm Base 500 g', codes: 'PCCA-30-1234, 0777' } });
  lipo = r2.body.product;
  assert.notEqual(lipo.sku, cream.sku);
  assert.deepEqual(lipo.codes, ['PCCA301234', '0777']);
});
await test('legacy products (no sku) get one on restore', async () => {
  const file = (await call('/export', { headers: ADMIN })).body;
  file.products.push({ id: 'old1', name: 'Old Timer', on_hand: 1 });
  const r = await op({ op: 'db.restore', db: file }, ADMIN);
  const p = r.body.state.products.find(p => p.id === 'old1');
  assert.match(p.sku, /^200\d{10}$/);
  assert.equal(new Set(r.body.state.products.map(p => p.sku)).size, r.body.state.products.length, 'skus unique');
  await op({ op: 'product.delete', id: 'old1' });
});
await test('product.addCode: digits → UPC when empty, otherwise alias; clashes rejected', async () => {
  const r = await op({ op: 'product.addCode', id: cream.id, code: '0 62701-11111 8' });
  assert.equal(r.body.product.upc, '062701111118');
  const r2 = await op({ op: 'product.addCode', id: cream.id, code: 'med-55' });
  assert.deepEqual(r2.body.product.codes, ['MED55']);
  assert.equal((await op({ op: 'product.addCode', id: lipo.id, code: '062701111118' })).status, 400);
  assert.equal((await op({ op: 'product.add', product: { name: 'Another', codes: ['pcca 30 1234'] } })).status, 400);
});
await test('excel import learns a vendor item # and later matches on it alone', async () => {
  const r = await op({ op: 'import', mode: 'excel', items: [{ name: 'VERSABASE CREAM, 1KG', item_code: 'VB-1000', on_hand: 12 }] });
  assert.equal(r.body.updated, 1, JSON.stringify(r.body)); // matched by normalised name
  let p = r.body.state.products.find(p => p.id === cream.id);
  assert.equal(p.on_hand, 12); assert.ok(p.codes.includes('VB1000'));
  const r2 = await op({ op: 'import', mode: 'invoice', items: [{ name: 'completely different wording', item_code: 'vb 1000', quantity: 3, unit_cost: 61 }] });
  assert.equal(r2.body.updated, 1); assert.equal(r2.body.added, 0);
  p = r2.body.state.products.find(p => p.id === cream.id);
  assert.equal(p.on_hand, 15); assert.equal(p.cost_per_unit, 61);
});
await test('similar-but-different names are NOT merged silently; reviewer can link with product_id', async () => {
  const r = await op({ op: 'import', mode: 'invoice', items: [{ name: 'Lipoderm Base 500g Jar', quantity: 2, item_code: 'LD-500' }] });
  assert.equal(r.body.added, 1, JSON.stringify(r.body)); // "jar" makes it uncertain → new product, never a silent merge
  const stray = r.body.state.products.find(p => p.name === 'Lipoderm Base 500g Jar');
  await op({ op: 'product.delete', id: stray.id });
  const r2 = await op({ op: 'import', mode: 'invoice', items: [{ name: 'Lipoderm Base 500g Jar', quantity: 2, item_code: 'LD-500', product_id: lipo.id }] });
  assert.equal(r2.body.updated, 1); assert.equal(r2.body.lines[0].product_name, 'Lipoderm Base 500 g');
  const p = r2.body.state.products.find(p => p.id === lipo.id);
  assert.equal(p.on_hand, 2); assert.ok(p.codes.includes('LD500'));
  // and the next invoice from that vendor matches by item # with no help
  const r3 = await op({ op: 'import', mode: 'invoice', items: [{ name: 'LIPODERM 500G', quantity: 1, item_code: 'LD-500' }] });
  assert.equal(r3.body.updated, 1); assert.equal(r3.body.added, 0);
});
await test('invoice never overwrites an existing UPC with a misread one — it is kept as an extra code', async () => {
  const r = await op({ op: 'import', mode: 'invoice', items: [{ name: 'Versabase Cream 1 kg', upc: '999999999999', quantity: 1 }] });
  const p = r.body.state.products.find(p => p.id === cream.id);
  assert.equal(p.upc, '062701111118'); assert.ok(p.codes.includes('999999999999'));
});
await test('create:true forces a new product even when a similar one exists', async () => {
  const r = await op({ op: 'import', mode: 'invoice', items: [{ name: 'Versabase Cream 100 g', quantity: 4, create: true }] });
  assert.equal(r.body.added, 1);
  assert.equal(r.body.state.products.filter(p => /versabase/i.test(p.name)).length, 2);
});
await test('duplicate by normalised name rejected on add ("lidocaine hcl usp, 100g" ≡ "Lidocaine HCl 100 g")', async () => {
  await op({ op: 'product.add', product: { name: 'Lidocaine HCl 100 g' } });
  const r = await op({ op: 'product.add', product: { name: 'LIDOCAINE HCL USP, 100G' } });
  assert.equal(r.status, 400); assert.match(r.body.error, /already exists/);
});

console.log('\nLow-stock alarm');
await test('count DOWN to/below the reorder level raises the alarm (not just Use)', async () => {
  const r = await op({ op: 'product.add', product: { name: 'Alarm Test', reorder_threshold: 5, on_hand: 20 } });
  const id = r.body.product.id;
  let c = await op({ op: 'stock.count', id, qty: 15 });
  assert.equal(c.body.alarm, false); assert.equal(c.body.lowStock, false);
  c = await op({ op: 'stock.count', id, qty: 5 });
  assert.equal(c.body.alarm, true); assert.equal(c.body.crossedThreshold, true); assert.equal(c.body.lowStock, true);
  // already low and still going down → alarm again (previous behaviour only fired on the exact crossing)
  c = await op({ op: 'stock.use', id, qty: 2, reason: 'Compounding' });
  assert.equal(c.body.alarm, true); assert.equal(c.body.crossedThreshold, false);
  // re-counting the same low number is not a new event
  c = await op({ op: 'stock.count', id, qty: 3 });
  assert.equal(c.body.alarm, false); assert.equal(c.body.lowStock, true);
  // receiving above the level clears it
  c = await op({ op: 'stock.receive', id, qty: 10 });
  assert.equal(c.body.alarm, false); assert.equal(c.body.lowStock, false);
  await op({ op: 'product.delete', id });
});

// ── pure helpers (bundled from TS) ──
import { build as esbuild } from 'esbuild';
const helpersOut = path.resolve('scripts/.match.bundle.mjs');
await esbuild({ entryPoints: ['netlify/lib/match.ts'], bundle: true, format: 'esm', platform: 'neutral', outfile: helpersOut, logLevel: 'silent' });
const M = await import(helpersOut);
const labelOut = path.resolve('scripts/.label.bundle.mjs');
await esbuild({ entryPoints: ['src/lib/label.ts'], bundle: true, format: 'esm', platform: 'browser', outfile: labelOut, logLevel: 'silent' });
const Lb = await import(labelOut);
console.log('\nHelpers');
await test('nameKey normalises punctuation, case, units and filler', async () => {
  assert.equal(M.nameKey('Lidocaine HCl USP, 100 g'), M.nameKey('LIDOCAINE HCL 100G'));
  assert.equal(M.nameKey('Testosterone 1% Cream 30 mL'), M.nameKey('testosterone 1 % cream 30ml'));
  assert.notEqual(M.nameKey('Progesterone 100 g'), M.nameKey('Progesterone 500 g'));
});
await test('nameSimilarity: different strength/size scores low, extra word scores medium', async () => {
  assert.ok(M.nameSimilarity('Progesterone USP 100 g', 'Progesterone 500 g') < 0.6);
  const s = M.nameSimilarity('Lipoderm Base 500g Jar', 'Lipoderm Base 500 g');
  assert.ok(s >= 0.6 && s < 0.9, 'got ' + s);
});
await test('findByCode: UPC-A/EAN-13 forms, GS1 DataMatrix, SKYNET short number, aliases', async () => {
  const products = [
    { id: 'a', name: 'A', upc: '062701111118', ndc: null, sku: M.makeSku(7), codes: ['MED55'], created_at: '' },
    { id: 'b', name: 'B', upc: null, ndc: '02245678', sku: M.makeSku(8), codes: [], created_at: '' },
  ];
  assert.equal(M.findByCode(products, '0062701111118')?.id, 'a');   // EAN-13 form of a UPC-A
  assert.equal(M.findByCode(products, '(01)00062701111118(17)261231(10)LOT9')?.id, 'a'); // GS1
  assert.equal(M.findByCode(products, '0100062701111118172612311 0LOT9')?.id, 'a');
  assert.equal(M.findByCode(products, 'med-55')?.id, 'a');
  assert.equal(M.findByCode(products, M.makeSku(8))?.id, 'b');
  assert.equal(M.findByCode(products, '8')?.id, 'b');               // typed "#8"
  assert.equal(M.findByCode(products, '2245678')?.id, 'b');          // DIN without the leading zero
  assert.equal(M.findByCode(products, '12345'), undefined);
});
await test('EAN-13 label encoder produces 95 modules with correct guards', async () => {
  const bits = Lb.ean13Modules('2000000000017');
  assert.equal(bits.length, 95);
  assert.equal(bits.slice(0, 3), '101'); assert.equal(bits.slice(45, 50), '01010'); assert.equal(bits.slice(92), '101');
  assert.equal(Lb.ean13Modules('4006381333931').slice(3, 10), '0001101'); // first digit 4 → parity LGLLGG; digit "0" in L set
});
await test('EAN-13 known example encodes (4006381333931 → check digit 1)', async () => {
  assert.equal(M.ean13CheckDigit('400638133393'), '1');
  assert.ok(Lb.ean13Svg('4006381333931').includes('<svg'));
});
(await import('node:fs')).unlinkSync(helpersOut); (await import('node:fs')).unlinkSync(labelOut);

// ── AI proxy streaming, against a mock Anthropic server ──
import http from 'node:http';
import path from 'node:path';
import { build } from 'esbuild';
const mock = http.createServer(async (req, res) => {
  let raw = ''; for await (const c of req) raw += c;
  const body = JSON.parse(raw);
  if (req.headers['x-api-key'] !== 'sk-test') { res.writeHead(401, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'bad key' } })); }
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  const ev = (type, o) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...o })}\n\n`);
  ev('message_start', { message: { model: body.model } });
  ev('content_block_start', { index: 0 });
  ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: '[{"name":"Lido' } });
  await new Promise(r => setTimeout(r, 50));
  ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'caine","quantity":2}]' } });
  ev('message_delta', { delta: { stop_reason: 'end_turn' } });
  ev('message_stop', {});
  res.end();
});
await new Promise(r => mock.listen(8798, r));
const ai = await startServer({ port: 8797, env: { ANTHROPIC_API_KEY: 'sk-test', ANTHROPIC_BASE_URL: 'http://localhost:8798', ANTHROPIC_MODEL: 'test-model' } });
const outFile = path.resolve('scripts/.ai.bundle.mjs');
await build({ entryPoints: ['src/lib/ai.ts'], bundle: true, format: 'esm', platform: 'browser', outfile: outFile, logLevel: 'silent' });
const { readAnthropicStream } = await import(outFile);
await test('AI proxy streams SSE through and the client parser reassembles the text', async () => {
  const r = await fetch('http://localhost:8797/api/claude', { method: 'POST', headers: { 'content-type': 'application/json', ...PIN }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], max_tokens: 99999, model: 'ignored-client-model' }) });
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/event-stream/);
  const text = await readAnthropicStream(r.body);
  assert.equal(text, '[{"name":"Lidocaine","quantity":2}]');
});
await test('AI proxy requires the staff PIN', async () => {
  const r = await fetch('http://localhost:8797/api/claude', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) });
  assert.equal(r.status, 401);
});
mock.close(); ai.server.close(); (await import('node:fs')).unlinkSync(outFile);

server.close();
console.log(`\n${passed} passed${process.exitCode ? ' — FAILURES above' : ''}`);
