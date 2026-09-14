// Browser walk-through of the built app against the local dev API.
//   npm run build && node scripts/e2e.mjs
// Uses Playwright from the scratchpad (see notes in README).
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pwDir = process.env.PW_DIR || '/tmp/claude-0/-home-claude/818122f2-52a3-5b90-924f-95500c5f27a4/scratchpad';
const require = createRequire(path.join(pwDir, 'package.json'));
const { chromium } = require('playwright');
const shots = path.join(pwDir, 'shots'); fs.mkdirSync(shots, { recursive: true });

const { startServer } = await import('./dev-api.mjs');
const { server } = await startServer({ port: 8788, env: {} });
const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'pipe' });
await new Promise(r => setTimeout(r, 2500));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('dialog', d => d.accept('DELETE'));

const shot = (n) => page.screenshot({ path: path.join(shots, n + '.png') });
const tab = (label) => page.locator('.nav .nb', { hasText: label }).click();
const toast = async (re) => { await page.locator('.toast', { hasText: re }).first().waitFor({ timeout: 8000 }); };
let step = 0; const ok = (m) => console.log(`  ✓ ${++step}. ${m}`);

try {
  await page.goto('http://localhost:4173/');
  await page.locator('.pin-screen').waitFor();
  await shot('01-pin');
  for (const k of '1111') await page.locator('.key', { hasText: k }).first().click();
  await page.locator('.pin-err', { hasText: 'Incorrect' }).waitFor();
  ok('wrong PIN rejected');
  await page.waitForTimeout(800);
  for (const k of '1994') await page.locator('.key', { hasText: k }).first().click();
  await page.locator('.greet-title').waitFor();
  await shot('02-dashboard-empty');
  ok('unlocked with default PIN → empty dashboard');

  // Add product
  await tab('Products');
  await page.locator('button', { hasText: '+ Add' }).click();
  await page.locator('.modal input.inp').first().fill('Lidocaine 2% 50 mL');
  await page.locator('.field-box input').nth(0).fill('5');
  await page.locator('.field-box input').nth(1).fill('12.50');
  await page.locator('.modal').getByPlaceholder('Scan or type').fill('012345678905');
  await page.locator('.modal').getByPlaceholder('e.g. Medisca').fill('Medisca');
  await shot('03-add-product');
  await page.locator('.modal button', { hasText: '✓ Add product' }).click();
  await toast(/added/);
  await page.locator('.row-title', { hasText: 'Lidocaine' }).waitFor();
  ok('product added');

  // Duplicate rejected
  await page.locator('button', { hasText: '+ Add' }).click();
  await page.locator('.modal input.inp').first().fill('lidocaine 2% 50 ml');
  await page.locator('.modal button', { hasText: '✓ Add product' }).click();
  await toast(/already exists/);
  await page.keyboard.press('Escape');
  ok('duplicate name rejected with a clear message');

  // Receive
  await tab('Receive');
  await page.locator('.row', { hasText: 'Lidocaine' }).click();
  await page.getByPlaceholder('How many?').fill('20');
  await page.locator('input[placeholder^="Current"]').fill('13');
  await page.locator('.notice', { hasText: 'Price increase' }).waitFor();
  await shot('04-receive');
  await page.locator('button', { hasText: '+ Receive stock' }).click();
  await toast(/\+20 received.*now 20.*price/);
  ok('received 20 with price change');

  // Use → crosses threshold → skull alarm
  await tab('Use');
  await page.locator('.row', { hasText: 'Lidocaine' }).click();
  await page.locator('.chip', { hasText: 'Expired' }).click();
  await page.getByPlaceholder('How many?').fill('16');
  await page.locator('button', { hasText: '− Use stock' }).click();
  await page.locator('.skull-overlay').waitFor();
  await shot('05-skull-alarm');
  await page.locator('.skull-modal button').click();
  ok('use 16 → reorder alarm fired (4 left, threshold 5)');

  // Over-use blocked
  await page.locator('.row', { hasText: 'Lidocaine' }).click();
  await page.getByPlaceholder('How many?').fill('99');
  await page.locator('.notice.err', { hasText: 'Only 4 in stock' }).waitFor();
  await page.locator('button', { hasText: 'Back' }).click();
  ok('over-use blocked client-side');

  // Dashboard shows alert
  await tab('Dashboard');
  await page.locator('.alert-row', { hasText: 'Lidocaine' }).waitFor();
  await page.locator('.stat.warn .stat-val', { hasText: '1' }).waitFor();
  await shot('06-dashboard-alert');
  ok('dashboard shows low-stock alert');

  // Scan → manual code → count
  await tab('Scan');
  await page.locator('button', { hasText: 'Type the code' }).click();
  await page.getByPlaceholder('Enter barcode digits').fill('0 12345-67890 5');
  await page.locator('button', { hasText: 'Look up' }).click();
  await page.locator('.res-name', { hasText: 'Lidocaine' }).waitFor();
  await page.getByPlaceholder('Enter count').fill('7');
  await page.locator('.hint', { hasText: 'Change: +3' }).waitFor();
  await shot('07-scan-count');
  await page.locator('button', { hasText: 'Save count' }).click();
  await toast(/Count saved/);
  ok('manual barcode lookup + count saved (change +3)');

  // Unknown barcode → quick add
  await page.locator('button', { hasText: 'Type the code' }).click();
  await page.getByPlaceholder('Enter barcode digits').fill('999999');
  await page.locator('button', { hasText: 'Look up' }).click();
  await page.locator('.res-name', { hasText: 'not found' }).waitFor();
  await page.locator('button', { hasText: 'Add this product now' }).click();
  await page.locator('.modal input.inp').first().fill('Progesterone USP 100 g');
  await page.locator('.modal button', { hasText: '✓ Add product' }).click();
  await toast(/added/);
  await page.locator('.res-name', { hasText: 'Progesterone' }).waitFor();
  ok('unknown barcode → quick add → ready to count');

  // Spreadsheet import (real xlsx)
  const XLSX = require(path.join(root, 'node_modules/xlsx'));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Product', 'UPC', 'Supplier', 'Unit Cost', 'On Hand', 'Reorder'],
    ['Lidocaine 2% 50 mL', '012345678905', 'Medisca', 14, 30, 5],
    ['Estradiol Base 25 g', '', 'PCCA', '$210.00', 2, 1],
    ['Versabase Cream 1 kg', '4444', 'PCCA', 55, 0, 2],
    ['', '', '', '', '', ''],
  ]), 'Inventory');
  const xlsxPath = path.join(pwDir, 'test-import.xlsx');
  XLSX.writeFile(wb, xlsxPath);
  await tab('Import');
  await page.locator('input[type=file]').setInputFiles(xlsxPath);
  await page.locator('text=Found 3 rows').waitFor();
  const sel = (label) => page.locator(`.ig:has(label:text-is("${label}")) select`);
  assert.equal(await sel('Product name *').inputValue(), 'Product');
  assert.equal(await sel('On hand quantity').inputValue(), 'On Hand');
  assert.equal(await sel('Vendor').inputValue(), 'Supplier');
  await shot('08-import-map');
  await page.locator('button', { hasText: 'Import 3 rows' }).click();
  await page.locator('text=Import complete').waitFor();
  await page.locator('text=2 new products added').waitFor();
  await page.locator('text=1 existing product updated').waitFor();
  await page.locator('text=1 price change').waitFor();
  await shot('09-import-done');
  ok('xlsx import: columns auto-mapped, 2 added / 1 merged / price change detected');

  // Products list reflects import
  await tab('Products');
  await page.locator('.row', { hasText: 'Lidocaine' }).locator('.row-qty', { hasText: '30' }).waitFor();
  await page.locator('.chip', { hasText: 'Out' }).click();
  await page.locator('.row', { hasText: 'Versabase' }).waitFor();
  assert.equal(await page.locator('.card-row .row').count(), 2); // Versabase + Progesterone
  await page.locator('.chip', { hasText: 'All' }).click();
  ok('products filter chips work');

  // Detail + history + edit
  await page.locator('.row', { hasText: 'Lidocaine' }).click();
  await page.locator('.btn-link', { hasText: 'Show recent history' }).click();
  await page.locator('.tx.count').first().waitFor();
  await shot('10-product-detail');
  await page.locator('.modal button', { hasText: 'Edit' }).click();
  await page.locator('.field-box input').nth(0).fill('8');
  await page.locator('.modal button', { hasText: '✓ Save changes' }).click();
  await toast(/updated/);
  ok('product detail, history and edit');

  // Reports
  await tab('Reports');
  await page.locator('.stat-lbl', { hasText: 'Inventory value' }).waitFor();
  await page.locator('.tx.price_change').first().waitFor();
  await shot('11-reports-overview');
  await page.locator('.seg button', { hasText: 'Reorder' }).click();
  await page.locator('.alert-row', { hasText: 'Versabase' }).waitFor();
  await shot('12-reports-reorder');
  await page.locator('.seg button', { hasText: 'Audit' }).click();
  await page.locator('.tx').first().waitFor();
  const n = await page.locator('.tx').count();
  assert.ok(n >= 8, 'audit log has entries: ' + n);
  await shot('13-reports-audit');
  ok(`reports: overview, reorder list, audit log (${n} entries)`);

  // Settings (admin PIN) + staff + app PIN change
  await tab('Settings');
  for (const k of '1984') await page.locator('.key', { hasText: k }).first().click();
  await page.locator('text=Built into this site').waitFor();
  await page.locator('text=AI not set up yet').waitFor();
  await shot('14-settings');
  await page.locator('textarea').fill('John, Brad');
  await page.locator('button', { hasText: 'Save staff list' }).click();
  await toast(/Staff list saved/);
  await page.locator('.modal', { hasText: "Who's working" }).waitFor();
  await page.locator('.modal .chip', { hasText: 'Brad' }).click();
  await page.locator('.hdr-user', { hasText: 'Brad' }).waitFor();
  ok('staff list saved → user picker → header shows Brad');

  const pinInputs = page.locator('.card', { hasText: 'App PIN' }).locator('input');
  await pinInputs.nth(0).fill('2468'); await pinInputs.nth(1).fill('2468');
  await page.locator('button', { hasText: 'Update app PIN' }).click();
  await toast(/App PIN updated/);
  ok('app PIN changed');

  // Backup download
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'Download full backup' }).click()]);
  const backupPath = path.join(pwDir, 'backup.json');
  await dl.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  assert.equal(backup.products.length, 4);
  assert.equal(backup.settings.appPin, undefined);
  ok('backup downloaded (4 products, no PINs)');

  // Audit trail carries the user's name
  await tab('Receive');
  await page.locator('.row', { hasText: 'Versabase' }).click();
  await page.getByPlaceholder('How many?').fill('3');
  await page.locator('button', { hasText: '+ Receive stock' }).click();
  await toast(/\+3 received/);
  await tab('Reports'); await page.locator('.seg button', { hasText: 'Audit' }).click();
  await page.locator('.tx.receive', { hasText: 'Brad' }).first().waitFor();
  ok('receive recorded under "Brad"');

  // Lock → new PIN required
  await page.locator('.hdr-btn[title="Lock app"]').click();
  await page.locator('.pin-screen').waitFor();
  for (const k of '1994') await page.locator('.key', { hasText: k }).first().click();
  await page.locator('.pin-err', { hasText: 'Incorrect' }).waitFor();
  await page.waitForTimeout(800);
  for (const k of '2468') await page.locator('.key', { hasText: k }).first().click();
  await page.locator('.greet-title').waitFor();
  await shot('15-dashboard-final');
  ok('lock → old PIN rejected, new PIN works');

  // Second device sees the same data instantly
  const page2 = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page2.goto('http://localhost:4173/');
  for (const k of '2468') await page2.locator('.key', { hasText: k }).first().click();
  await page2.locator('.hdr-sub', { hasText: '4 products' }).waitFor();
  ok('second device: same PIN, same 4 products, zero setup');

  // Stale-session handling: change PIN from device 2, device 1 gets locked out on next call
  await page2.locator('.modal .chip', { hasText: 'John' }).click();
  await page2.locator('.nav .nb', { hasText: 'Settings' }).click();
  for (const k of '1984') await page2.locator('.key', { hasText: k }).first().click();
  const p2 = page2.locator('.card', { hasText: 'App PIN' }).locator('input');
  await p2.nth(0).fill('1994'); await p2.nth(1).fill('1994');
  await page2.locator('button', { hasText: 'Update app PIN' }).click();
  await page2.locator('.toast', { hasText: 'App PIN updated' }).waitFor();
  await page.locator('.hdr-btn[title="Refresh"]').click();
  await page.locator('.pin-screen').waitFor({ timeout: 8000 });
  ok('device 1 is sent back to the PIN screen after device 2 changed the PIN');

  const realErrors = errors.filter(e => !/favicon|manifest|404|ERR_TUNNEL|status of 40[01]/.test(e));
  assert.deepEqual(realErrors, [], 'no console/page errors');
  ok('no console or page errors during the whole run');
  console.log('\nE2E PASSED');
} catch (e) {
  await shot('FAIL');
  console.error('\nE2E FAILED at step', step + 1, '\n', e);
  if (errors.length) console.error('browser errors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close(); preview.kill(); server.close();
}
