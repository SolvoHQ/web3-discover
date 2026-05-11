import type { AirdropEntry } from './airdrops.ts';

// Aliases collapse near-synonyms onto one canonical token.
// Anything not listed here passes through after generic cleanup.
const TOKEN_ALIAS: Record<string, string> = {
  hyperevm: 'Hyperliquid',
  'op-mainnet': 'Optimism',
  'op-superchain': 'Optimism',
  superchain: 'Optimism',
  op: 'Optimism',
  'bnb-chain': 'BNB Chain',
  'arbitrum-one': 'Arbitrum',
  'arbitrum-orbit': 'Arbitrum',
  nova: 'Arbitrum',
  orbit: 'Arbitrum',
  'fogo-svm': 'Fogo',
};

// Tokens that aren't useful as a chain page (too vague, not a chain).
const TOKEN_BLOCK = new Set([
  'multi',
  'multi-chain',
  'multi-chain-perps',
  'evm-l2s',
  'l2s',
  'evm',
  'multichain',
]);

function stripParens(s: string): string {
  return s.replace(/\([^)]*\)/g, '').trim();
}

function stripChainSuffix(s: string): string {
  return s
    .replace(/\s+L1$/i, '')
    .replace(/\s+L2$/i, '')
    .replace(/\s+SVM\s+L1$/i, ' SVM')
    .replace(/\s+Mainnet$/i, '')
    .trim();
}

export function slugifyChain(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ChainToken {
  slug: string;
  display: string;
}

export function extractChainTokens(raw: string): ChainToken[] {
  const cleaned = stripParens(raw);
  const parts = cleaned.split(/[/+,]/).map((s) => s.trim()).filter(Boolean);

  const tokens: ChainToken[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const trimmed = stripChainSuffix(part);
    if (!trimmed) continue;
    const baseSlug = slugifyChain(trimmed);
    if (!baseSlug || TOKEN_BLOCK.has(baseSlug)) continue;
    const aliasedDisplay = TOKEN_ALIAS[baseSlug] ?? trimmed;
    const slug = slugifyChain(aliasedDisplay);
    if (!slug || TOKEN_BLOCK.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    tokens.push({ slug, display: aliasedDisplay });
  }
  return tokens;
}

export interface ChainBucket {
  slug: string;
  display: string;
  entries: AirdropEntry[];
}

export function groupEntriesByChain(
  entries: AirdropEntry[],
  minSize = 1,
): ChainBucket[] {
  const buckets = new Map<string, ChainBucket>();
  for (const entry of entries) {
    const tokens = extractChainTokens(entry.data.chain);
    for (const t of tokens) {
      let bucket = buckets.get(t.slug);
      if (!bucket) {
        bucket = { slug: t.slug, display: t.display, entries: [] };
        buckets.set(t.slug, bucket);
      }
      bucket.entries.push(entry);
    }
  }
  return Array.from(buckets.values())
    .filter((b) => b.entries.length >= minSize)
    .sort((a, b) => b.entries.length - a.entries.length || a.slug.localeCompare(b.slug));
}
