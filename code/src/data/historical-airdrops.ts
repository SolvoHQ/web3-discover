// Hand-curated registry of historical airdrops used by /tools/historical-value.
// Each entry encodes: (a) hard-coded claim-day USD price and a representative
// base-tier token amount, (b) one deterministic on-chain eligibility check,
// (c) plain-English caveat so users understand the heuristic before celebrating
// or grieving an estimate. We deliberately use the LOWEST documented tier
// amount per airdrop — over-estimating would be both wrong and clickbait-y.

export type EvmChain = 'ethereum' | 'optimism' | 'arbitrum' | 'base';

export type HistoricalCheck =
  // Address had ≥1 tx on this EVM chain at or before snapshot block. Uses
  // eth_getTransactionCount(addr, hexBlock) against an archive RPC.
  | { kind: 'evmFirstTxBefore'; chain: EvmChain; beforeBlock: number; beforeDate: string }
  // Address currently holds ≥ min of this ERC-20. Standard balanceOf eth_call.
  | { kind: 'evmHoldsToken'; chain: EvmChain; contract: string; decimals: number; symbol: string; min: string }
  // Address has ≥1 Solana signature (any time). Loose, but matches what some
  // airdrops actually used (Solana activity == eligibility for tier 1).
  | { kind: 'solHasSignature' }
  // Address currently holds ≥ min of this SPL mint.
  | { kind: 'solHoldsMint'; mint: string; decimals: number; symbol: string; min: string };

export type HistoricalAirdrop = {
  id: string;
  project: string;
  symbol: string;
  claimDate: string;        // ISO date
  claimPriceUSD: number;    // hard-coded snapshot of claim-day price
  baseAmount: number;       // representative MINIMUM tier amount in tokens
  amountNote: string;       // 1-line caveat about what the base tier represents
  eligibility: HistoricalCheck;
  eligibilityNote: string;  // plain-English description of the heuristic
  announceUrl: string;
};

