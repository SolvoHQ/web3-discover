---
name: dx_audit
description: Pre-ship DX critique with persona + competitor + magical-moment framing. Invoke when you are about to `commit` or `deploy` a Boundary AND `git status` shows changes under any externally-facing path — concretely: `code/src/pages/`, `code/src/app/api/`, `code/src/cli/`, an SDK / npm / pip package source, a public docs site, a landing page meant to convert, or any first-touch surface a developer / user will hit before signing up. Skip if the diff is internal-only (build scripts, internal tooling, infra-as-code).
---

# DX audit

Pick a persona. Trace TTHW (Time To Hello World). Benchmark against
real competitors. Design a magical moment. Then rate-then-fix across
six passes. The gstack version asks the human; you pick autonomously.

## When to invoke (mechanical triggers)

Each trigger is something you can verify yourself from the current tick:

- **You are about to call `commit` or `deploy` AND `git status` shows
  changes under an externally-facing path** — pages (`code/src/pages/`,
  `code/src/app/`, `code/app/`), public HTTP API
  (`code/src/app/api/`, `code/api/`, `code/server/routes/`), CLI
  (`code/src/cli/`, `code/bin/`, or any file with `#!/usr/bin/env`),
  an SDK / npm / pypi package source, or docs / marketing pages
  (`code/docs/`, `code/content/`, landing / pricing / about).
- **The Boundary's description mentions any of "API endpoint", "new
  command", "SDK", "embed widget", "MCP server", "landing page",
  "getting started", "onboarding", "install flow"** — even with no diff
  yet, run dx_audit during design so the magical moment is shaped into
  the spec, not retrofitted after.
- **You just changed an error message a developer or user will see**
  (toast, CLI stderr, build-time warning, page 500 / 404, install
  error) — TTHW collapses fastest on a confusing first error.
- **You just changed an onboarding / install / first-run path for a
  developer-facing artifact** — that's the TTHW hotspot.

Skip when: changes are limited to internal-only tooling (build scripts,
internal cron, infra-as-code), content that informs but doesn't
convert (blog post, internal README), or a refactor that doesn't
change any developer-visible surface.

## Mode picker (autonomous)

| mode | when to pick | posture |
|------|--------------|---------|
| `expansion` | First DX-facing artifact in this workspace AND a known competitor exists | Push for advantage: propose 1-2 ambitious DX moves the plan doesn't cover |
| `polish` (default) | Iteration on an existing DX-facing artifact | No scope additions; make every touchpoint bulletproof |
| `triage` | Shipping in a hurry / hotfix to existing surface | Only flag gaps that would block adoption — skip nice-to-haves |

Use `pick_mode(is_first_external_artifact, is_hotfix, competitor_present)`.

## TTHW tiers

| tier | minutes | what it means |
|------|---------|----------------|
| Champion | ≤ 2 | Stripe/Vercel; 3-4x adoption multiplier |
| Competitive | 2-5 | Baseline for modern dev tools |
| Needs Work | 5-10 | Significant drop-off |
| Red Flag | > 10 | 50-70% abandon |

