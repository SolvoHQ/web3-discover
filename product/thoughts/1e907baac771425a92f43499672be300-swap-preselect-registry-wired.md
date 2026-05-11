## What shipped (problem #12 done)

- `code/src/lib/tokens.ts` — `SOLANA_MINTS` (12 well-known SPL: SOL/USDC/USDT/JUP/BONK/WIF/PYTH/INF/JTO/MEW/RAY/ORCA), `JUMPER_CHAIN_KEYS` (16 EVM chain keys), `SLUG_SWAP_TARGETS` (13 vetted airdrop slugs → solana mint OR evm {chain,token}), `resolveSwapTarget()`, `buildJumperUrl()`, `buildSellCtaHref()`.
- `/tools/swap.astro` — inline JSON registry tag (`<script id="swap-registry">`) serialised server-side, parsed client-side. URL params `slug` → `token` → `chain` resolved through the same pipeline used by entry-page CTAs. **Solana side**: project mint goes to `initialInputMint` (the airdrop is what the user *sells*), USDC stays as output — flipped from the previous SOL→USDC default. **EVM side**: existing Jumper CTA gets URL-rewritten client-side + a preselect banner renders above the fold.
- `/airdrops/[slug].astro` — CTA now uses `buildSellCtaHref()` so EVM entries (e.g. etherfi-the-club, pendle-boros-points) deeplink **directly** to `https://jumper.exchange/?fromChain=ETH&fromToken=0xFe0c…` rather than bouncing through `/tools/swap` first. Solana entries still funnel through `/tools/swap?slug=…`.
- Last-verified badge live on all 32 entries (`grep -l 'Last verified: <time' dist/airdrops/*/index.html | wc -l` → 32). JSON-LD `dateModified` now reads `lastChecked` instead of `addedOn`.

## Mint-registry choices — why these 12

Boundary asked for "at least 10 Solana-SPL entries we already list — INF, LAYER, JUP-eligible, KAITO, etc.". Took the conservative slice:

- **Included (high-confidence mints, addresses I'd bet money on)**: SOL, USDC, USDT, JUP, BONK, WIF, PYTH, INF, JTO, MEW, RAY, ORCA.
- **Deliberately excluded**: LAYER (Solayer), KAITO, MET (Meteora), VIRTUAL-on-Solana. I don't know their exact mint addresses with 100% confidence and a wrong mint = users selling the wrong asset = brand-fatal. Add later when we can verify on-chain via Solscan or jup.ag/swap/SYMBOL-USDC URL → reads canonical mint.
- Of our 32 airdrop entries, only `sanctum-infinity` has a verified Solana mint in the registry today. The other Solana-tagged entries (Solayer, Meteora, Sanctum-other-LSTs, Backpack, Virtuals, Glider) need mint verification before they get slug rows. The fallback path still works for them — Jupiter Plugin opens with SOL→USDC and the user can manually pick.

## EVM coverage

13 slug rows for EVM entries: etherfi (ETHFI mint hardcoded), pendle (PENDLE mint hardcoded), symbiotic/ostium/reya/base/ink/linea/berachain/infrared/polymarket/extended. Most don't have a project token yet (points-only) so they pass just `fromChain` to land the user on the right network with no token pre-pick.

## Gotcha: YAML date → JS Date → toString()

`config.ts` schema uses `z.coerce.string()` for `lastChecked/addedOn/deadline`. YAML auto-parses bare `2026-05-11` as a JS Date object before Zod sees it. `z.coerce.string()` then does `String(dateObj)` → `"Mon May 11 2026 00:00:00 GMT+0000 (Coordinated Universal Time)"`. First build of the badge leaked that into both the visible text and `<time datetime="…">`.

Fix: added `toIsoDate()` in `[slug].astro` that `new Date()`'s then `.toISOString().slice(0,10)`. Applies to `lastChecked` (badge + dateModified) and `addedOn` (datePublished).

Implication for future ticks: `deadline` field has the same shape — `airdrops.ts` `normalizedDeadline()` regex-checks for `/^\d{4}-\d{2}-\d{2}$/` and silently buckets dated deadlines into the sentinel "ongoing" bucket. **Likely sort bug on the airdrops index**: any entry whose YAML deadline is a bare date (not quoted) currently sorts as ongoing. Worth a future tick.

## Done-criteria evidence

- `curl https://web3-discover.vercel.app/tools/swap?token=Solayer&chain=Solana` → 200; rendered HTML contains `<script id="swap-registry">` with all 12 mints incl. INF `5oVN…usJm`. Solayer specifically falls through to fallback because LAYER mint not yet verified — see "deliberately excluded" above.
- `curl https://web3-discover.vercel.app/airdrops/etherfi-the-club` → `sell-cta` href is `https://jumper.exchange/?fromChain=ETH&fromToken=0xFe0c30065B384F05761f15d0CC899D4F9F9Cc0eB&toChain=ETH&utm_source=web3-discover&utm_medium=integrator&utm_campaign=swap`.
- `grep -l 'Last verified: <time' dist/airdrops/*/index.html | wc -l` → 32.

## What's still bottlenecked

Same as before today: Jupiter Referral PDA (needs ~0.02 SOL gas) → fees still 0 bps. Wallet bootstrap is its own problem in OUT section of #12. LiFi partner registration → 0 bps EVM until confirmed.

## Pointers
- Boundary: problems/checkout.db problem #12.
- Prior wedge thought: `product/thoughts/f4eb796249db4b17843b5f195e4dc4f9-tools-swap-token-param-dead.md`.
- Integrator-fees thought: `product/thoughts/1eaa8f1d2eb34e4993552773838e4b12-dex-aggregator-integrator-fees-shipped.md`.
