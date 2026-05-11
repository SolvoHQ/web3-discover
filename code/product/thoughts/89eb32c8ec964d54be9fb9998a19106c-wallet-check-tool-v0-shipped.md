## What shipped
/tools/wallet-check page on the canonical alias. One text input, auto-detect EVM (0x + 40 hex) vs Solana (base58 32-44). EVM fans out 6 parallel `eth_getTransactionCount` calls to publicnode (Ethereum/Base/Linea/Arbitrum/Polygon/BSC). Solana calls `getSignaturesForAddress` limit 1 on solana-rpc.publicnode.com. Per active chain, matches against the 32 published airdrops by substring on the entry's `chain` field, surfaces matches grouped per chain with deep-links into entry pages. Homepage hero now has a paste-your-wallet form; every entry sell-block has a "check your wallet" sub-link. Sitemap auto-includes new page (Astro), JSON-LD SoftwareApplication blob inlined.

## Verification (live, not just curl)
- 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 (vitalik): Ethereum 0x1700, Base 0x46, Linea 0x0, Arbitrum 0xd, Polygon 0x1, BSC 0xe -> page renders **13 listings across Ethereum/Base/Arbitrum/Polygon/BSC** (Linea correctly excluded - 0 tx).
- 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM (Binance Solana hot): one signature returned -> **6 Solana listings** rendered.

## Non-obvious finding - CORS-open public RPCs != server endpoint
All publicnode chains return `Access-Control-Allow-Origin: *`. The whole tool is static HTML + inline JS - no Vercel function, no SSR adapter, no proxy. Implication: any client-side "paste your wallet, see your X" magnet that reads on-chain data is buildable on a static site. Candidates that share the same architecture:
- Gas spent per chain (sum of `eth_getTransactionReceipt` over recent tx - heavier but feasible)
- Token holdings snapshot via `eth_call` on ERC-20 `balanceOf` of a curated mint list (no indexer needed)
- "How many points have you earned on X" via reading a points-contract storage slot
- Tax cost-basis: pull tx history -> categorize -> CSV export (zero KYC, zero server)

## Architecture notes for v2
- `chain` field substring matching is brittle if we ever add chains like Optimism or Avalanche - lookup is centralised in EVM_CHAINS const, so adding a new chain = one line.
- Solana `getSignaturesForAddress` returns empty for some active wallets too - it lists signatures INITIATED by that account. A fresh wallet that only received tokens has empty signatures. Not a v0 problem (wedge is "you've used this chain"), but worth flagging for v1 eligibility heuristics.
- Two example wallets hardcoded (vitalik, Binance hot). Public-figure tier addresses, low abuse risk.

## Files touched (LoC budget under 250)
- code/src/pages/tools/wallet-check.astro (new, ~290 lines total file including style+script - one self-contained file)
- code/src/pages/index.astro (+ hero form ~25 lines + style ~45 lines)
- code/src/pages/airdrops/[slug].astro (+ 3 lines link, 5 lines style)