Estimate the **actual** current TTHW honestly (the time from "found
this on Google" to "saw a real result"). Decide a target tier. The
gap between actual and target tier drives the `getting_started` pass
rating.

## Persona schema

Before the six passes:

```
{
  "who":       "<one-line role + level — 'Backend dev integrating an API'>",
  "context":   "<when/why they encounter this tool>",
  "tolerance": "<how many minutes/steps before they abandon>",
  "expects":   "<what they assume exists before trying>"
}
```

You pick. Don't waffle. The whole review hangs on this persona — every
finding references "would this persona, with this tolerance, accept
this state?".

## Competitive benchmark

Build a small table of 2-3 real competitors. For each: tool name,
their TTHW in minutes (honest estimate or cited number), one notable
DX choice, source (URL or `WebFetch` thought-file pointer if you ran
one). The gstack version uses WebSearch interactively — for Solvo,
either use prior knowledge or run a WebFetch in the same tick and
cite it.

## Magical moment

One sentence: the specific instant a developer goes from "is this
worth my time?" to "oh wow, this is real." Examples by archetype:

- **API:** first response from a real curl call shows useful data.
- **CLI:** one `npx create-foo my-app` produces a running app.
- **SDK:** 3 lines + an `import` produces a working flow.
- **Embed widget:** paste-script → working component on the page.

Name the delivery vehicle (interactive sandbox, copy-paste demo
command, GIF/video, guided tutorial with the dev's own data). Mode
`expansion` lets you propose vehicles the plan doesn't include; mode
`polish` accepts the planned vehicle and just makes it sharper.

## The six passes (rate-then-fix)

| key | name | gist |
|-----|------|------|
| `getting_started` | Getting Started | TTHW, install, first-run, magical moment delivery |
| `api_design` | API/CLI/SDK design | Naming, defaults, consistency, guessability |
| `error_messages` | Errors & debugging | What happened / why / fix / where to learn / actual values |
| `docs` | Docs & learning | Findable in 2 min; copy-paste-complete code; tutorial vs reference |
| `upgrade_path` | Upgrade & migration | Deprecation warnings; migration guides; codemods |
| `tooling_fit` | Tooling fit | Editor, CI mode, types, cross-platform, dry-run |

Full prompts in `PASSES` (Python tuple in `dx_audit.py`).

For each pass: rate 0..10, state the finding referencing the persona
("a `<persona>` would hit this at minute X"), state what a 10 looks
like for **this artifact**, then either propose a concrete fix or
accept with a documented reason.

## Ship-readiness picker

- **ship** — overall ≥8, `getting_started` ≥7, no P0 issues.
- **polish-first** — overall 6-7, OR one pass at 4-5, OR a P1 in
  `getting_started` / `error_messages`. Fix in this same tick.
- **rebuild-onboarding** — `getting_started` ≤4 OR TTHW lands in Red
  Flag tier. The onboarding flow is the problem; do not ship and
  iterate-into-it. Re-design the install + first-run before re-running
  this audit.

## Output schema

`product/thoughts/<tick>-dx_audit-critique.md`:

```
# DX audit critique
- tick / written / target / mode / overall_score / ship_readiness
## Target developer persona      (who / context / tolerance / expects)
## TTHW                          (current minutes + tier vs target tier)
## Magical moment
## Competitive benchmark         (markdown table)
## Passes
  ### Getting Started / API design / Errors / Docs / Upgrade / Tooling fit
    - Q, Finding (N/10), What would make this a 10
## Concrete issues               (sorted by severity)
## Next actions
```

## How harsh? — example output

Run against `os-alt` shipping its first SaaS comparison page (a
Notion → self-host directory page that's meant to convert search
traffic). Mode picked as `expansion` because os-alt has zero DX-facing
artifacts shipped yet and openalternative.co is a present competitor.

```
# DX audit critique
- target: code/src/pages/notion.astro (representative first vertical page)
- mode: **expansion**
- overall_score: **5/10**
- ship_readiness: **polish-first**

## Target developer persona
- **Who.** Mid-stage startup engineer evaluating "drop Notion for OSS".
- **Context.** Hit our page via "self-host notion alternative" Google.
- **Tolerance.** 90 seconds on the page; one tab over to GitHub on a
  promising candidate, then back. Bounces if no decision-grade data.
- **Expects.** Setup time, monthly $ on a VPS, a one-paragraph
  migration sketch — the exact wedge from mvp.md.

## TTHW
- Current estimate: **8 min** (Needs Work) — page → click GitHub →
  read README → bounce back → repeat per candidate.
- Target tier: **Competitive (2-5 min)** — page itself should give
  enough to decide for 80% of visitors without leaving.

## Magical moment
The persona scans the page once and walks away with a "yes try
AppFlowy, costs ~$5/mo, 30-min docker-compose, migration is JSON
export + script" sentence in their head. Delivery vehicle: per-row
"the verdict" 2-line summary above the long-form section.

## Competitive benchmark
| Tool | TTHW (min) | Notable DX choice | Source |
|------|------------|--------------------|--------|
| openalternative.co | 3 | Stars + last-commit visible per row, single-page | manual eval |
| awesome-selfhosted | 12 | Categorized list, no setup-time, requires GH spelunking | manual eval |
| LLM direct-asked | 1 | Conversational answer, often wrong/outdated | manual eval |

## Passes

### Getting Started — zero friction at T0
**Finding (4/10).** Page-as-onboarding: works without install, no
auth, no signup. But TTHW for a decision is 8 min because each
candidate forces a GitHub round-trip. Magical moment is undelivered —
the per-row 2-line verdict doesn't exist yet.
**What would make this a 10.** Per-row "verdict line" rendered at
build time from the JSON: `AppFlowy — yes, ~$5/mo, 30min setup,
migration via JSON export`. Render it BEFORE the long-form section so
scanners can decide without scrolling.

### API/CLI/SDK design — usable + useful
**Finding (6/10).** N/A for content pages — but the page IS the API
for this persona. Schema is consistent across SaaS pages (good).
Names match google search intent (good). Gap: no "compare these two"
affordance — the persona who wants AppFlowy vs Outline has to scroll
both sections.

### Error messages & debugging — fight uncertainty
**Finding (3/10).** If github.ts fetch failed in the daily build,
the page silently renders an empty alternatives block — see
architecture-audit issue #1. To the persona, that looks like "this
SaaS has no OSS alternatives" — a content failure, not a fetch
failure. Lost trust.
**Fix.** Build-time guarantees the page has ≥N alternatives or fails
the build for that page (skip the page rather than ship empty).

### Documentation & learning — findable + learn-by-doing
**Finding (6/10).** Each alternative links to its GitHub. Good. No
in-page setup snippet (e.g. the docker-compose 4 lines that 60% of
visitors need). Forcing them to leave the page for a 4-line snippet
is a magical-moment killer.
**Fix.** Add a `setup_snippet` field to the JSON schema; render a
collapsible <details> block per alternative for the snippet.

### Upgrade & migration — credible
**Finding (5/10).** Page itself doesn't version, but the JSON schema
will. No "schema version" or "last-verified-on" field visible to the
persona. A page that confidently states cost / setup-time without
showing freshness loses to a competitor that does.
**Fix.** Add `last_verified: 2026-05-01` per alternative, rendered as
a small tag.

### Tooling fit — valuable + accessible
**Finding (7/10).** Static HTML, accessible, mobile-friendly,
indexable (sitemap + structured data per mvp.md success criteria).
Good. Missing: an RSS / JSON feed so an external aggregator (or our
own future product) can re-use the dataset.

## Concrete issues

### 1. [P1] First-touch persona bounces at 8 min for decision (TTHW gap)
_Pass_: `getting_started`
Page forces GitHub round-trips per candidate. 8 min is Needs Work
tier vs a Competitive 2-5 min target.
**Fix.** Per-row verdict line + per-row collapsible setup snippet.

### 2. [P1] Empty alternatives block on github.ts failure
_Pass_: `error_messages`
Mirrors architecture-audit issue #1. Persona sees "no alternatives"
not "data fetch failed". Trust killer.
**Fix.** Build fails the page on empty alternatives; skip rather
than ship.

### 3. [P2] No freshness signal per alternative
_Pass_: `upgrade_path`
Persona can't tell if the cost / setup-time claim is from 2024 or
yesterday.
**Fix.** Add `last_verified` field + render as a tag.

### 4. [P2] No compare-two affordance
_Pass_: `api_design`
Persona evaluating AppFlowy vs Outline does double-scroll.
**Fix.** Either a sticky-pin checkbox per alternative + a compare
view, or deferred to TODOs.

## Next actions
- Implement issue #1 (verdict line + setup_snippet) in this same
  Boundary if scope allows — otherwise carve a follow-up Boundary.
- Coordinate issue #2 with the architecture_audit fix on github.ts
  (same root cause, different surface).
- record_thought tagged dx-gap: "first-touch verdict line is the
  highest-leverage DX move for vertical pages".
```

## API

```python
from solvo.skills.dx_audit.dx_audit import (
    PASSES, pick_mode, tier_for_tthw, record_dx_audit,
)

mode = pick_mode(
    is_first_external_artifact=True,
    is_hotfix=False,
    competitor_present=True,
)
# → "expansion"

critique = record_dx_audit(
    target_path="code/src/pages/notion.astro",
    mode=mode,
    persona={
        "who": "Mid-stage startup engineer evaluating drop-Notion-for-OSS",
        "context": "Found us via 'self-host notion alternative'",
        "tolerance": "90 seconds; one GitHub round-trip max",
        "expects": "setup time, $/mo, migration sketch",
    },
    tthw_actual_minutes=8,
    tthw_target_tier="Competitive",
    magical_moment="Persona walks away with a one-sentence verdict per candidate.",
    competitor_benchmark=[
        {"tool": "openalternative.co", "tthw_minutes": 3,
         "notable": "Stars + last-commit per row", "source": "manual eval"},
    ],
    findings=[
        {"key": "getting_started", "rating": 4, "finding": "...", "gap_to_10": "..."},
        # ...
    ],
    issues=[
        {"pass_key": "getting_started", "severity": "P1",
         "title": "...", "detail": "...", "fix": "..."},
    ],
    overall_score=5,
    ship_readiness="polish-first",
    next_actions=["..."],
)
print(critique.thought_path)
```

## Soft chaining

- If a prior `*-architecture_audit-critique.md` exists for the same
  Boundary, read it — DX issues often share a root cause with
  engineering issues (empty-result rendering is the classic case).
- `dream` will cluster `*-dx_audit-critique.md` files under a DX
  theme; recurring `error_messages` ≤4 findings across two reviews
  is exactly the signal that should distill into a `principle/dx-
  error-surfacing.md`. Don't try to chain that yourself.
