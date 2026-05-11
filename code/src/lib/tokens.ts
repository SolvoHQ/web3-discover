// Token registry for /tools/swap preselection.
//
// SOLANA_MINTS — symbol → SPL mint. Used both as the canonical lookup for the
// existing ?token=SYMBOL flow on /tools/swap and as the source of truth for
// per-slug preselect targets below. Only mints we are confident about land
// here — wrong mint = user trades the wrong asset.
//
// SLUG_SWAP_TARGETS — airdrop entry slug → swap preselect descriptor. For
// Solana entries the slug maps to a verified SPL mint; for EVM entries it
// maps to a Jumper chain key (and token address when we have one). Entries
// without a verifiable mint route into the fallback path (generic page).
//
// resolveSwapTarget — single entry point used by both the sell-CTA on each
// /airdrops/[slug] page (server-side, static) and the Jupiter init script on
// /tools/swap.astro (client-side, runtime).

export const SOLANA_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  INF: '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  MEW: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};

// Jumper uses chain "keys" (3-letter) in deeplink params. These are the ones
// we'll commonly land users on. Unknown chains fall through to a key-less link.
export const JUMPER_CHAIN_KEYS: Record<string, string> = {
  ethereum: 'ETH',
  arbitrum: 'ARB',
  optimism: 'OPT',
  base: 'BAS',
  polygon: 'POL',
  bsc: 'BSC',
  binance: 'BSC',
  avalanche: 'AVA',
  linea: 'LNA',
  ink: 'INK',
  berachain: 'BER',
  scroll: 'SCL',
  zksync: 'ERA',
  starknet: 'SNE',
  blast: 'BLS',
  mantle: 'MNT',
};

export type SolanaTarget = {
  kind: 'solana';
  inputMint: string;
  outputMint: string;
  symbol: string;
};

export type EvmTarget = {
  kind: 'evm';
  fromChain: string;
  fromToken?: string;
  toChain?: string;
  toToken?: string;
  chainLabel: string;
  tokenLabel?: string;
};

export type FallbackTarget = { kind: 'fallback' };

export type SwapTarget = SolanaTarget | EvmTarget | FallbackTarget;

// Per-slug routing. Only includes slugs with a confidently-known mint or
// chain. Everything else falls through to resolveSwapTarget's heuristics.
export const SLUG_SWAP_TARGETS: Record<string, SwapTarget> = {
  'sanctum-infinity': {
    kind: 'solana',
    inputMint: SOLANA_MINTS.INF,
    outputMint: SOLANA_MINTS.USDC,
    symbol: 'INF',
  },
  'etherfi-the-club': {
    kind: 'evm',
    fromChain: 'ETH',
    fromToken: '0xFe0c30065B384F05761f15d0CC899D4F9F9Cc0eB',
    toChain: 'ETH',
    chainLabel: 'Ethereum',
    tokenLabel: 'ETHFI',
  },
  'pendle-boros-points': {
    kind: 'evm',
    fromChain: 'ETH',
    fromToken: '0x808507121B80c02388fAd14726482e061B8da827',
    toChain: 'ETH',
    chainLabel: 'Ethereum',
    tokenLabel: 'PENDLE',
  },
  'symbiotic-restaking-points': {
    kind: 'evm',
    fromChain: 'ETH',
    toChain: 'ETH',
    chainLabel: 'Ethereum',
  },
  'ostium-points': {
    kind: 'evm',
    fromChain: 'ARB',
    chainLabel: 'Arbitrum',
  },
  'reya-rcp-points': {
    kind: 'evm',
    fromChain: 'ARB',
    chainLabel: 'Arbitrum',
  },
  'base-coinbase-l2': {
    kind: 'evm',
    fromChain: 'BAS',
    chainLabel: 'Base',
  },
  'ink-kraken-l2': {
    kind: 'evm',
    fromChain: 'INK',
    chainLabel: 'Ink',
  },
  'linea-surge-points': {
    kind: 'evm',
    fromChain: 'LNA',
    chainLabel: 'Linea',
  },
  'berachain-post-tge-incentives': {
    kind: 'evm',
    fromChain: 'BER',
    chainLabel: 'Berachain',
  },
  'infrared-berachain': {
    kind: 'evm',
    fromChain: 'BER',
    chainLabel: 'Berachain',
  },
  'polymarket-poly': {
    kind: 'evm',
    fromChain: 'POL',
    chainLabel: 'Polygon',
  },
  'extended-xvs-perps': {
    kind: 'evm',
    fromChain: 'SNE',
    chainLabel: 'Starknet',
  },
};

