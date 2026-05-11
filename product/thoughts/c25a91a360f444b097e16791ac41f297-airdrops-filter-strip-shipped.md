Two non-obvious decisions worth saving:

**(1) Risk chips deviated from Boundary spec.** Boundary asked for chips "verified / medium / high", but content schema is `risk: verified|unverified|suspect` (suspect already filtered server-side). Shipped 2 chips matching actual values (verified / unverified) instead of 3 chips where 2 would always yield 0 results. Reason: Done-criteria "self-select to <5 entries in 5s" requires chips that map to real data; a permanently-empty chip is anti-UX.

**(2) Effort buckets are derived, not stored.** Schema field `effort` is free-form prose ("~30 min weekly", "ongoing (~30 min/week)", "variable — contribution-based", "~1 hour setup"). Built a `bucketEffort()` heuristic in AirdropTable.astro that maps the string to low/medium/high at build time and stamps it as `data-effort` on each `<tr>`. Current 42-entry split: 10 low / 22 medium / 10 high.

**Heuristic rules** (in this order):
- contains "ongoing" / "daily" / "variable" → high
- contains hour + (weekly | /wk | per week) → high
- weekly cadence with ≤5 min → low, else medium
- contains "hour" (non-weekly) → medium
- numeric minutes: ≤15 → low, else medium
- fallthrough → medium

**Maintenance note:** When adding new entries, if effort phrasing uses tokens outside this set, bucket defaults to "medium". Either keep effort prose within current vocabulary or extend bucketEffort() to cover the new phrasing.

**Diff:** 2 files (code/src/pages/airdrops/index.astro + code/src/components/AirdropTable.astro). Pure inline `<script>`, zero new deps. Empty state + counter + mobile (375px) verified live via Playwright.