# MVP — web3-discover v1

## One-line

A curated, fresh, scam-filtered directory of currently-claimable and farm-now web3 airdrops, maintained autonomously and updated daily.

## The wedge (specific)

For each active airdrop opportunity, surface:

- **Project** + chain + 1-line description of what they do
- **Action required** — concrete steps that earn the airdrop (e.g. "swap >$10 on their DEX", "hold Wormhole stamp NFT", "complete Layer3 quest")
- **Estimated effort** — minutes / hours / ongoing
- **Cost floor** — $0 / gas-only / $X minimum capital
- **Deadline** — snapshot date or "ongoing"
- **Risk flag** — verified / unverified / suspected scam
- **Official link** + Twitter handle (NOT random claim sites)

Default sort: deadline ascending, then effort ascending.

## Anti-features (what v1 explicitly does NOT do)

- No "claim now" buttons — we link to official channels, never custodial claim pages
- No paid placement disguised as listings — sponsored entries are visually distinct
- No "100+ airdrops" laundry list — quality over quantity, target 20-50 active entries
- No wallet connect / no signing — we never touch user funds
- No price predictions or "expected $ value" claims

The anti-features are the differentiation. Existing airdrop sites compete on volume; we compete on signal-to-noise.

## Target user

**Crypto-native retail user** who already has a wallet, knows what an airdrop is, and is willing to spend a few minutes/hours per opportunity but is tired of:

- Sifting through Twitter threads
- Wondering if a listing is paid promo
- Getting rugged by lookalike claim sites
- Finding out 6 hours after a snapshot

Out of scope for v1: complete crypto beginners, institutional users, KOL/influencer audiences.

## Smallest shippable thing

A single static page at the root, listing the curated entries, server-rendered for SEO, no auth, no JS-heavy interaction. Per-entry pages for SEO long-tail ("[project] airdrop guide"). Daily content refresh via agent tick.

## Done = ?

- 20+ active hand-vetted airdrop entries indexed
- Live URL accessible from the public internet
- Each entry has its own canonical URL for SEO
- At least one path-to-revenue is wired (affiliate link or sponsored slot placeholder)
- Sitemap submitted somewhere indexable

## What proves the wedge

Honest measurable signals, by horizon:

- **Week 1**: site builds, deploys, indexes
- **Week 2-4**: first non-brand organic visitor (any keyword that's not "web3 discover")
- **Day 30**: ≥10 non-brand organic visits/day OR ≥1 affiliate clickthrough
- **Day 60**: ≥1 inbound from a project asking for sponsored placement, OR ≥$10 affiliate revenue
- **Day 90**: ≥$100 cumulative revenue from any source

## Pivot triggers (honest)

- **Day 30, 0 non-brand organic**: wedge is mis-priced; either narrow to a hyper-specific niche ("Solana airdrops only", "Bitcoin L2 airdrops only") or pivot category entirely
- **Day 60, 0 revenue paths working**: monetization model is broken; try sponsored-only or premium alerts
- **Day 90, <$100 total**: pivot to an adjacent discovery niche (web3 grants, hackathons, infra) under the same brand

## Out of scope for v1 (queue for later)

- User accounts / saved watchlist
- Email/Telegram alerts
- Wallet-aware "what am I eligible for?" tool
- Multi-language
- API for embedding listings
- Browser extension that warns about lookalike claim sites
