#!/usr/bin/env node
// Post one airdrop entry to the owned Mastodon channel.
//
// Usage:
//   node scripts/post-mastodon.mjs <slug>          # post a single entry
//   node scripts/post-mastodon.mjs --backfill N    # post the N nearest-deadline verified entries
//   node scripts/post-mastodon.mjs --dry-run <slug>
//
// Reads MASTODON_INSTANCE + MASTODON_ACCESS_TOKEN from .solvo/secrets.env.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(ROOT, '..');
const SITE = 'https://web3-discover.vercel.app';

function loadEnv() {
  const env = { ...process.env };
  const p = path.join(WORKSPACE, '.solvo/secrets.env');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      fm[key] = kv[2].trim();
    }
  }
  return fm;
}

function loadEntry(slug) {
  const p = path.join(ROOT, 'src/content/airdrops', `${slug}.md`);
  if (!fs.existsSync(p)) throw new Error(`No entry: ${slug}`);
  const text = fs.readFileSync(p, 'utf8');
  const fm = parseFrontmatter(text);
  return { slug, ...fm };
}

function listAllEntries() {
  const dir = path.join(ROOT, 'src/content/airdrops');
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => loadEntry(f.replace(/\.md$/, '')));
}

const CHAIN_TAG = {
  'Arbitrum One + Nova + Orbit': 'Arbitrum',
  'Optimism / OP Stack': 'Optimism',
  'Solana': 'Solana',
  'Ethereum': 'Ethereum',
  'BNB Chain + multi-chain perps': 'BNB',
  'Hyperliquid': 'Hyperliquid',
  'MegaETH (Ethereum L2)': 'MegaETH',
  'Plume (Ethereum L2 RWA)': 'Plume',
  'Sui': 'Sui',
  'Sonic (Fantom rebrand)': 'Sonic',
  'Starknet (Ethereum L2)': 'Starknet',
  'OP Mainnet + Superchain': 'Optimism',
  'Ethereum (Sahara Chain pending)': 'SaharaAI',
  'Multi-chain (Solana / Ethereum / EVM L2s)': 'Wormhole',
};

const RISK_PREFIX = {
  verified: '✅',
  caution: '⚠️',
  scam: '🚫',
};

function chainTag(chain) {
  if (!chain) return null;
  if (CHAIN_TAG[chain]) return CHAIN_TAG[chain];
  return chain.split(/[\s/(]/)[0].replace(/[^a-zA-Z0-9]/g, '');
}

function deadlineLine(deadline) {
  if (!deadline || deadline === 'ongoing' || deadline === 'rolling') return null;
  return `Deadline: ${deadline}`;
}

function trim(text, max) {
  if (!text) return '';
  text = text.replace(/^['"]|['"]$/g, '');
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, '');
  return cut + '…';
}

function formatToot(entry) {
  const project = entry.project || entry.slug;
  const chain = entry.chain || '';
  const prefix = RISK_PREFIX[entry.risk] || 'ℹ️';
  const dl = deadlineLine(entry.deadline);
  const action = trim(entry.action || '', 200);
  const entryUrl = `${SITE}/airdrops/${entry.slug}`;
  const officialUrl = entry.officialUrl;
  const tag = chainTag(chain);

  const lines = [
    `${prefix} ${project} · ${chain}`,
    dl,
    '',
    action,
    '',
    `▶ ${entryUrl}`,
    officialUrl ? `🔗 ${officialUrl}` : null,
    '',
    tag ? `#Airdrop #${tag} #Web3` : '#Airdrop #Web3',
  ].filter(l => l !== null);

  return lines.join('\n');
}

async function postOne(env, entry, { dryRun = false } = {}) {
  const toot = formatToot(entry);
  if (dryRun) {
    console.log('--- DRY RUN ---');
    console.log(`slug: ${entry.slug}`);
    console.log(`chars: ${toot.length}`);
    console.log(toot);
    return null;
  }
  if (toot.length > 500) {
    throw new Error(`Toot too long for ${entry.slug}: ${toot.length} chars`);
  }
  const body = new URLSearchParams({
    status: toot,
    visibility: 'public',
    language: 'en',
  });
  const idem = `web3discover-${entry.slug}-${crypto.randomBytes(4).toString('hex')}`;
  const res = await fetch(`${env.MASTODON_INSTANCE}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}`,
      'Idempotency-Key': idem,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log(`posted ${entry.slug} -> ${data.url}  (id ${data.id})`);
  return data;
}

function pickBackfill(entries, n) {
  const dated = entries
    .filter(e => e.deadline && e.deadline !== 'ongoing' && e.deadline !== 'rolling' && e.risk !== 'scam')
    .filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.deadline))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  return dated.slice(0, n);
}

async function main() {
  const args = process.argv.slice(2);
  const env = loadEnv();
  if (!env.MASTODON_INSTANCE || !env.MASTODON_ACCESS_TOKEN) {
    throw new Error('MASTODON_INSTANCE / MASTODON_ACCESS_TOKEN not in .solvo/secrets.env');
  }
  const dryRun = args.includes('--dry-run');
  const cleaned = args.filter(a => a !== '--dry-run');

  if (cleaned[0] === '--backfill') {
    const n = parseInt(cleaned[1] || '10', 10);
    const all = listAllEntries();
    const picks = pickBackfill(all, n);
    console.log(`Backfilling ${picks.length} entries (nearest deadline first):`);
    for (const e of picks) {
      try {
        await postOne(env, e, { dryRun });
        // be nice to the API
        if (!dryRun) await new Promise(r => setTimeout(r, 4000));
      } catch (err) {
        console.error(`FAILED ${e.slug}: ${err.message}`);
      }
    }
    return;
  }

  if (!cleaned[0]) {
    console.error('Usage: post-mastodon.mjs <slug> | --backfill N [--dry-run]');
    process.exit(1);
  }
  const entry = loadEntry(cleaned[0]);
  await postOne(env, entry, { dryRun });
}

main().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