const SOLANA_CHAIN_RX = /\bsolana\b/i;

function detectJumperChain(chain: string): { key: string; label: string } | null {
  const lower = chain.toLowerCase();
  for (const [needle, key] of Object.entries(JUMPER_CHAIN_KEYS)) {
    if (lower.includes(needle)) {
      const label = needle.charAt(0).toUpperCase() + needle.slice(1);
      return { key, label };
    }
  }
  return null;
}

// Resolve a swap target from any combination of (slug, project name, chain).
// Slug wins over symbol-fallback because slug is the canonical identifier and
// we've explicitly vetted its mapping.
export function resolveSwapTarget(
  slug: string | null | undefined,
  projectName: string | null | undefined,
  chain: string | null | undefined,
): SwapTarget {
  if (slug && SLUG_SWAP_TARGETS[slug]) {
    return SLUG_SWAP_TARGETS[slug];
  }

  if (projectName) {
    const key = projectName.toUpperCase().trim();
    if (SOLANA_MINTS[key]) {
      return {
        kind: 'solana',
        inputMint: SOLANA_MINTS[key],
        outputMint: SOLANA_MINTS.USDC,
        symbol: key,
      };
    }
  }

  if (chain) {
    if (SOLANA_CHAIN_RX.test(chain)) {
      return { kind: 'fallback' };
    }
    const evm = detectJumperChain(chain);
    if (evm) {
      return {
        kind: 'evm',
        fromChain: evm.key,
        chainLabel: evm.label,
      };
    }
  }

  return { kind: 'fallback' };
}

export function buildJumperUrl(target: EvmTarget, integratorKey: string): string {
  const params = new URLSearchParams();
  params.set('fromChain', target.fromChain);
  if (target.fromToken) params.set('fromToken', target.fromToken);
  if (target.toChain) params.set('toChain', target.toChain);
  if (target.toToken) params.set('toToken', target.toToken);
  params.set('utm_source', integratorKey);
  params.set('utm_medium', 'integrator');
  params.set('utm_campaign', 'swap');
  return `https://jumper.exchange/?${params.toString()}`;
}

// Build the CTA href that lives on each /airdrops/[slug] page. Solana and
// fallback entries point at /tools/swap (where the Solana-preset LiFi widget
// runs); EVM entries can deeplink straight to Jumper or also land on /tools/swap
// where the EVM-preset LiFi widget picks them up via the same registry.
export function buildSellCtaHref(
  slug: string,
  projectName: string,
  chain: string,
  integratorKey: string,
): { href: string; external: boolean; label: string } {
  const target = resolveSwapTarget(slug, projectName, chain);

  if (target.kind === 'evm') {
    return {
      href: buildJumperUrl(target, integratorKey),
      external: true,
      label: target.tokenLabel
        ? `Swap ${target.tokenLabel} on Jumper (${target.chainLabel}) →`
        : `Open Jumper on ${target.chainLabel} →`,
    };
  }

  const q = new URLSearchParams();
  q.set('slug', slug);
  q.set('token', projectName);
  q.set('chain', chain);
  return {
    href: `/tools/swap?${q.toString()}`,
    external: false,
    label: `Swap ${projectName} on web3-discover →`,
  };
}
