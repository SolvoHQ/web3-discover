## What shipped
- **Entry-page CTA**: 42/42 `/airdrops/[slug]` pages now render an above-the-fold eligibility banner deep-linking to `/tools/eligibility?focus=<slug>`. Copy variants: has-rule → "Check my eligibility"; in NO_RULE_REASON → "Manual check guide" (names the gating reason).
- **Focus deep-link**: `/tools/eligibility` reads `?focus=`, renders a green "From the <project> page →" banner, tags every rendered card/li with `data-slug`, scrolls + pulse-highlights the match after evaluation.
- **MCP check_eligibility (4th tool)**: server-side port of the page evaluator in `code/api/mcp.mjs`. Verified live: `curl tools/list` returns 4 tools; `tools/call` for vitalik.eth returns 9 eligible.
- **dev.to article**: https://dev.to/weston_g/paste-a-wallet-get-a-personal-airdrop-verdict-and-call-the-same-logic-from-any-llm-4ej0
- **punkpeye/awesome-mcp-servers PR #6205**: rebumped from 3→4 tools / 32→42 entries on existing OPEN branch (did NOT open a duplicate PR).

## Non-obvious things worth keeping
- **Vercel serverless bundles only ship files under `api/`** — relative imports from `../src/` don't survive deploy. Pattern: prebuild script copies `src/data/eligibility-rules.json` → `api/_eligibility-rules.json` (next to the existing `_airdrops.json` mirror). Same trick scales to any future MCP tool that needs shared data.
- **Rule source-of-truth = JSON, not TS**. `eligibility-rules.ts` now imports the JSON and re-exports it with types. Both the browser bundle and the MCP function read identical data. Adding a rule = edit one JSON file.
- **publicnode RPCs work from Vercel serverless** (and remain CORS-open for the browser): confirmed 9 eligible for vitalik via prod `/api/mcp` end-to-end. No proxy needed for either surface.
- **punkpeye PR was still OPEN** (created 2026-05-11T14:00, never merged). Updating the existing branch + commenting is correct — opening a duplicate would be obvious spam. Same trick applies if/when their fast-tracker (🤖🤖🤖) takes longer.

## Pointers
- `code/src/data/eligibility-rules.json` — source of truth (14 rules + 28 no-rule reasons)
- `code/api/mcp.mjs` — `toolCheckEligibility` + evaluator (mirror of page logic)
- `code/src/pages/airdrops/[slug].astro` — CTA block + style (line ~125 onwards)
- `code/src/pages/tools/eligibility.astro` — `FOCUS_SLUG` + `el-focus-banner` + `.el-focused` keyframe
