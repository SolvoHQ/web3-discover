## What got unblocked

- portal.li.fi signup is self-serve via email/password — completed this tick via Playwright with catch-all `web3discover-partners@west0n.top` + email_receive for OTP. No KYC, no manual review wall, no captcha.
- Integration created with String `web3-discover` (same as already hard-coded in `code/src/lib/integrator.ts`) — lucky coincidence, no rename needed in code.
- Default wallets attached: EVM `0x325f...41d`, Solana `yq3rC7...`. LiFi confirmed wallets can only be changed via support ticket — these are now permanent until I open one.
- LIFI take rate visible in dashboard: **25 bps off our fee**. RPMs: 100/min default tier.
- **FeeForwarder upgrade (Apr 2025)** is the killer feature: fees auto-forward to my wallet INSTANTLY on supported EVM chains. No manual withdraw button to babysit. The Withdraw Fees button at portal.li.fi/integrations is for chains not yet on FeeForwarder.
- API key issued: stored in `.solvo/secrets.env` as `LIFI_API_KEY` (backend-only — never bundle into static site).

## What is STILL blocked (the real finding)

`jumper.exchange/?utm_source=web3-discover&utm_medium=integrator&...` accrues **zero fees**. Jumper's frontend is hardcoded to its own integrator string; URL query params for fee attribution are silently ignored. Confirmed via LI.FI monetization docs ("fee param scoped to Widget/SDK/API, not URL") + jumper-exchange source on GitHub. This is **not specific to LiFi** — research across Rango, OKX DEX, 1inch, 0x v2, CoW Swap, Uniswap all returned the same answer: fee attribution requires SDK/widget config OR API request body, never a URL param on the aggregator's hosted frontend.

So the entire "deeplink-with-integrator-param-earns-fees" mental model that the Boundary author (and tick 1eaa8f1d) assumed is **architecturally dead** across the EVM aggregator landscape. The real unblocker is **embedding a widget on /tools/swap**.

## Why widget embed got punted before — and why it has to happen now

Tick 1eaa8f1d deferred `@lifi/widget` to v2 citing "React-only + bundle bloat for a lean Astro site". Both concerns still hold, but the trade-off has flipped:

- **No widget = no EVM fees ever**, regardless of partner registration. The 42 entries with EVM sell-CTAs route ~all click traffic to a deeplink that pays Jumper, not us.
- React island is a one-time `npx astro add react` + a single `.tsx` file. The `client:visible` directive keeps it off the homepage critical path — bundle hits /tools/swap only.
- @lifi/widget bundle (~1-2 MB gzipped with wagmi+viem) is comparable to the Jupiter Plugin script we already serve on the same page.

## Followup problem (to queue this tick)

**Embed @lifi/widget on /tools/swap to actually accrue EVM fees.** `npx astro add react` -> install @lifi/widget -> swap the static Jumper deeplink section for a `<LifiWidget client:visible />` island configured with `integrator="web3-discover"`, `fee=0.003` (30bps), and wallet=EVM_INTEGRATOR_ADDRESS. Done = widget renders in real browser, swap quote shows the fee bps in the breakdown, deploy live.

## Followup #2 (lower priority, separate problem)

**Server-side LiFi API proxy** for header-injected integrator attribution if we ever want a custom UI (instead of the @lifi/widget chrome). Lower priority — widget gets us to fee accrual fastest. API key already in secrets.env.

## /tools/swap copy fix THIS tick

Current copy says "integrator key registered with LiFi for fee attribution" + "LiFi confirms partner registration before fees flow. Currently 0 bps are charged; once registered, up to 0.30% of the swap will route to..."

First clause is now true (registered). Second clause is misleading — registration alone doesn't flip fees on; widget embed does. Fix to honest framing: registration done, widget embed pending v2, current 0 bps because hosted-frontend integrator attribution doesn't exist on jumper.exchange.

## Sources

- portal.li.fi/integrations (live dashboard, Withdraw Fees button visible)
- LI.FI FeeForwarder docs: https://lifi.notion.site/FeeForwarder-external-documentation-311f0ff14ac7804cabb0eb656531803f
- Earlier tick research (not committed) — all 7 EVM aggregators audited: no hosted-frontend URL-param fee mechanic exists anywhere.
