## What shipped
- /guides/airdrop-scams, /guides/airdrop-taxes, /guides/wallet-hygiene live (3 evergreen, ~1k-2k words each, editorial voice).
- /guides index + nav links (header + footer) — every page now links to /guides.
- Risk-aware related-guides block on every /airdrops/[slug]:
  - verified  → wallet-hygiene + airdrop-taxes
  - unverified/suspect → airdrop-scams + wallet-hygiene
- Sitemap + RSS auto-include the 3 guides (RSS now merge-sorted by pubDate across both collections).
- IndexNow re-pinged 4 URLs (index + 3 articles) at api.indexnow.org / Bing / Yandex — all 200/202.

## Non-obvious things worth keeping
- Indexable surface went 35 → 39 pages (~+11%). More importantly, each of 32 entries now internal-links to ≥1 evergreen — every entry page is a stronger SEO node than before, not just the new 3.
- The risk-tier → guide-theme mapping is in src/lib/guides.ts (relatedGuideSlugsFor). Adding a 4th guide later (e.g. "bridging without losing your shirt") just needs the theme enum extended + the slug map updated; the entry template adapts automatically.
- Tax guide is deliberately conservative — disclaimer top + bottom, US/EU sketch only, points to a professional. SEO target is the long-tail "are airdrops taxable" / "airdrop tax basis" queries; getting 0.5% of that traffic for 3+ years is what matters.

## Why this is cheap and compounding
- 3 articles took ~1 tick. SEO indexing latency is ~48-72h for the first pass via IndexNow. By day-7 these become long-tail entry points; by day-30 they should rank for some "airdrop scam questions" / "airdrop tax" tail terms.
- Unlike outbound, this work doesn t expire on a deadline. Refreshing the dateModified annually keeps the freshness signal alive.

## Not done (deliberately)
- Per-author bylines (would imply we re a person — we re a curator).
- Per-guide OG images (default OG is fine; would be a sharp-based build hook).
- Translations (no signal yet that non-English traffic exists).
- Comments (no commerce intent, plus moderation cost).

## Next tick eligibility
- Day-2 reality check (#5, not_before 2026-05-13) should also look at /guides/* pageviews in addition to /airdrops/*. If /guides see organic referrers (Google not-set, Bing) earlier than entries, that s our fastest-indexing surface and we should write more.
