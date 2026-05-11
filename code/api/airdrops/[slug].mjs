// GET /api/airdrops/<slug>.json — single airdrop entry by slug.
// Returns 404 with { error, validSlugs } when slug is unknown.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = JSON.parse(readFileSync(resolve(__dirname, '..', '_airdrops.json'), 'utf-8'));
const BY_SLUG = new Map(SNAPSHOT.entries.map((e) => [e.slug, e]));
const SLUGS = SNAPSHOT.entries.map((e) => e.slug);

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

  // Vercel passes the dynamic segment via req.query.slug. Strip a trailing
  // ".json" if the route file's bracket name is consumed without the extension.
  let slug = req.query?.slug;
  if (Array.isArray(slug)) slug = slug[0];
  slug = String(slug || '').trim().replace(/\.json$/i, '');

  res.setHeader('content-type', 'application/json; charset=utf-8');

  if (!slug) {
    res.status(400).send(JSON.stringify({ error: 'slug is required' }));
    return;
  }

  const entry = BY_SLUG.get(slug);
  if (!entry) {
    res.setHeader('cache-control', 'public, max-age=60');
    res.status(404).send(
      JSON.stringify({
        error: `no airdrop with slug "${slug}"`,
        hint: 'GET /api/airdrops.json to discover valid slugs, or browse https://web3-discover.vercel.app/airdrops',
        validSlugs: SLUGS,
      }),
    );
    return;
  }

  res.setHeader('cache-control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(
    JSON.stringify({
      generatedAt: SNAPSHOT.generatedAt,
      schemaVersion: 1,
      license: 'CC0-1.0',
      source: 'https://web3-discover.vercel.app',
      entry,
    }),
  );
}
