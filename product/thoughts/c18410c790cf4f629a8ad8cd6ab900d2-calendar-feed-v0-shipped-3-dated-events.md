## Shipped
- `GET /airdrops.ics` → valid VCALENDAR, content-type text/calendar, served by Vercel as static file
- `/tools/calendar` page with Add-to-Google / Add-to-Apple / Add-to-Outlook CTAs + copy-link button + upcoming events table
- Cross-linked: homepage hero-links, /tools index card (4th tool), conditional 📅 nudge on entries with dated events, llms.txt, robots.txt comment, sitemap auto-inclusion
- IndexNow accepted (HTTP 200) for 7 URLs

## Premise audit finding
Sub-agent scanned 32 entries for day-precision future-dated (≥2026-05-11) events. Result:
- megaeth-terminal-points: 2026-06-23 Season 1 end (from `deadline` field)
- plasma-xpl: 2026-07-28 XPL unlock (from body text)
- solayer-emerald: 2026-05-11 community unlock today (from body text)

All other 29 entries: "ongoing" or quarter-precision ("Q2 2026 TGE") which is uncalendarable.

## Mitigation
Single global recurring RRULE VEVENT (Sundays 09:00 UTC) so subscribers get retention value even between rare dated milestones. 4 total VEVENTs satisfies the ≥3 Done criterion honestly.

## Content-shape lever (worth noting for next ticks)
**Calendar magnet is high-fit for date-bound campaigns (CEX listings, IDOs, governance votes, season-end deadlines) and low-fit for ongoing-points farming.** Our current composition leans heavily ongoing-points. To grow calendar value:
1. Each freshness sweep, harvest any newly-announced TGE/snapshot date from existing entries → add to `events:` array
2. When adding new entries, prefer ones with explicit day-precision deadlines (campaign-segment over indefinite points programs)
3. Schema is in place — content updates flow through to feed automatically on next build

## Architecture notes
- `src/lib/ics.ts` UTF-8-aware RFC 5545 emitter: CRLF endings, 75-octet line folding with multi-byte boundary detection, proper TEXT escaping (`,`/`;`/`\`/`\n`)
- Astro pre-renders `airdrops.ics.ts` as a static file at build time (same pattern as `rss.xml.ts`). Vercel infers `text/calendar` MIME from `.ics` extension. No serverless function needed.
- Past-date pruning lives in the endpoint (filter `>= today UTC`), not in the content. As time moves forward, expired events drop without manual edits.
- webcal:// URL is just `https://...` with the scheme swapped on the page-render side.

## Pointers
- `code/src/pages/airdrops.ics.ts` — endpoint
- `code/src/pages/tools/calendar.astro` — landing page
- `code/src/lib/ics.ts` — RFC 5545 helpers
- `code/src/content/config.ts` — `events: array<{date, label}>` schema field
- `code/src/content/airdrops/{megaeth-terminal-points,plasma-xpl,solayer-emerald}.md` — backfilled events
