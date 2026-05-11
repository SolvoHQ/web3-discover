import type { AirdropEntry } from './airdrops.ts';

export interface ListMeta {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  shortLabel: string;
  intro: string[];
  filter: (e: AirdropEntry) => boolean;
}

const isOngoing = (e: AirdropEntry): boolean => {
  const d = e.data.deadline == null ? '' : String(e.data.deadline).trim();
  return !/^\d{4}-\d{2}-\d{2}$/.test(d);
};

const hay = (e: AirdropEntry): string =>
  `${e.data.blurb} ${e.data.action}`.toLowerCase();

const firstMinutes = (effort: string): number | null => {
  const m = effort.match(/~?(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : null;
};

const isRecurring = (effort: string): boolean =>
  /\b(ongoing|weekly|daily|\/wk|per week|per day|hr|hour)\b/i.test(effort);

const SOLANA_RE = /\bsolana\b/i;
const L2_RE =
  /\b(L2|L3|zk-?evm|zk-?rollup|rollup|optimism|arbitrum|base|linea|ink|katana|megaeth|plume|reya|starknet)\b/i;
const PERP_RE = /perp|perpetual|derivatives|leveraged margin/i;
const POINTS_RE = /\bpoints?\b/i;

export const LIST_META: ListMeta[] = [
  {
    slug: 'best-solana-airdrops-2026',
    title: 'Best Solana airdrops to farm in 2026',
    h1: 'Best Solana airdrops 2026',
    shortLabel: 'Solana 2026',
    metaDescription:
      'Hand-vetted Solana airdrops you can act on right now in 2026. Restaking LSTs, perp DEXes, AI-agent points, cross-chain — sorted by deadline.',
    intro: [
      `Solana hosts one of the densest concentrations of active points programs of any L1 in 2026 — restaking LSTs, perp DEXes, AI-agent platforms, and concentrated-liquidity DEXes all run concurrent campaigns through the year. Each entry below was verified against the project's own channel, not an aggregator listing.`,
      `Sort is deadline-ascending: dated cliffs (snapshots, claim windows, unlock events) come first, ongoing points programs follow. Risk flag tells you whether the campaign terms are publicly confirmed by the team (verified) or inferred from observable on-chain behavior (unverified). Nothing flagged "suspect" appears here — we exclude scams entirely rather than silently hide them.`,
    ],
    filter: (e) => SOLANA_RE.test(e.data.chain),
  },
  {
    slug: 'best-l2-airdrops-2026',
    title: 'Best Ethereum L2 airdrops to farm in 2026',
    h1: 'Best Ethereum L2 airdrops 2026',
    shortLabel: 'L2 2026',
    metaDescription:
      'Hand-vetted airdrops on Ethereum L2s and zk-rollups for 2026. Arbitrum, Base, Optimism, Linea, MegaETH, Plume, Starknet, Ink, Katana — sorted by deadline.',
    intro: [
      `Ethereum L2s remain the highest-density airdrop ecosystem in 2026: every major rollup either has an active points program, a confirmed forward distribution, or an ongoing supply event tied to ecosystem activity. The entries below cover OP-Stack and Arbitrum-Orbit rollups, native zk-rollups, and the newer wave of RWA / real-time L2s (Plume, MegaETH).`,
      `Each entry is sorted by deadline ascending — dated unlocks and snapshot cliffs first, then ongoing points programs. Cost-floor is shown in absolute terms (gas-only / $X+ deposit) so you can scan for entries that match your capital. Risk flag distinguishes publicly-confirmed campaigns from inferred ones; nothing suspected of being a scam is included.`,
    ],
    filter: (e) => L2_RE.test(e.data.chain),
  },
  {
    slug: 'best-points-airdrops-no-snapshot',
    title: 'Best points airdrops with no snapshot deadline — farm now',
    h1: 'Best points airdrops with no snapshot',
    shortLabel: 'Points · no snapshot',
    metaDescription:
      'Points-based airdrops that have not announced a snapshot date — early to mid-campaign entries where time-weighted activity still matters. Hand-vetted, scam-filtered.',
    intro: [
      `Points programs without a published snapshot date are where time-weighted activity still compounds — every additional day of usage usually still affects allocation. Once a snapshot is announced the window for farming-from-zero is effectively over. The entries below all run points-based scoring and have no public snapshot or TGE date locked in.`,
      `That said, "no snapshot" does not mean "no risk": some programs change tiering rules retroactively, others ship eligibility logic that quietly de-prioritises late entrants. Each entry's risk flag tells you whether the program's distribution terms are publicly confirmed (verified) or still inferred (unverified). Sort is deadline-ascending, which for ongoing-only entries falls back to alphabetical.`,
    ],
    filter: (e) => isOngoing(e) && POINTS_RE.test(hay(e)),
  },
  {
    slug: 'airdrops-under-30-minutes',
    title: 'Airdrops you can complete in under 30 minutes',
    h1: 'Airdrops under 30 minutes',
    shortLabel: 'Under 30 min',
    metaDescription:
      'Hand-vetted airdrops with a one-time setup or claim under 30 minutes — no recurring weekly grind. Sorted by deadline.',
    intro: [
      `Most airdrop guides assume you have hours per week to farm. The entries below are the opposite: each one is a discrete claim or setup that fits inside a 30-minute block, with no recurring weekly time commitment baked into the eligibility logic. Some are one-time registrations against a deadline; others are one-time deposits where the position then accrues passively.`,
      `Effort is parsed from each entry's stated "Effort" line, and only entries that lack an "ongoing / weekly / daily / hour" component are included. Risk flag and cost-floor are still per-entry — a short-effort airdrop can still require non-trivial capital. Sort is deadline-ascending so dated claim windows surface first.`,
    ],
    filter: (e) => {
      const eff = e.data.effort;
      if (isRecurring(eff)) return false;
      const m = firstMinutes(eff);
      return m !== null && m <= 30;
    },
  },
  {
    slug: 'best-perp-dex-airdrops',
    title: 'Best perp DEX airdrops to farm in 2026',
    h1: 'Best perp DEX airdrops 2026',
    shortLabel: 'Perp DEX',
    metaDescription:
      'Hand-vetted perpetual-DEX airdrops for 2026. Hyperliquid, Aster, Backpack, Extended, Ostium, Reya, Pendle Boros, Ink Nado — sorted by deadline.',
    intro: [
      `Perp DEXes dominated 2024-2025 airdrop distributions (Hyperliquid alone shipped 31% of supply to traders in Nov 2024) and the 2026 cohort continues that pattern: derivatives venues across Solana, Hyperliquid, Arbitrum, Starknet, and BNB are still using points-weighted volume as the primary eligibility signal. The entries below are the ones where trading volume — spot, perp, or yield-rate — is part of the published scoring formula.`,
      `Be honest about your risk budget before farming any of these: leverage on equities or commodities perps (Ostium, Extended) is unforgiving, and even points-only volume requirements consume real fees. Cost-floor on each entry reflects the realistic collateral needed; effort reflects per-session time. Sort is deadline-ascending — dated claim windows first.`,
    ],
    filter: (e) => PERP_RE.test(hay(e)),
  },
];

export function getListMeta(slug: string): ListMeta | undefined {
  return LIST_META.find((l) => l.slug === slug);
}
