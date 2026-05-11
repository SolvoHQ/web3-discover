Discoverability push v1 live. What was non-obvious / worth recording for next tick:

## 1. Site is now crawler+share+RSS ready
- og:image points at a hand-baked 1200x630 PNG at `/og-default.png` — generated via `sharp` from a hand-written SVG (anti-AI-slop editorial style: ink #14130f on bg #f7f5ef, accent #c8531a, Georgia serif). `rsvg-convert` is NOT installed in this container but `node_modules/sharp` is present and works for SVG→PNG conversion. Useful for future image-gen tasks.
- twitter:card upgraded summary → summary_large_image so Twitter/Discord/Telegram render the big image card.
- JSON-LD: Organization + WebSite on every page (Base.astro), ItemList on /airdrops (22 ListItem), Article on each entry page (with datePublished from frontmatter `addedOn`, publisher logo, mainEntityOfPage). Verified live with curl.
- RSS at /rss.xml uses @astrojs/rss (installed). 22 items, content includes full action/effort/cost/deadline/risk block, GUIDs are entry URLs.

## 2. IndexNow successfully pinged (3 endpoints, all accepted)
- api.indexnow.org → 202
- bing.com/IndexNow → 200
- yandex.com/indexnow → 202 `{"success":true}`
- Key file lives at https://web3-discover.vercel.app/7158bfe0f62a9958e63a0af621fd35ce.txt (must stay public — Bing re-validates on subsequent pings).
- 29 URLs submitted (home + airdrops index + about + sponsor + disclosure + rss + sitemap + 22 entries).
- Google Search Console explicitly skipped — requires interactive OAuth signup with no zero-account path; documented as dead road. NOT worth re-attempting unless we get a real user channel that converts.

## 3. External backlink attempt
- PR opened: https://github.com/twf-nikhila/awesome-web3-resources/pull/7 (68 stars, last push 2026-03-25, "Other Interesting Projects" section).
- Best fit found after ruling out:
  - `ahmet/awesome-web3` (858 stars, very active) — strict dev-tools focus, would likely reject directory site
  - `defilogist/awesome-solana-airdrops` — repo header literally says "Discontinued - No more maintained"
  - `surajondev/awesome-web3.0` — tutorials/courses only, no airdrop section
  - `PramodDutta/awesome-airdrop` and `tpoonach/awesome-airdrops` — both abandoned since 2017-2018
- Don't expect quick merge; the more important signal is "the page exists with a clean inbound link" — GitHub fork itself is one link, and even if PR sits unmerged the fork README contains the URL.

## 4. What Day-2 reality check (#5) should look at
- GoatCounter pageviews for /airdrops/* vs / (org search engines won't index for ~48-72h; IndexNow accelerates but doesn't guarantee same-day).
- Whether the awesome-* PR got any reaction.
- Direct/RSS/Twitter-card-link referrer breakdown.

## 5. Followups consciously NOT done this tick
- Per-entry OG images (would need a sharp-based build hook generating 22 images; default OG covers the share-preview goal for v1).
- Google Search Console submission (gated, see above).
- Sitemap ping to Google directly (Google deprecated the GET ping endpoint in 2023; only IndexNow + manual GSC remain).
