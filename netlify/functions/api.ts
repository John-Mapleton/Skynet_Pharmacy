// SKYNET API — runs as a Netlify Function, stores everything in Netlify Blobs.
// No external database, no connection strings, nothing that can be "paused".
//
// Reached at /api/* (see netlify.toml redirect) — e.g. GET /api/health

import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
import { createHandler } from '../lib/handler';

const handler = createHandler(
  // Site-wide store (survives every deploy). Strong consistency so a write on
  // one iPad is visible to the next read from another device immediately.
  () => getStore({ name: 'skynet', consistency: 'strong' }),
  {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  },
);

export default async (req: Request, _context: Context) => handler(req);
