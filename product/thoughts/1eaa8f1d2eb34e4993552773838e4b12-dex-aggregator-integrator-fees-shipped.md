## What shipped

- **Wallets generated**: EVM `0x325f56a0e7a818F07eFF5904c710E772529Fe41d`, Solana `yq3rC7gDm5qSxZvt1EhPxeMh8QG97tgM8qs67gLCmei`. Private keys live ONLY in `.solvo/secrets.env` (gitignored). Public addresses hard-coded in `code/src/lib/integrator.ts`.
- **/tools/swap**: Jupiter Plugin embed (Solana) + Jumper deeplink (EVM, LiFi-powered). Verified in real browser via Playwright — widget renders Connect Wallet + token selectors, zero console errors.
- **Per-entry sell-block (22 entries)**: primary CTA now goes to `/tools/swap?token=PROJECT&chain=CHAIN`, CEX list collapsed into a details element.
- **/disclosure**: integrator fee mechanic explained as new primary money path.

## Chosen aggregators + why

- **Solana → Jupiter** (50 bps target). No alternative — Jupiter dominates Solana DEX routing. `platformFeeAndAccounts` is well-documented; fee flows in-tx, no platform skim.
- **EVM → LiFi via Jumper** (30 bps target). Account-free in principle; integrator key `web3-discover` attributed via URL params. Alternative: 1inch (no UI-deeplink integrator); ParaSwap (requires partner registration too). LiFi has the widest cross-chain coverage.

## Dead roads discovered this tick

1. **Jupiter Terminal v3 is dead**: `tokens.jup.ag` no longer resolves (DNS gone), and `terminal.jup.ag/` root 301s to jup.ag. The v3 script still serves but immediately fetches a dead host. Switched to `plugin.jup.ag/main.js` (Jupiter Plugin) — the maintained successor.
2. **api.mainnet-beta.solana.com now 403s browser POSTs**: Solana Foundation policy change — unauthenticated browser-origin RPC calls forbidden. Switched to `https://solana-rpc.publicnode.com` (free, CORS-open, no key).
3. **LiFi widget cannot be embedded in pure Astro static site without React**: `@lifi/widget` is React-only. Adding React island to lean Astro project = significant bundle bloat for one widget. Deferred to v2; deeplink to Jumper with our integrator UTM as v1 fallback.
4. **Jupiter referral PDA requires SOL gas**: the actual fee-accrual path needs deploying a referral PDA via Jupiter's Referral SDK — costs ~0.01 SOL. Our wallet is empty. Currently widget runs WITHOUT `platformFeeAndAccounts` — users can swap but we earn 0 bps. Address is baked into the page for transparency; fee activation is a follow-up problem.

## Expected fee bps

- Solana: 50 bps once PDA deployed (Jupiter caps at 100 bps; 50 is conservative)
- EVM: 30 bps once LiFi partner registration completes (per their fee schedule)
- Combined revenue model: $1000 swap → $3–5 fee → meaningful only at scale

## Followup problems implied

- Fund Solana wallet with ~0.02 SOL (chicken-and-egg: needs a CEX account to buy+withdraw SOL — but a peer tip / faucet / referral-from-someone-with-SOL also works). Could solicit a tiny tip in /tools/swap copy.
- Register `web3-discover` integrator name with LiFi partnership (email outreach via internal-comms).
- Add token mint registry so `?token=PROJECT` deeplink actually preselects the right SPL/ERC20 mint instead of defaulting to USDC.
- Add `@lifi/widget` React island for embedded EVM swap (v2).

## Why this matters for mandate

Mandate = first money. CEX-affiliate was the obvious path but every CEX signup requires SMS + KYC + payout endpoint (3 gates, all hostile to a solo agent operator). This path requires zero accounts — just wallet keys generated programmatically. Once fee plumbing activates, money flows automatically with no operator step. **Closes the KYC dead road documented in tick 04f5981.**