export const HISTORICAL_AIRDROPS: HistoricalAirdrop[] = [
  {
    id: 'uni',
    project: 'Uniswap',
    symbol: 'UNI',
    claimDate: '2020-09-17',
    claimPriceUSD: 3.50,
    baseAmount: 400,
    amountNote: 'Flat 400 UNI to every wallet that ever swapped or LP\'d on Uniswap v1/v2 before the snapshot.',
    eligibility: {
      kind: 'evmFirstTxBefore',
      chain: 'ethereum',
      beforeBlock: 10861674,
      beforeDate: '2020-09-01',
    },
    eligibilityNote: 'Heuristic: any Ethereum tx before Sept 1 2020 (real criterion: swap/LP on Uniswap v1/v2). Over-includes wallets that were active but never touched Uniswap.',
    announceUrl: 'https://uniswap.org/blog/uni',
  },
  {
    id: '1inch',
    project: '1inch',
    symbol: '1INCH',
    claimDate: '2020-12-25',
    claimPriceUSD: 2.80,
    baseAmount: 88,
    amountNote: 'Base tier: ≥1 swap on 1inch before Sept 15 2020 OR ≥4 swaps before snapshot.',
    eligibility: {
      kind: 'evmFirstTxBefore',
      chain: 'ethereum',
      beforeBlock: 11543750,
      beforeDate: '2020-12-24',
    },
    eligibilityNote: 'Heuristic: any Ethereum tx before Dec 24 2020 (real criterion: swap on 1inch aggregator). Loose proxy.',
    announceUrl: 'https://blog.1inch.io/1inch-token-is-here-by-the-community-for-the-community/',
  },
  {
    id: 'op-1',
    project: 'Optimism (Airdrop #1)',
    symbol: 'OP',
    claimDate: '2022-05-31',
    claimPriceUSD: 1.40,
    baseAmount: 700,
    amountNote: 'Median tier: combined OP user category (ethereum→optimism bridger or DAO voter). Real tiers ranged 410 — 26,000 OP.',
    eligibility: {
      kind: 'evmFirstTxBefore',
      chain: 'optimism',
      beforeBlock: 5500000,
      beforeDate: '2022-05-25',
    },
    eligibilityNote: 'Heuristic: any tx on Optimism before May 25 2022. Real criteria included bridge activity + DAO governance — heuristic over-estimates inclusion for tiny bridgers.',
    announceUrl: 'https://optimism.io/blog/airdrop-1',
  },
  {
    id: 'arb',
    project: 'Arbitrum',
    symbol: 'ARB',
    claimDate: '2023-03-23',
    claimPriceUSD: 1.40,
    baseAmount: 625,
    amountNote: 'Baseline tier: ≥3 of 14 quest-style activities completed on Arbitrum One pre-snapshot. Real tiers ranged 625 — 10,250 ARB.',
    eligibility: {
      kind: 'evmFirstTxBefore',
      chain: 'arbitrum',
      beforeBlock: 58642080,
      beforeDate: '2023-02-06',
    },
    eligibilityNote: 'Heuristic: any tx on Arbitrum One before Feb 6 2023 snapshot. Real criteria scored activity tiers — heuristic puts everyone with ≥1 tx at the baseline.',
    announceUrl: 'https://arbitrum.foundation/airdrop',
  },
  {
    id: 'blur',
    project: 'Blur (Season 1)',
    symbol: 'BLUR',
    claimDate: '2023-02-14',
    claimPriceUSD: 0.65,
    baseAmount: 100,
    amountNote: 'Care Package #1 minimum: traded ≥1 NFT on Ethereum in 6 months before Oct 19 2022.',
    eligibility: {
      kind: 'evmFirstTxBefore',
      chain: 'ethereum',
      beforeBlock: 15772000,
      beforeDate: '2022-10-19',
    },
    eligibilityNote: 'Heuristic: any Ethereum tx before Oct 19 2022 (real criterion: NFT trade on OpenSea/LooksRare/X2Y2 pre-snapshot). Very loose.',
    announceUrl: 'https://blur.io/airdrop',
  },
  {
    id: 'ena',
    project: 'Ethena',
    symbol: 'ENA',
    claimDate: '2024-04-02',
    claimPriceUSD: 0.80,
    baseAmount: 500,
    amountNote: 'Shard farmer baseline (held USDe pre-Apr 2024). Top farmers received tens of thousands.',
    eligibility: {
      kind: 'evmHoldsToken',
      chain: 'ethereum',
      contract: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
      decimals: 18,
      symbol: 'USDe',
      min: '0',
    },
    eligibilityNote: 'Proxy: currently holds any USDe on Ethereum. Misses farmers who already redeemed USDe; misses anyone who held on a non-Ethereum chain.',
    announceUrl: 'https://ethena.fi/airdrop',
  },
  {
    id: 'eigen-s1',
    project: 'EigenLayer (Season 1)',
    symbol: 'EIGEN',
    claimDate: '2024-10-01',
    claimPriceUSD: 3.20,
    baseAmount: 100,
    amountNote: 'Smallest documented Season 1 tier (≥0.1 stETH equivalent restaked). Larger restakers received 10× — 100× more.',
    eligibility: {
      kind: 'evmHoldsToken',
      chain: 'ethereum',
      contract: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      decimals: 18,
      symbol: 'stETH',
      min: '0',
    },
    eligibilityNote: 'Proxy: currently holds any stETH on Ethereum (real criterion: restaked LSTs via EigenLayer pre-snapshot). Misses anyone who unstaked before claim day.',
    announceUrl: 'https://www.blog.eigenlayer.xyz/eigen/',
  },
  {
    id: 'jto',
    project: 'Jito',
    symbol: 'JTO',
    claimDate: '2023-12-07',
    claimPriceUSD: 2.50,
    baseAmount: 4000,
    amountNote: 'Smallest jitoSOL-holder tier (held ≥0.01 jitoSOL pre Nov 25 2023). Big stakers received hundreds of thousands of JTO.',
    eligibility: {
      kind: 'solHoldsMint',
      mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
      decimals: 9,
      symbol: 'jitoSOL',
      min: '0',
    },
    eligibilityNote: 'Proxy: currently holds any jitoSOL. Misses anyone who unstaked before claim day; over-includes anyone who acquired jitoSOL after the snapshot.',
    announceUrl: 'https://forum.jito.network/t/jto-token-airdrop-distribution/79',
  },
  {
    id: 'jup',
    project: 'Jupiter',
    symbol: 'JUP',
    claimDate: '2024-01-31',
    claimPriceUSD: 0.60,
    baseAmount: 200,
    amountNote: 'Smallest documented tier (≥$1 swap volume on Jupiter pre Nov 2 2023). Power users received 50,000+ JUP.',
    eligibility: { kind: 'solHasSignature' },
    eligibilityNote: 'Heuristic: any Solana signature history (real criterion: ≥$1 swapped on Jupiter pre-snapshot). Very loose — Solana activity does not guarantee Jupiter use.',
    announceUrl: 'https://research.jup.ag/jupuary',
  },
  {
    id: 'pyth',
    project: 'Pyth Network',
    symbol: 'PYTH',
    claimDate: '2023-11-20',
    claimPriceUSD: 0.40,
    baseAmount: 750,
    amountNote: 'Lowest retroactive tier (≥1 transaction on any chain that consumed a Pyth price feed pre Nov 2023).',
    eligibility: { kind: 'solHasSignature' },
    eligibilityNote: 'Heuristic: any Solana signature history (real criterion: used a Pyth-integrated dApp). Loose proxy — most retroactive recipients were Solana users.',
    announceUrl: 'https://pyth.network/blog/retrospective-airdrop',
  },
];

// Reference table of (chain, archive RPC) — kept here so the consumer page
// doesn't have to know the URL strings. drpc.org is the only archive RPC the
// site already uses (see /tools/wallet-age). We deliberately do NOT add new
// providers — Boundary OUT clause forbids it.
export const ARCHIVE_RPCS: Record<EvmChain, string> = {
  ethereum: 'https://eth.drpc.org',
  optimism: 'https://optimism.drpc.org',
  arbitrum: 'https://arbitrum.drpc.org',
  base: 'https://base.drpc.org',
};

// publicnode for "current state" reads (token balances). Matches /tools/eligibility.
export const CURRENT_RPCS: Record<EvmChain, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  optimism: 'https://optimism-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  base: 'https://base-rpc.publicnode.com',
};

export const SOL_RPC = 'https://solana-rpc.publicnode.com';

export const CHAIN_LABELS: Record<EvmChain | 'solana', string> = {
  ethereum: 'Ethereum',
  optimism: 'Optimism',
  arbitrum: 'Arbitrum',
  base: 'Base',
  solana: 'Solana',
};
