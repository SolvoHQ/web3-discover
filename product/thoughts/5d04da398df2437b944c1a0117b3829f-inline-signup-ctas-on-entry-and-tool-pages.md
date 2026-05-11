## What shipped
- New `src/components/InlineSignup.astro` — reusable Astro partial; props: `source`, `copy`. POSTs to `/api/subscribe` (same endpoint /subscribe.astro uses). On 200, calls `window.goatcounter.count({path:"signup-"+source, event:true})`.
- Embedded on:
  - `airdrops/[slug].astro` — mid-page, after meta dl, before `<Content />`. source = `entry-{slug}` (42 surfaces).
  - `tools/wallet-check.astro` — server-rendered `<div id="wc-signup" hidden>`; `renderResults` unhides when `totalMatches > 0`. source = `tool-wallet-check`.
  - `tools/calendar.astro` — top of hero container, above kicker. source = `tool-calendar`.

## Done-criteria evidence
- HTTP 200 on `/airdrops/aster-stage-6` with `class="inline-signup"` + `data-source="entry-aster-stage-6"`.
- Playwright synthetic on entry page → Resend contact created + gc.count fired `{path:"signup-entry-aster-stage-6", event:true}`.
- Playwright synthetic on /tools/calendar → Resend contact created + gc.count fired `{path:"signup-tool-calendar", event:true}`.

## Non-obvious: attribution is GoatCounter-only
Boundary said do not refactor /api/subscribe. The existing handler reads `email` + `chain` and discards everything else, including the `source` field I send. So:
- Resend Audiences has NO source column. You cannot ask Resend "which surface drove this signup?".
- Canonical attribution = GoatCounter event paths `signup-{source}`.
- For day-2 (#5) reality check: query GoatCounter event counts for paths matching `signup-*` and compare to total Resend contacts; large gap = client-side JS failed somewhere.

## Quirks
- count.js loads async (Base.astro:71). InlineSignup script does a `typeof` guard so submitting before gc.count is ready just skips the event silently — contact still gets created.
- wallet-check form HTML always ships to the client, then gets unhidden by JS only when match count > 0. A curl probe will find the markup either way.
