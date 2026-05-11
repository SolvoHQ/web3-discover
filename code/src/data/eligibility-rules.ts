// Per-slug eligibility rules consumed by /tools/eligibility.
// Sibling-data layout (vs. extending airdrop frontmatter): rules can be omitted
// without churning entry files, and the entire registry compiles type-checked.

export type EvmChain = 'ethereum' | 'base' | 'linea' | 'arbitrum' | 'polygon' | 'bsc';

export type Rule =
  | { kind: 'chainTx'; chain: EvmChain; minCount: number }
  | { kind: 'tokenBalance'; chain: EvmChain; contract: string; decimals: number; min: string; symbol: string }
  | { kind: 'solanaTx'; minCount: number }
  | { kind: 'holdsSolMint'; mint: string; decimals: number; min: string; symbol: string }
  | { kind: 'any'; rules: Rule[] }
  | { kind: 'all'; rules: Rule[] };

// Loose typing on the keys: not every slug has a rule. The evaluator looks up
// by slug and treats absent ⇒ "manual check needed".
export const RULES: Record<string, Rule> = {
  // -- EVM presence rules (chainTx, minCount=1): the airdrop's chain is the
  // signal. Hand-verified: each chain's RPC returns eth_getTransactionCount
  // against a known wallet and the count maps to "ever signed on this chain".

  'linea-surge-points': { kind: 'chainTx', chain: 'linea', minCount: 1 },
  'base-coinbase-l2':   { kind: 'chainTx', chain: 'base',  minCount: 1 },
  'polymarket-poly':    { kind: 'chainTx', chain: 'polygon', minCount: 1 },
  'metamask-rewards-mask': { kind: 'chainTx', chain: 'ethereum', minCount: 1 },
  'rainbow-wallet-rnbw':   { kind: 'chainTx', chain: 'ethereum', minCount: 1 },

  // -- Arbitrum-active traders. Reya / Ostium gate on real trading volume, so
  // minCount=5 is a stricter "you've used Arbitrum repeatedly" signal — still
  // a loose proxy, not authoritative eligibility.
  'reya-rcp-points':   { kind: 'chainTx', chain: 'arbitrum', minCount: 5 },
  'ostium-points':     { kind: 'chainTx', chain: 'arbitrum', minCount: 5 },

  // -- Composite rules (any): EITHER you hold the token, OR you've used the
  // chain enough to plausibly accrue points. tokenBalance hits are stronger
  // (already eligible for token-side actions) and bubble up via "any".
  'pendle-boros-points': {
    kind: 'any',
    rules: [
      { kind: 'tokenBalance', chain: 'ethereum', contract: '0x808507121B80c02388fAd14726482e061B8da827', decimals: 18, min: '1', symbol: 'PENDLE' },
      { kind: 'chainTx', chain: 'arbitrum', minCount: 1 },
    ],
  },
  'etherfi-the-club': {
    kind: 'any',
    rules: [
      { kind: 'tokenBalance', chain: 'ethereum', contract: '0xFe0c30065B384F05761f15d0CC899D4F9F9Cc0eB', decimals: 18, min: '1', symbol: 'ETHFI' },
      { kind: 'chainTx', chain: 'ethereum', minCount: 1 },
    ],
  },

  // -- Token-balance rules (relevant to next unlock cliff). Holding ⇒ the
  // unlock event matters to you directly.
  'arbitrum-stip-unlock':       { kind: 'tokenBalance', chain: 'arbitrum', contract: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, min: '1', symbol: 'ARB' },
  'starknet-provisions-unlock': { kind: 'tokenBalance', chain: 'ethereum', contract: '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766', decimals: 18, min: '1', symbol: 'STRK' },

  // -- Solana presence rules. solanaTx(1) ≈ "has any signature on Solana".
  'solayer-emerald':        { kind: 'solanaTx', minCount: 1 },
  'meteora-met-season-2':   { kind: 'solanaTx', minCount: 1 },
  'sanctum-infinity':       { kind: 'solanaTx', minCount: 1 },
};

// Slugs that intentionally have no machine-checkable rule. Documented here so
// the UI can categorise them as "manual check needed — chain/L1 not yet
// covered" with a distinct reason vs. "no rule wired yet".
//
// reasons:
//   own-l1-no-cors-rpc : project lives on its own L1/L2 with no free CORS-open
//                        public RPC reachable from the browser (Monad, MegaETH,
//                        Plume, Berachain, Hyperliquid, Fogo SVM, Ink, etc.)
//   off-chain-criteria : points / KYC / X / Discord / Galxe quests — no on-chain
//                        signature is uniquely identifying
//   multi-chain-too-loose : Multi-chain quest aggregators (Galxe, Layer3) match
//                        almost any user and offer no useful eligibility signal
export const NO_RULE_REASON: Record<string, 'own-l1-no-cors-rpc' | 'off-chain-criteria' | 'multi-chain-too-loose'> = {
  'monad-momentum':              'own-l1-no-cors-rpc',
  'megaeth-terminal-points':     'own-l1-no-cors-rpc',
  'plume-season-2':              'own-l1-no-cors-rpc',
  'berachain-post-tge-incentives': 'own-l1-no-cors-rpc',
  'infrared-berachain':          'own-l1-no-cors-rpc',
  'hyperliquid-hype-season-2':   'own-l1-no-cors-rpc',
  'basedapp-season-3':           'own-l1-no-cors-rpc',
  'hypurrfi-hyperevm':           'own-l1-no-cors-rpc',
  'felix-protocol-hyperevm':     'own-l1-no-cors-rpc',
  'fogo-flames-s2':              'own-l1-no-cors-rpc',
  'ink-kraken-l2':               'own-l1-no-cors-rpc',
  'katana-kat-incentives':       'own-l1-no-cors-rpc',
  'walrus-storage':              'own-l1-no-cors-rpc',
  'plasma-xpl':                  'own-l1-no-cors-rpc',
  'aster-stage-6':               'own-l1-no-cors-rpc',
  'mitosis-cross-chain-liquidity': 'own-l1-no-cors-rpc',
  'sahara-ai-first-unlock':      'own-l1-no-cors-rpc',
  'extended-xvs-perps':          'own-l1-no-cors-rpc',
  'momentum-mmt-unlock':         'own-l1-no-cors-rpc',
  'glider-s2-portfolios':        'off-chain-criteria',
  'backpack-season-4':           'off-chain-criteria',
  'symbiotic-restaking-points':  'own-l1-no-cors-rpc',
  'optimism-retropgf-unlock':    'own-l1-no-cors-rpc',
  'sonic-labs-final-claim':      'own-l1-no-cors-rpc',
  'virtuals-genesis':            'off-chain-criteria',
  'wormhole-w-unlock':           'off-chain-criteria',
  'galxe-quest-campaigns':       'multi-chain-too-loose',
  'layer3-cube-quests':          'multi-chain-too-loose',
};
