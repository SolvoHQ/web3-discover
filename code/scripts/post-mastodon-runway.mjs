#!/usr/bin/env node
// 7-day Mastodon runway scheduler.
//
// Schedules 7 toots, one per day (13:00 UTC), starting tomorrow, via
// Mastodon's `scheduled_at` API parameter — so the owned channel keeps
// firing daily after the 12-toot opener without depending on a Vercel cron
// slot. Vercel Hobby has only 2 daily-cron slots (digest=weekly+sponsor-watch
// =daily); option (a) sidesteps that ceiling entirely.
//
// Usage:
//   node scripts/post-mastodon-runway.mjs [--dry-run] [--list] [--start YYYY-MM-DD]
//
// --dry-run  : print all 7 toot bodies + scheduled times, do NOT call API
// --list     : GET /api/v1/scheduled_statuses and pretty-print existing schedule
// --start    : override day-1 date (defaults to tomorrow UTC)
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

function loadAirdropSnapshot() {
  // The same snapshot the cron digest reads; canonical source for the
  // "today's top-3 nearest deadline" toot.
  const p = path.join(ROOT, 'api/_airdrops.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function isDated(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '');
}

function topNearestVerified(snapshot, postDate, n = 3) {
  return snapshot.entries
    .filter((e) => e.risk === 'verified' && isDated(e.deadline) && e.deadline >= postDate)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, n);
}

function fmtDay(yyyymmdd) {
  if (!isDated(yyyymmdd)) return yyyymmdd || '—';
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}

function shortChain(chain) {
  if (!chain) return '';
  // Compact the long chain names so they fit in a list line.
  const m = {
    'Arbitrum One + Nova + Orbit': 'Arbitrum',
    'Optimism / OP Stack': 'Optimism',
    'BNB Chain + multi-chain perps': 'BNB',
    'MegaETH (Ethereum L2)': 'MegaETH',
    'Plume (Ethereum L2 RWA)': 'Plume',
    'Starknet (Ethereum L2)': 'Starknet',
    'Sonic (Fantom rebrand)': 'Sonic',
    'OP Mainnet + Superchain': 'Optimism',
    'Ethereum (Sahara Chain pending)': 'Ethereum',
    'Multi-chain (Solana / Ethereum / EVM L2s)': 'Multi-chain',
  };
  return m[chain] || chain.split(/[\s/(]/)[0];
}

// 7 toot builders. Each receives the snapshot + post-date; each returns
// a string ≤500 chars. The post-date matters for the "top-3" toot so the
// list reflects deadlines current at the moment the toot goes live.
function tootTop3(snapshot, postDate) {
  const top3 = topNearestVerified(snapshot, postDate, 3);
  const list = top3
    .map((e, i) => `${i + 1}. ${e.project} · ${shortChain(e.chain)} — ${fmtDay(e.deadline)}`)
    .join('\n');
  return [
    `3 verified airdrops with the nearest deadlines:`,
    ``,
    list,
    ``,
    `Each has a hand-verified eligibility rule + a "where to sell" link on its page.`,
    ``,
    `→ ${SITE}/airdrops`,
    ``,
    `#Airdrop #Web3 #Crypto`,
  ].join('\n');
}

function tootDigest() {
  return [
    `Weekly digest goes out in ~1h.`,
    ``,
    `Inside this week:`,
    `• Top 5 freshly verified airdrops`,
    `• Next 5 dated milestones`,
    `• "Where to sell" links per entry`,
    ``,
    `One-click subscribe — Resend handles unsubscribes.`,
    ``,
    `→ ${SITE}/subscribe`,
    ``,
    `#Web3 #Airdrop #Crypto`,
  ].join('\n');
}

function tootWalletCheck() {
  return [
    `Paste your wallet → see which of 42 tracked airdrops match your on-chain activity.`,
    ``,
    `7-chain RPC fanout, runs entirely client-side. No signup, no tracking, no key prompt.`,
    ``,
    `→ ${SITE}/tools/wallet-check`,
    ``,
    `#Airdrop #Web3 #Crypto #Wallet`,
  ].join('\n');
}

function tootEligibility() {
  return [
    `14 hand-verified on-chain eligibility rules. Paste a wallet → get a per-airdrop verdict, not a "maybe".`,
    ``,
    `Each rule is a concrete RPC check (tx count, balance, holdings, age). Shareable verdict URL afterwards.`,
    ``,
    `→ ${SITE}/tools/eligibility`,
    ``,
    `#Airdrop #Web3 #Eligibility #Crypto`,
  ].join('\n');
}

function tootHistoricalValue() {
  return [
    `What would you have gotten from the last 10 mega-airdrops?`,
    ``,
    `Paste your wallet → see your would-be total across UNI, ARB, OP, JUP, JTO, BLUR, ENA, PYTH, EIGEN, 1INCH.`,
    ``,
    `Backtest first, then act forward.`,
    ``,
    `→ ${SITE}/tools/historical-value`,
    ``,
    `#Airdrop #Web3 #Crypto`,
  ].join('\n');
}

function tootVsCompetitor() {
  return [
    `How do we stack up against airdrops.io?`,
    ``,
    `Honest 7-axis comparison: where we win, where they win, who each is for.`,
    ``,
    `→ ${SITE}/vs/airdrops-io`,
    ``,
    `Also wrote /vs pages for AirdropAlert, Earnifi, Layer3, DefiLlama, DappRadar, Airdrop.com.`,
    ``,
    `#Airdrop #Web3 #Crypto`,
  ].join('\n');
}

function tootDashboard() {
  return [
    `Just shipped: paste your wallet once, see 5 views.`,
    ``,
    `/dashboard?addr=<wallet> consolidates:`,
    `• matching airdrops`,
    `• per-rule eligibility verdict`,
    `• would-be historical airdrop $`,
    `• on-chain age across 7 chains`,
    `• holdings across 11 tokens`,
    ``,
    `→ ${SITE}/dashboard`,
    ``,
    `#Airdrop #Web3 #Crypto`,
  ].join('\n');
}

// 7-day plan. Day 1 = day after `start` (so first toot keeps daily cadence
// from "today's" 12-toot opener already on the timeline).
function buildPlan(snapshot, startDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const [y, m, d] = startDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const yyyymmdd = dt.toISOString().slice(0, 10);
    days.push(yyyymmdd);
  }
  return [
    { day: 1, date: days[0], theme: 'top-3-nearest-deadline', build: () => tootTop3(snapshot, days[0]) },
    { day: 2, date: days[1], theme: 'digest-tease',           build: () => tootDigest() },
    { day: 3, date: days[2], theme: 'tool-wallet-check',      build: () => tootWalletCheck() },
    { day: 4, date: days[3], theme: 'tool-eligibility',       build: () => tootEligibility() },
    { day: 5, date: days[4], theme: 'tool-historical-value',  build: () => tootHistoricalValue() },
    { day: 6, date: days[5], theme: 'vs-competitor',          build: () => tootVsCompetitor() },
    { day: 7, date: days[6], theme: 'dashboard-launch',       build: () => tootDashboard() },
  ];
}

