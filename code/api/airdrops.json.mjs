// GET /api/airdrops.json — public JSON dump of every active airdrop entry.
//
// Read-only. CORS-open. 5-minute edge cache. Mirrors the same snapshot the
// MCP server consumes (api/_airdrops.json), so the JSON-API and JSON-RPC
// surfaces stay schema-locked: same fields, same sort order, same count.
//
// Schema is mirrored from src/content/config.ts. Per-entry shape:
//   slug, project, chain, blurb, action, effort, costFloor, deadline,
//   risk, officialUrl, twitter, addedOn, lastChecked, status, notes
//
// Response envelope:
//   { generatedAt, count, license, source, schemaVersion, entries: [...] }

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = JSON.parse(readFileSync(resolve(__dirname, '_airdrops.json'), 'utf-8'));

const PAYLOAD = JSON.stringify({
  generatedAt: SNAPSHOT.generatedAt,
  count: SNAPSHOT.count,
  schemaVersion: 1,
  license: 'CC0-1.0',
  source: 'https://web3-discover.vercel.app',
  mirror: 'https://github.com/SolvoHQ/web3-discover-data',
  entries: SNAPSHOT.entries,
});

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(PAYLOAD);
}
