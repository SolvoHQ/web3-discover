Wedge: the paste-your-wallet pattern wallet-check/token-holdings/wallet-age
proved sticky individually; eligibility is the funnel that unifies them — one
paste, three buckets, copy-paste shareable summary. This is the strongest
viral-share artefact shipped so far (the X/Telegram quote-share line bakes
"I qualify for X/N" into the share URL with utm_source=eligibility).

Schema choice: rules live in src/data/eligibility-rules.ts (sibling registry
keyed by slug, NOT in airdrop frontmatter). Rules are optional + registry
compiles type-checked + adding/dropping rules doesn't churn entry files.
Parallel NO_RULE_REASON map documents WHY a slug auto-skips:
  - own-l1-no-cors-rpc (Monad/MegaETH/Plume/Berachain/Hyperliquid/Ink/Sui)
  - off-chain-criteria (KYC/Galxe/Discord/X)
  - multi-chain-too-loose (Galxe/Layer3 aggregators)

Rules covered (14): chainTx for linea/base/polygon/ethereum*2/arbitrum*2,
tokenBalance for ARB/STRK/ETHFI/PENDLE, solanaTx*3, any-composite*2
(pendle-boros = PENDLE-balance OR arbitrum-tx; etherfi = ETHFI-balance OR
ethereum-tx). 26 of 42 entries fall through to manual-check.

RPC architecture: phase-1 enumerate (chainTx Set / tokenBalance list /
solanaTx flag / solMint Set) → phase-2 fan out ONE batched JSON-RPC POST per
EVM chain (eth_getTransactionCount + eth_call(balanceOf) bundled). With 14
rules touching 4 EVM chains + 1 Solana endpoint, total live RPC calls = 5.
Reuses publicnode endpoints proven in wallet-check + token-holdings.

Three-bucket evaluator: pass / partial / fail / unavailable. Composite "any"
bubbles first pass, then first partial. chainTx(arb,5) returns partial for
1–4 tx (vitalik's 13 tx passes; lighter trader gets "keep farming"). The
fail (no match) vs unavailable (RPC errored) split avoids false negatives.

Live RPC smoke (curl, 2026-05-11T19:36Z):
  - vitalik 0xd8dA…6045: ETH=5888, base=70, linea=0, arb=13, pol=0;
    ARB=23.7, STRK=0, ETHFI=0, PENDLE≈0.0009. Predicted: 8 eligible
    (base + eth*2 + arb*2 + ARB-balance + pendle/etherfi via composite).
  - 9WzDXw…WWM (public SOL): getSignaturesForAddress returned 1 sig →
    solayer/meteora/sanctum all pass → 3 eligible.
Both wallets clear the Boundary smoke-test bar (≥1 eligible each).

Linked from: hero form on index.astro (action target swapped wallet-check →
eligibility), featured card on /tools, callout strip on /airdrops.

Followup levers if the funnel converts:
  1. Subgraph integration (Linea Surge, MetaMask Rewards points APIs) for
     points-level verdict, not just presence.
  2. Hyperliquid /info REST endpoint (CORS-OK per HL docs) = single biggest
     manual-check pool to unlock (hyperliquid-s2 + basedapp-s3 + hypurrfi +
     felix).
  3. Embed the eligibility widget into /embed.js so partner sites render
     personalised verdicts instead of the static list.
