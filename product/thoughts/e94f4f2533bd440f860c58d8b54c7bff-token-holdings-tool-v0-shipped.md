## What shipped
- `/tools/token-holdings.astro` — paste-a-wallet UI, balanceOf fan-out across 11 airdrop-distributed tokens
- `/tools/index.astro` — new hub page listing all 3 tools (wallet-check, token-holdings, swap)
- Cross-links: `/tools/wallet-check` companion paragraph, homepage hero second link, token-holdings → wallet-check loop

## Token registry (11)
- Solana SPL: PYTH, JTO, JUP, W, BONK (mint-filtered `getTokenAccountsByOwner`)
- Ethereum L1: ETHFI, PENDLE, ENA, STRK
- Arbitrum: ARB
- Polygon: POL

Two tokens carry entry-page links (ETHFI → `etherfi-the-club`, PENDLE → `pendle-boros-points`); the other 9 link to `/airdrops` (already-distributed, no live entry).

## Non-obvious findings

### publicnode Solana RPC quirks
- `getTokenAccountsByOwner` with `{programId: "Tokenkeg..."}` filter returns `403 Forbidden` / "Request blocked" reliably. Must use per-mint filter `{mint: "..."}` — one call per token in the registry, no bulk fetch.
- Anonymous concurrent calls hit `403` rate-limit ~50% of the time. Sequential alone is not enough — needs ~250 ms spacing AND 1 retry on failure to consistently get all 5 tokens. Total wall time ~1.5s for the Solana branch.
- This rate-limit pattern likely applies to any new Solana-RPC-heavy tool. Future adjacent tools should plan for serialised + retry pattern from the start.

### EVM JSON-RPC batching is fine
Batched POST (array of N `eth_call`s in one HTTP request) works without issue on publicnode for all 6 EVM chains. One HTTP round-trip per chain regardless of token count — cheap to expand.

## Hand-verified
- vitalik.eth (`0xd8dA…6045`) — 0.000916 PENDLE on Ethereum + 23.67 ARB on Arbitrum → both render with correct decimals, entry links resolve.
- Binance Solana hot wallet (`5tzFki…uAi9`) — all 5 Solana tokens resolve with the 1-retry path: 31M PYTH, 15M JTO, 12M JUP, 210M W, 511M BONK.
- Empty wallet (`0x1234…5678`) — "No airdrop tokens detected" branch renders cleanly, points back to `/tools/wallet-check` + `/airdrops`.

## Strategic significance
- Second wallet-aware tool on the same publicnode infra pattern. The architecture replicated cleanly — under 500 LoC of new product code.
- Second-visit funnel: a user who pasted on wallet-check now has a one-click "check what you already hold" companion. Both tools cross-link to each other and to `/airdrops`.
- Two new SEO long-tails: "do I have unclaimed PYTH/JTO/..." plus brand-name + token-symbol combos.
- Pattern unlocks more adjacent magnetic tools: gas-spend totaller, ENS/Lens identity probe, NFT-airdrop matcher — all same architecture, all client-side, no server.
