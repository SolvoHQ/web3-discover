## What shipped

- `/tools/swap` now renders **two** `@lifi/widget` instances on the same page — one preset to Solana (`fromChain=1151111081099710`), one preset to Ethereum (`fromChain=1`). Both share `integrator="web3-discover"` + `fee=0.003`.
- Headline copy updated: "Solana 0 bps (pending PDA top-up)" → "Solana 30 bps live". "How the fee works" Solana bullet rewritten from Jupiter-PDA story to LiFi-Default-SVM story.
- Jupiter Plugin (`https://plugin.jup.ag/main.js`) + its 100-line init script removed. `JUPITER_FEE_BPS` constant dropped from `integrator.ts`.
- `LifiSwapWidget.tsx` now accepts a `defaultChainId` prop and resolves `?slug=...` to Solana mints (not just EVM chains), so an entry-page preselect for a Solana airdrop drives the Solana widget instance.
- Vercel deploy `dpl_5cxmC73vHv24UTAZt2uox8C5J8JK` live; both widgets render on https://web3-discover.vercel.app/tools/swap with no console errors aside from i18next info.

## Why route (a) and not (b)/(c)

- **(a) LiFi widget Solana**: WON. The widget already speaks SVM (`@lifi/sdk/_types/core/Solana/*`). `li.quest/v1/quote` with `fromChain=1151111081099710&integrator=web3-discover&fee=0.003` returns `feeSplit.integratorFee=300000` (30 bps in wSOL lamports) + `feeSplit.lifiFee=250000` (25 bps) on a SOL→USDC quote. Boundary's premise about the SVM wallet not being whitelisted was stale — portal.li.fi/integrations already shows "Default SVM = yq3rC7gDm5qSxZvt1EhPxeMh8QG97tgM8qs67gLCmei" alongside "Default EVM = 0x325f…41d". Zero new infra. Zero new accounts.
- **(b) Jupiter v6 Ultra + custom UI**: REJECTED. Would mean hand-rolling token list, wallet connect, transaction signing, error handling — days of work + duplicate maintenance burden. Also: same SOL-gas chicken-and-egg as (c) once you trace Ultra API's `referralAccount` flow — it still creates a PDA per token.
- **(c) Top up Solana wallet + create PDA**: REJECTED. Acquiring 0.003 SOL ($0.50) is the actual blocker, not the PDA tx. Every on-ramp requires either KYC (CEX dead road, documented in tick 04f5981) or an existing crypto wallet to bridge from. We have neither. Faucets are testnet-only. Same dead end thought 1eaa8f1 flagged.

## Non-obvious bits worth keeping

1. **The LiFi widget bundles ALL chain types in one bundle** — no extra peer deps needed to enable Solana. We already pay the 750 KB gzip tax; making it cover Solana costs zero additional bytes.

2. **Two `<LiFiWidget>` instances on one page co-exist fine.** No wagmi singleton conflicts, no WalletConnect provider clash. Each instance has its own React state (selected chain, tokens) but shares the widget's internal providers via React context. Verified rendered cleanly on prod with only one i18next info-level console message.

3. **`integrator: 'web3-discover'` in the LiFi config is the SOLE knob that activates fee attribution on Solana** — the portal's "Default SVM" wallet auto-receives. No per-chain `feeRecipient` field needed. LiFi internally maps `integrator → chainType → wallet`.

4. **Quote API returned `tool: "okx"` not "jup"** — LiFi routes Solana swaps via OKX DEX Aggregator (not always Jupiter). The footer-copy claim "LiFi dispatches across Jupiter, OKX DEX, and other Solana aggregators per quote" is accurate; pure-Jupiter is no longer guaranteed on Solana via LiFi.

5. **Boundary said "only the Solana sub-section changes"** but cleaning up the now-vestigial Jupiter Plugin `<script>` tag at page bottom was necessary collateral — leaving a 100-line dead init script targeting a `#integrated-terminal` div that no longer exists would have been worse than removing it. EVM widget section preserved verbatim.

6. **Done-criteria evidence is API JSON not screenshot.** The LiFi widget refuses to fetch a quote without a connected wallet; without browser-extension Phantom available to Playwright we couldn't visually demonstrate the "0.55% web3-discover" line in the widget UI. Substituted: direct `li.quest/v1/quote` JSON (saved to `product/thoughts/assets/lifi-sol-quote.json`) showing the exact same `integrator/feeSplit` payload the widget surfaces.

## Verification artifacts

- `product/thoughts/assets/lifi-portal-svm-wallet.png` — portal.li.fi Wallets tab showing "Default SVM" + Solana wallet whitelisted.
- `product/thoughts/assets/lifi-widget-solana-evm-rendered.png` — live /tools/swap with both widget instances loaded.
- `product/thoughts/assets/lifi-widget-solana-sol-usdc-loaded.png` — Solana widget with SOL→USDC preselected.
- `product/thoughts/assets/lifi-sol-quote.json` — full quote response: `integrator=web3-discover`, `integratorFee=300000`, `lifiFee=250000`, `fromAmountUSD=9.71`.
- Production URL: https://web3-discover.vercel.app/tools/swap
- Vercel deployment id: `dpl_5cxmC73vHv24UTAZt2uox8C5J8JK`

## Followup implied for the next tick

- Now that BOTH fee paths are live, the binding constraint is **volume to /tools/swap**, not fee plumbing. Funnel work (per-entry sell-CTA prominence, Twitter/Reddit-deeplink campaigns into specific Solana entries) compounds harder than fee-rate experiments.
- The 2-widget pattern works but doubles wallet-provider memory. If we ever add a third chain ecosystem (Sui/TON/etc.) prefer ONE widget with explicit chain picker over N widgets.
- Jupiter Referral PDA path stays dead until we have a way to get 0.003 SOL gas — not worth a separate problem.
