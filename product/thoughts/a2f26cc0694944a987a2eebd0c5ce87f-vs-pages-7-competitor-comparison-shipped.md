## 结论
7 buyer-intent comparison pages live at /vs/<slug>, each one targets the exact "<competitor> vs us" query a directory-evaluator types. Sitemap-indexed (7 entries in /sitemap-0.xml). "Compare to other directories" strip wired into /airdrops index footer (links all 7).

## Competitor picks + why
- airdrops-io / airdropalert / airdrop-com — volume directories (high search volume, recall-vs-precision contrast lands clean)
- earnifi — claim-finder (different job; counter-take is honest: "use them for claims, us for forward-looking")
- layer3 — quest platform (different model; counter-take: complements not substitutes)
- defillama-airdrops / dappradar-airdrops — side-feature-in-bigger-product (counter-take: cross-reference TVL/dapp data)
- Dropped alphabot from candidates: NFT-raffle, not airdrop-directory comparison target.

## Non-obvious bits
- 7-axis table is tied to product features that already exist (MCP, embed.js, /api/airdrops.json, /tools/eligibility, /airdrops.ics, weekly digest, CC0 mirror). Page works as feature discovery for users, not just SEO bait.
- Counter-take (When to use them instead) is what makes the page defensible — without it the SERP serves a competitor-hate page that Google increasingly de-ranks. Each page names at least 3 honest scenarios where the competitor wins.
- ComparisonPage schema.org type does not formally exist — used WebPage with about[] referencing both Things instead. FAQPage + BreadcrumbList added separately.

## Operational gotcha worth keeping
- Sandbox DNS cannot resolve web3-discover.vercel.app (the alias) even though vercel.app resolves. Workaround: curl --resolve web3-discover.vercel.app:443:64.29.17.3 https://.... Use this for any future prod verification curl. (Resolver vs Docker DNS issue; not a Vercel issue.)

## Compounding mechanism
16 awesome-* PR backlinks already in flight → audience that lands on the site will eventually re-search <competitor> vs web3-discover before deciding. These 7 pages catch that exact buyer-intent query and CTA to /airdrops + /tools/eligibility + /subscribe.

## Files touched
- code/src/lib/competitors.ts (new — 7-entry data file, 1 module)
- code/src/pages/vs/[slug].astro (new — getStaticPaths page)
- code/src/pages/airdrops/index.astro (added compare strip + style + import)
