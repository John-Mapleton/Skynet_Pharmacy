// Local API server for development/testing WITHOUT Netlify.
// Uses an in-memory (optionally file-backed) blob store that mimics the
// Netlify Blobs conditional-write semantics.
//
//   node scripts/dev-api.mjs            → http://localhost:8788/api/health
//   DEV_DB=./skynet-dev.json node ...   → persist to a file between runs
//
// `npm run dev` starts this together with Vite (which proxies /api here).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(here, '.handler.bundle.mjs');
await build({
  entryPoints: [path.join(here, '../netlify/lib/handler.ts')],
  bundle: true, format: 'esm', platform: 'node', target: 'node22', outfile: outFile, logLevel: 'silent',
});
const { createHandler } = await import(outFile + '?t=' + Date.now());

// ── In-memory store with etag + onlyIfMatch/onlyIfNew, like Netlify Blobs ──
export function memoryStore(file) {
  let data = new Map();
  if (file && fs.existsSync(file)) {
    for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) data.set(k, v);
  }
  const persist = () => { if (file) fs.writeFileSync(file, JSON.stringify(Object.fromEntries(data), null, 1)); };
  let etagCounter = 1;
  return {
    async getWithMetadata(key) {
      const e = data.get(key);
      return e ? { data: JSON.parse(e.body), etag: e.etag } : null;
    },
    async setJSON(key, value, opts = {}) {
      const cur = data.get(key);
      if (opts.onlyIfNew && cur) return { modified: false };
      if (opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
      const etag = 'W/"' + (etagCounter++) + '"';
      data.set(key, { body: JSON.stringify(value), etag });
      persist();
      return { modified: true, etag };
    },
    async list({ prefix = '' } = {}) {
      return { blobs: [...data.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key, etag: data.get(key).etag })) };
    },
    async delete(key) { data.delete(key); persist(); },
    _dump() { return Object.fromEntries([...data].map(([k, v]) => [k, JSON.parse(v.body)])); },
  };
}

export function startServer({ port = 8788, file = process.env.DEV_DB, env = process.env } = {}) {
  const store = memoryStore(file);
  const handle = createHandler(() => store, { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY, ANTHROPIC_MODEL: env.ANTHROPIC_MODEL, ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL });
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const request = new Request(`http://localhost:${port}${req.url}`, {
      method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (!response.body) return res.end();
    for await (const chunk of response.body) res.write(chunk); // stream through, like Netlify does
    res.end();
  });
  return new Promise(resolve => server.listen(port, () => resolve({ server, store, port })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { port } = await startServer();
  console.log(`SKYNET dev API → http://localhost:${port}/api/health` + (process.env.DEV_DB ? ` (db: ${process.env.DEV_DB})` : ' (in-memory)'));
}
