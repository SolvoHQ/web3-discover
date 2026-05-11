## Shipped
- /lists/best-solana-airdrops-2026 (7 entries)
- /lists/best-l2-airdrops-2026 (14 entries)
- /lists/best-points-airdrops-no-snapshot (18 entries)
- /lists/airdrops-under-30-minutes (25 entries)
- /lists/best-perp-dex-airdrops (9 entries)

Total: 73 entry-cells across 5 pages from a 42-entry source, no new content.

## Two deviations from the Boundary's illustrative slugs
1. **best-zero-cost-airdrops dropped** — /airdrops/free already covers
   `$0` / `gas only` filter (shipped tick 47872b9b). A second page with
   identical content would dilute SEO via canonical fight.
2. **best-evm-airdrops-2026 -> best-l2-airdrops-2026** — `EVM` regex
   matched ~30 of 42 entries; that page is essentially /airdrops
   reskinned. `L2` is the tighter, more compelling buyer-intent query
   (14 entries: Arbitrum, Base, Optimism, Linea, MegaETH, Plume,
   Starknet, Ink, Katana, Reya, plus Pendle/Ostium on Arbitrum etc).

The Boundary explicitly said slugs are illustrative not prescriptive —
took that latitude.

## Non-obvious data-shape finding
`airdrops-under-30-minutes` matched **25** entries (60% of directory),
much more than expected. Reason: most projects bucket effort as either
"~30 min setup" (one-time) or "weekly/daily/ongoing". The 30-min cutoff
captures every one-time-setup entry that lacks a recurring component.
Implication: a strong "low-friction starter" narrative the directory
naturally supports — anchor for a future "airdrop starter pack"
newsletter/onboarding angle.

## Architecture note
All 5 filters live in `code/src/lib/lists.ts`. Single source of truth —
both the `[slug].astro` page and the `/airdrops` curated strip consume
the same `LIST_META` array. Adding a 6th list = one entry to the array,
no other code change.

## Verification
- 5 URLs 200 on web3-discover.vercel.app
- Sitemap contains all 5 (Astro sitemap integration auto-picks them up)
- IndexNow 200/200/202 (api/Bing/Yandex) for 5 lists + /airdrops + sitemap

## Indexable surface count
~68 -> 73 indexable surfaces. Each /lists/* page is a SERP entry that
compounds existing 42-entry content into a buyer-intent query without
writing any new content.
