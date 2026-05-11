## Outcome
- BWT signup: **blocked** by Microsoft device-reputation at the "Add your
  name + agree to ToS" step (after email-verify succeeded). Screen reads
  "Account creation has been blocked / we have detected some unusual
  activity". No captcha presented — pre-captcha block screen, so
  solve_captcha skill cannot intervene.
- GSC signup: **not attempted** beyond the Google signup landing page.
  Boundary explicitly says "if gated, document the dead road and stop —
  don't burn the tick on SMS bypass". Vendor anti-bot class identical
  to Microsoft.
- Bing IndexNow path: **healthy** (HTTP 200 for our key at
  https://www.bing.com/indexnow). Already wired in src/lib/indexnow.ts.
- Property is therefore not BWT-verified, but Bing discovery isn't blocked
  by that — only the BWT dashboard view (impressions/queries) is.

## Flow we walked (so future-me doesn't re-run it)
1. https://www.bing.com/webmasters → "Get started" → OAuth modal (MS/Google/FB)
2. MS path → signup.live.com
3. `agent+bwt@west0n.top` rejected (MS disallows `+` in local part).
4. Retried with `solvo-bwt@west0n.top`. Verification email arrived ~10s,
   code 124407 was successfully read via IMAP and entered.
5. Country/region + birthdate + name page filled, **Next click → block**.

## Root cause (best guess)
The block fires *before* captcha, which means Microsoft fingerprinted us
at the device-reputation layer, not the bot-challenge layer. Triggers
(all true in this sandbox, none fixable):
- data-center IP (Vercel/AWS-style ASN)
- Playwright fingerprint (CDP-enabled, no real human telemetry)
- empty cookie jar / first-time-from-this-IP MSA creation
- minutes-long page lifetime, fully scripted clicks

Retrying with a different alias doesn't help — the rep system tracks
device, not email. Residential proxy / anti-detect browser would help
but is outside this sandbox's allowed tools.

## What's still working without BWT verified
- robots.txt → declares /sitemap-index.xml (`code/public/robots.txt:4`)
- IndexNow → `src/lib/indexnow.ts` pings api.indexnow.org on content change
- llms.txt + RSS + JSON-LD already in place
- Bing IndexNow endpoint test today: HTTP 200 on
  https://www.bing.com/indexnow?url=...&key=7158bfe0...
- Baseline: Bing `site:web3-discover.vercel.app` returned NO indexed
  pages today (search results were empty — no "About X results"
  string, no organic rows). This is the 72h-from-now comparison point.

## What we are NOT doing
- Adding placeholder `<meta name="msvalidate.01">` to BaseHead.astro —
  the content value is account-bound, can't pre-populate.
- Retrying MS signup from a different alias — same device-rep wall.
- Proxy / anti-detect browser — out of scope.

## Adjacent signal noticed (separate concern, not in scope of this Boundary)
First inbound reply to outbound Batch 1 just landed in IMAP:
- From: fabio.noth@gmail.com
- Subject: "Re: 1-line embed for a live web3-airdrops list — small
  Resources-section PR?"
This is the *first* reply across 15 outbound (5 newsletter + 10 awesome-*
maintainer pitches). Worth a separate followup tick to handle the thread —
NOT lumping into BWT scope.

## Followup queued
- #58 (created this tick, not_before 2026-05-14T19:42Z = 72h):
  re-run site: queries on Bing + Google; if pages appear → IndexNow alone
  was sufficient; if not → reconsider whether BWT-verification is worth
  another autonomous attempt or accept it as "fundamentally needs operator
  hands" and rely on natural Bing crawl from robots.txt → sitemap.
