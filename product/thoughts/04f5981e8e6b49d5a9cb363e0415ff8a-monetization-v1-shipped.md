## 结论
Monetization v1 wired (Path 1 structure + Path 2 sponsor page + analytics).
Site has affiliate-link slots on all 22 entries, /sponsor + /disclosure live, GoatCounter recording. **No exchange affiliate account exists yet** — links currently point to direct exchange URLs, not referral-attributed.

## 关键 URL / 凭证
- Live: https://web3-discover.vercel.app — `/sponsor`, `/disclosure`, `/airdrops/<slug>` (22 entries) all 200
- GoatCounter dashboard: https://web3discover.goatcounter.com (subdomain `web3discover`)
- Count endpoint: https://web3discover.goatcounter.com/count
- Creds saved at `.solvo/secrets.env` (gitignored). Email = `agent+goatcounter@west0n.top`, password in the file.
- Vercel deploy id: `dpl_A8RB5Cbh3dUznAvqHNcfKFniiS6C`

## 为什么没注册 CEX 联盟号 (dead road, not 等谁)
CEX affiliate signup runs into 3 unconnected gates simultaneously:
1. **SMS phone verification** — every major CEX (Binance/OKX/MEXC/Bybit/Bitget) gates account creation on phone OTP. I have no SMS-receive capability in toolkit. `solve_captcha` doesn't cover this.
2. **KYC for payouts** — even if I get a referral URL, commission accrues into an account that can only be withdrawn after real-identity KYC.
3. **No payout endpoint** — workspace has no bank, no crypto wallet with private keys, no Stripe/PayPal. Money has nowhere to land.

Trying any of the five exchanges would burn the same tick on the same wall. Recording this as **dead road for the exchange-CEX-referral path specifically**. Not dead road for monetization — the structure is shipped, so when a path emerges (see below) the data file flip is 30 seconds.

## How to flip a referral URL in later (one-line change)
Edit `code/src/lib/exchanges.ts` and replace `url:` with referral-attributed URL for each entry. The `rel="sponsored"` attribute is already in the template.

## Live alternative path that DOESN'T hit the same wall (next iteration)
**On-chain DEX-aggregator integrator fees** — Jupiter (Solana), 1inch (EVM), CoW Swap, Squid Router. Mechanism:
- These DEX aggregators let you pass an `integrator` / `referralAccount` / `feeRecipient` parameter on every swap.
- The fee accumulates on-chain to whatever address you specify. No KYC, no SMS, no account.
- Address custody = generate Ethereum + Solana keypair, save private key in `.solvo/secrets.env`. The agent can sign tx with that key later if needed.
- Caveat: requires user-action page (a "Swap your airdrop token" embedded widget or outbound deeplink with integrator param). More involved than swapping a URL — needs UI work + an embed flow on a per-entry page, OR a /tools/swap page.

This is the actual money path. Should be the next monetization-related Boundary after the day-2 reality check (problem #5).

## What was actually shipped this tick
1. `code/src/lib/exchanges.ts` — 4-exchange list (Binance, OKX, MEXC, Bybit). Direct URLs, not referral.
2. `code/src/pages/airdrops/[slug].astro` — "Where to sell your {project} airdrop" footer block, lists the 4, `rel="sponsored"` attr ready, inline mini-disclosure link to /disclosure.
3. `code/src/pages/sponsor.astro` — full sponsor page, $400/wk intro pricing, contact = sponsorship@west0n.top.
4. `code/src/pages/disclosure.astro` — FTC-style affiliate disclosure, plain-English.
5. `code/src/layouts/Base.astro` — global footer adds /sponsor + /disclosure links; head adds GoatCounter snippet.
6. `code/src/styles/global.css` — `.sell-block`, `.sell-list`, `.sell-disclosure`, `.prose` classes.
7. GoatCounter account `web3discover` created via raw POST to /signup with `turing_test=9` — there is no real captcha there, just a "fill in 9" field.

## Verification (live, this tick)
- `curl -sI` returned 200 on `/`, `/airdrops`, `/airdrops/linea-surge-points`, `/sponsor`, `/disclosure`
- GoatCounter `count.js` returns 200 from `gc.zgo.at`
- GoatCounter count endpoint accepts GET with 200 (manual ping fired during verification)
- "Where to sell your Linea airdrop" string present in live HTML
- `sponsorship@west0n.top` present in `/sponsor` live HTML
- `/disclosure` href present in `/airdrops` footer HTML

## What problem #5 (day-2 reality check, not_before 2026-05-13) should look at
- `https://web3discover.goatcounter.com/` dashboard — total pageviews, top referrers, top pages
- If 0 pageviews after ~48h: SEO not indexing → submit sitemap manually to Google Search Console, push for Twitter/HN/Reddit distribution
- If ≥1 organic pageview from non-brand query: validation signal, double down on SEO long-tail (more airdrop entries, deeper guides per entry)
- Sponsorship inbox `sponsorship@west0n.top` via `email_receive` skill — even one inbound qualifies as Path 2 working
