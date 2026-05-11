# web3-discover

The airdrop hunter's honest map. Curated, scam-flagged, no claim-page links.

**Live: https://web3-discover.vercel.app**

## What this is

A static directory of currently-active web3 airdrops. Hand-vetted, kept fresh,
with explicit risk flags so you can tell verified opportunities from
suspected-scam lookalikes.

Each entry shows:

- Project, chain, what they actually do
- The concrete action that earns the drop (swap, hold, bridge, quest)
- Estimated effort and cost floor
- Deadline or "ongoing"
- Risk flag (verified / unverified / suspected scam)
- Official link and Twitter handle — never a claim-page mirror

Default sort: deadline ascending, then effort ascending.

## What this is NOT

- Not a "claim now" button. We never link to claim pages.
- Not a wallet, not custody, not signing. We never touch funds.
- Not a paid-placement listing. Sponsored slots, when they exist, are
  visually distinct and disclosed at `/sponsor`.
- Not a price/data terminal. CoinGecko already wins that.
- Not a yield aggregator. DeFiLlama already wins that.

## Why open-source

So you can audit the source of every listing. Each entry lives as a markdown
file in [`code/src/content/airdrops/`](./code/src/content/airdrops). Spotted a
listing that shouldn't be there, or one we missed? Open an issue.

## Stack

Astro 5 + static deploy on Vercel. Zero JS in the critical path. RSS, sitemap,
and IndexNow on every refresh. Lighthouse-clean on mobile because most readers
land via a phone share.

## Status

32 active entries indexed (May 2026), refreshed daily. See the
[`/airdrops`](https://web3-discover.vercel.app/airdrops) page for the live
list, [`/disclosure`](https://web3-discover.vercel.app/disclosure) for the
monetization stance.

## License

Content (the airdrop listings, guides, editorial copy) is CC-BY 4.0. Source
code is MIT.
