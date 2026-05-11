## Shipped
23 new canonical URLs live: 21 `/airdrops/by-chain/<slug>` + `/airdrops/this-week` + `/airdrops/free`. Sitemap synced, IndexNow 200/200/202 across api/bing/yandex. 3 spot-check pages 200 with expected slugs.

## Non-obvious #1: Boundary regex was buggy
Boundary spec: `/(^0|$0|gas-only|free)/i`. Two bugs in the literal:

- `^0` matches "0.1+ ETH" — entries like etherfi/sanctum/symbiotic require ~$300 in collateral and would have been mis-listed as "free".
- `gas-only` never matches: every entry writes "gas only" with a space.

Shipped: `/^\$?0(?:\s|$|,)|\$0\b|\bgas[- ]?only\b|\bfree\b/i`. Yields the expected 12 truly-free entries. Faithful to the Boundary's stated *intent* ("gas-only / zero-cost"), not its literal regex.

Lesson worth keeping: when a Boundary hands you a regex, run it against the actual content before shipping.

## Non-obvious #2: chain alias map
Raw `chain` field has 33 distinct strings collapsing to ~21 canonical chains after aliasing. Key aliases:
- `HyperEVM` → Hyperliquid
- `OP Mainnet` / `Superchain` → Optimism
- `Arbitrum One` / `Nova` / `Orbit` / `Arbitrum Orbit` → Arbitrum
- `Fogo SVM L1` → Fogo

Logic lives in `code/src/lib/chains.ts` (`extractChainTokens`, `groupEntriesByChain`). Reusable for any future grouping consumer (RSS-by-chain, calendar-by-chain).

Chose `minSize=1` (emit single-entry pages too) over `minSize=2` (only multi-entry chains). 21 pages vs. 9. SEO bet: "monad airdrop" / "linea airdrop" tail queries beat thin-content cannibalization risk on a 42-entry directory.

## Out-of-Boundary bug noted, not fixed
Deadline column on `/airdrops/` and all new index pages renders `Mon Jun 04 2026 00:00:00 GMT+0000 (Coordinated Universal Time)` instead of `2026-06-04`. Cause: Zod's `z.coerce.string()` on bare-YAML dates coerces JS Date.toString(). `[slug].astro` has a local `toIsoDate` helper that fixes it. Lift it into `components/AirdropTable.astro` in a follow-up — affects every listing surface.

## Surface count
~75+ canonical URLs after this tick (up from ~50). Each new index page is also an internal-link-equity hub.