async function scheduleOne(env, { date, body, theme }) {
  // Mastodon requires scheduled_at >= 5 min in the future. We use 13:00 UTC
  // for visibility in EU + Americas working hours.
  const scheduledAt = `${date}T13:00:00Z`;
  const params = new URLSearchParams({
    status: body,
    visibility: 'public',
    language: 'en',
    scheduled_at: scheduledAt,
  });
  const idem = `web3discover-runway-${date}-${theme}-${crypto.randomBytes(3).toString('hex')}`;
  const res = await fetch(`${env.MASTODON_INSTANCE}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}`,
      'Idempotency-Key': idem,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function listScheduled(env) {
  const res = await fetch(`${env.MASTODON_INSTANCE}/api/v1/scheduled_statuses?limit=40`, {
    headers: { Authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

function parseArgs(argv) {
  const out = { dryRun: false, list: false, start: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--list') out.list = true;
    else if (a === '--start') out.start = argv[++i];
  }
  return out;
}

function tomorrowUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  if (!env.MASTODON_INSTANCE || !env.MASTODON_ACCESS_TOKEN) {
    throw new Error('MASTODON_INSTANCE / MASTODON_ACCESS_TOKEN not in .solvo/secrets.env');
  }

  if (args.list) {
    const items = await listScheduled(env);
    console.log(`scheduled_statuses: ${items.length}`);
    for (const it of items) {
      console.log(`  ${it.id}  @${it.scheduled_at}  ${it.params.text.slice(0, 60).replace(/\n/g, ' ')}…`);
    }
    return;
  }

  const start = args.start || tomorrowUTC();
  const snapshot = loadAirdropSnapshot();
  const plan = buildPlan(snapshot, start);

  console.log(`Runway: 7 toots starting ${start} (13:00 UTC daily)`);
  console.log('');
  for (const step of plan) {
    const body = step.build();
    const ok = body.length <= 500;
    console.log(`--- Day ${step.day} (${step.date}) · ${step.theme} · ${body.length} chars · ${ok ? 'OK' : 'TOO LONG'} ---`);
    console.log(body);
    console.log('');
    if (!ok) throw new Error(`Toot exceeds 500 chars: day ${step.day} (${body.length})`);
  }

  if (args.dryRun) {
    console.log('Dry run complete. No API calls made.');
    return;
  }

  console.log('Scheduling…');
  const results = [];
  for (const step of plan) {
    const body = step.build();
    try {
      const data = await scheduleOne(env, { date: step.date, body, theme: step.theme });
      console.log(`  scheduled day ${step.day} (${step.date}) → id ${data.id} @ ${data.scheduled_at}`);
      results.push({ day: step.day, date: step.date, theme: step.theme, id: data.id, scheduled_at: data.scheduled_at });
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`  FAILED day ${step.day}: ${e.message}`);
      throw e;
    }
  }
  console.log('');
  console.log(`Scheduled ${results.length}/7. Verify with --list.`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
