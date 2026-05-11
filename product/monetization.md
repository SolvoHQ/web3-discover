# Monetization — paths to first money

Listed in order of likelihood / time-to-first-dollar. Multiple paths can run in parallel; the goal is to **wire each path before having traffic**, so when traffic shows up the money path is already plumbed.

## Path 1 — Exchange affiliate (most likely first dollar)

**Thesis**: airdrop hunters need to sell airdrop tokens. Major CEXs pay 30–50% lifetime trading commission on referred users. Even 1 active trader = $20–500+ lifetime.

**Concretely**:
- Each listing entry has a "where to sell" footer linking to 2–3 major CEXs via referral.
- A "How to sell your airdrop" guide page with referral CTAs.
- Default targets: Binance, OKX, MEXC, Bybit. Bitget for users in regions where Binance is restricted.

**Wire-up requirements**: register affiliate accounts (Binance referral, OKX affiliate, etc.). Each has a public signup form. NO captcha bypass needed for partner programs typically.

**Risk**: if our user base is mostly very low-volume (claim & dump $50 airdrops), lifetime commissions stay small. Mitigated by volume — 100s of referrals compound.

## Path 2 — Sponsored "Featured" placements

**Thesis**: new projects launching airdrops want eyeballs from people who care about airdrops. Once we have any traffic, sponsorship is the easiest sell.

**Concretely**:
- One "Featured" slot at the top of the index, visually distinct from organic listings (different background, "Sponsored" label, never hidden).
- Pricing: TBD, initially $200–500/week as we have no baseline; revise once we have traffic numbers.
- Sales motion: passive — a `/sponsor` page with concrete offer + an email contact. Inbound only until we have something to point at.

**Wire-up**: add a `/sponsor` page from launch even with $0 traffic, so the URL exists and indexes.

## Path 3 — Premium alerts tier

**Thesis**: serious airdrop farmers want signal faster. A $5–10/mo subscription for Telegram/email push when new airdrops are added, with cutoff-date warnings.

**Concretely**:
- Stripe or Polar checkout.
- Telegram bot or email transactional via Resend.
- Free tier: web access only, daily refresh.

**Wire-up**: not v1. Validate with a `/pro — coming soon` mailing list signup first to gauge demand.

## Path 4 — Pay-to-list pricing (anti-feature variant)

**Thesis**: similar to Sponsored but for protocols who want a permanent listing slot WITHOUT scam-flag scrutiny lowering. This is risky for brand — only consider if it's structured as "verified" badge ($X to verify a project is real) and NEVER as "buy a better placement".

**Decision**: defer; brand integrity matters more than $50 listings.

## Path 5 — Affiliate to adjacent web3 services

**Thesis**: hardware wallets (Ledger, Trezor), bridges, gas-station services, on-ramps (Moonpay, Onramper) all run affiliate programs. Contextual mentions where useful.

**Concretely**: where a listing requires bridging assets, link bridge via referral. Where the user needs a hardware wallet for security, link Ledger.

**Wire-up**: register accounts as needed per-context; do NOT spray affiliate links into every listing.

## Path 6 — Sell aggregated data

**Thesis**: eventually, researchers / VCs / data terminals would pay for a clean JSON feed of vetted active airdrops.

**Decision**: way out of scope for v1. Worth noting because it might be the highest-margin path long-term and shapes whether we should keep our data structured-first from day 1. **Answer: yes, keep data structured.**

## What's wired at launch

- Path 1 (exchange affiliate) — at least 1 exchange (Binance or OKX)
- Path 2 (`/sponsor` page) — page exists with email contact, even if no inbound
- Everything else — deferred

## Honesty rules (non-negotiable)

- Sponsored entries always visually distinct + labelled "Sponsored"
- Affiliate links never hidden — disclose globally in footer and on each page where present
- Never accept payment to change a project's scam-risk flag
- Never list a project we wouldn't farm ourselves
