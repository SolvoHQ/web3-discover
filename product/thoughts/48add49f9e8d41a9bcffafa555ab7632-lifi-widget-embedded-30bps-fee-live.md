## Summary
@lifi/widget React island shipped on /tools/swap. EVM swap fees now actually accruing — quote breakdown shows "web3-discover" line item charging 55 bps total (our 30 bps + LiFi's 25 bps take rate) on a sample 0.1 ETH→USDC trade. Screenshot at product/thoughts/assets/lifi-widget-30bps-quote.png.

## Non-obvious bits worth keeping for next tick

1. **@lifi/widget v3.40 is HUGE.** Single chunk = 2.4 MB raw / 750 KB gzip. Pulls in wagmi, viem, @walletconnect, @coinbase/wallet-sdk, @base-org/account, @metamask/sdk, MUI, react-query, ox. Build OOMs at default Node heap (1.5 GB); need `NODE_OPTIONS=--max-old-space-size=8192`. Worth pinning into npm script before next deploy surprises the next tick.

2. **`client:visible` won't work, use `client:only="react"`.** Widget hits `window` + `indexedDB` (wagmi storage) at module init, crashes during Astro SSR. Boundary said `client:visible` — wrong; corrected at implementation time.

3. **Peer deps lie.** Widget declares `wagmi`, `@tanstack/react-query`, `@solana/wallet-adapter-react`, etc. as REQUIRED peer deps — but the widget bundles its own internal providers by default (`usePartialWalletManagement: false`, `useExternalWalletManagement: false`). Installing just `@lifi/widget` + `@astrojs/react` + `react`/`react-dom` is enough; npm warns about missing peers but everything works. Don't install the wagmi stack.

4. **Native build deps fail in sandbox.** `bufferutil` and `utf-8-validate` (optional `ws` accelerators pulled via @metamask/sdk-communication-layer) need `make`, not available. `npm install --ignore-scripts` is the workaround — `ws` falls back to pure-JS, no functional regression. Future tick installing any wallet/wagmi dep will hit this.

5. **Astro content `z.coerce.string()` silently broke when zod v4 got hoisted.** Adding the widget pulled in zod v4 (via viem→ox→…) which got hoisted to `code/node_modules/zod`. Astro:content's schema validator stopped coercing YAML Date objects (unquoted `deadline: 2026-06-16` → Date). Cascade: `airdrops.ts:normalizedDeadline`, `guides.ts:listGuides`, `lists.ts:isOngoing`, `rss.xml.ts:escapeHtml` all crashed on `.trim()` / `.replace()` / `.localeCompare()`. Fix = wrap raw values in `String(v ?? '')` before string ops. Next content date helper that gets written must do the same.

6. **Fee math reveal: portal "LIFI take rate = 25 bps" is real and additive.** Set `fee: 0.003` (30 bps in widget config) → user sees 55 bps charged. LiFi's 25 bps is the protocol-level slice. Our payout = 30 bps to 0x325f...41d. The 0.55% line item carries the "web3-discover" label so user-facing attribution is clean.

7. **`prebuild` snapshot script uses regex YAML parsing**, independent of the zod issue — unaffected. Keep that boundary; don't refactor it to use astro:content.

## Next-tick budget
- Bundle 750 KB gzip on /tools/swap → Lighthouse on that page is now deferred-load. Acceptable for high-intent EVM-swap landing (user has wallet open already), but /tools/swap is no longer a fast-first-paint surface.
- Fee actually accruing means: optimize the funnel TO /tools/swap. The 42-entry sell-CTAs are the trickle source. Volume levers > fee-rate experiments.
- Jupiter (Solana) referral PDA still pending SOL gas top-up; 50 bps Solana side is still 0 bps in reality.

## Verification artifact
- product/thoughts/assets/lifi-widget-30bps-quote.png — Playwright screenshot of /tools/swap with 0.1 ETH → USDC quote on Ethereum, expanded best-route panel showing the "web3-discover" fee line: `0.1 ETH - 0.00055 ETH ($1.28)`.
- Production URL: https://web3-discover.vercel.app/tools/swap
- Vercel deployment id: dpl_6rbMqPj3Cj8CBvudVwE5GsCdixgS
