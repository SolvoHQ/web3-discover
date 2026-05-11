---
name: eng_review
description: Pre-ship engineering critique — architecture, data-flow, error rescue, edge cases, test coverage. Agent invokes during a Boundary execution tick, AFTER design but BEFORE the implementation diff gets large enough to be expensive to throw away.
---

# Engineering review

Rate-then-fix across five axes. The gstack version interleaves
AskUserQuestion per finding; here, you produce a flat list of issues
with severity + confidence and the agent itself decides which to fix
in this tick vs. defer.

## Invocation triggers

- **You have a design / spec for the current Boundary in head**, plus
  maybe a stub file or two, but no large diff yet. This is the
  cheapest moment to catch architecture issues — re-doing 20 LoC is
  free, re-doing 2000 is not.
- **The Boundary introduces a new integration point** (a new external
  API call, a new background job, a new state machine, a new error
  surface, a new public API surface).
- **You're considering adding a fifth file to the Boundary diff** —
  scope-minimality axis exists for this case.

Do **not** invoke for: pure content edits (markdown / data JSON only),
typo/rename diffs, mechanical refactors where the diff *is* the design.

## Axes

| key | name | gist |
|-----|------|------|
| `architecture` | Architecture & data flow | Dep graph, four data paths (happy/nil/empty/error), coupling delta, rollback procedure |
| `error_rescue` | Error & rescue map | Each method that can fail → exception class, rescue action, user-visible result |
| `edge_cases` | Edge cases & interactions | Double submit, stale state, mid-flight timeouts, zero / many results, job dupes |
| `test_coverage` | Test coverage | Per-codepath test existence; hostile-QA test; 2am-Friday test |
| `scope_minimality` | Scope minimality | Files touched > 8 or classes added > 2 is a smell — propose reduction |

Full prompts in `AXES` (Python tuple in `eng_review.py`).

## Severity + confidence calibration

Use both. Severity is "how bad if true". Confidence is "how sure am I".

- **Severity:** `P0` ships breaks something; `P1` will hurt a real user
  within 30 days; `P2` will hurt before next quarter; `P3` cosmetic /
  craft-only.
- **Confidence (from gstack scale):** 9-10 = verified by reading
  specific code / having reproduced; 7-8 = strong pattern match; 5-6 =
  moderate, verify before acting; 3-4 = suppress unless P0; 1-2 =
  speculation.

The shape of an issue:

```python
{
  "axis_key": "error_rescue",
  "severity": "P1",
  "confidence": 8,
  "title": "code/src/lib/github.ts:42 — rate-limit response swallowed silently",
  "detail": "...",
  "fix": "...",
}
```

## Ship-readiness picker

After all issues are listed:

- **ship** — zero P0, zero P1 above confidence 6, overall ≥8.
- **fix-first** — one or more P1s above confidence 6, OR overall 6-7.
  Fix in this same tick before continuing implementation.
- **rework** — overall ≤5, OR a P0 above confidence 7. Re-design.
  Likely worth a thought file documenting what changed in the
  approach.

## Output schema

`product/thoughts/<tick>-eng-review-critique.md`:

```
# Engineering review critique
- tick / written / target / boundary / overall_score / ship_readiness
## Axes
  ### Architecture / Error rescue / Edge cases / Test coverage / Scope minimality
    - Q, Finding (N/10), What would make this a 10
## Concrete issues       (sorted P0 → P3, then by descending confidence)
  ### 1. [P0] (confidence: 9/10) <title>
       Axis, Detail, Fix
  ### 2. ...
## Next actions
```

## How harsh? — example output

Run against a synthesized eng-review of the os-alt `code/` Boundary
(extending the github.ts rate-limit handling and adding a daily build
that fetches OSS-tool metadata for the 30-50 SaaS pages):

```
# Engineering review critique
- target: code/src/lib/github.ts + .github/workflows/daily-fetch.yml
- overall_score: **6/10**
- ship_readiness: **fix-first**

## Axes

### Architecture & data flow
**Finding (7/10).** github.ts is one fetch + one parse. The daily
workflow adds a second consumer (the build) of the same module that
the runtime build also calls — couples to GH rate limits in a way
that wasn't there before. Acceptable, but undocumented.
**What would make this a 10.** A 4-line ASCII diagram in github.ts
showing: workflow-cron → fetch → cache file → build-time read. Today
build-time only does fetch directly, which collapses under GH 60/hr
unauth.

### Error & rescue map
**Finding (3/10).** github.ts catches the fetch promise rejection
but logs `console.error(e)` and returns `null`. A null result silently
collapses to an empty alternatives list on the page. **No user-visible
signal** that this is a github fetch failure vs. genuinely zero
alternatives.

### Edge cases & interactions
**Finding (5/10).** Daily workflow has no concurrency lock. If a
manual trigger overlaps the scheduled run, both will write the cache
file. Last-writer-wins is probably fine but undocumented. Zero-results
case (a SaaS with no OSS alternatives in our JSON) renders an empty
section without explanation.

### Test coverage
**Finding (2/10).** Zero tests in the existing code/ tree. github.ts
has been silently failing in CI for the last week (logged but no
alert) — exactly the bug Section 2 catches.

### Scope minimality
**Finding (8/10).** This Boundary touches 3 files (github.ts +
workflow + types). Within bounds. Could go to 2 if the cache shape is
hoisted out of github.ts.

## Concrete issues

### 1. [P0] (confidence: 9/10) code/src/lib/github.ts:42 — fetch failure swallowed
_Axis_: `error_rescue`
On GH rate-limit or network failure github.ts returns `null` which
the page renderer treats as "no alternatives". Production failure
mode: SaaS pages silently lose their content.
**Fix.** Throw on fetch failure; surface in build output; emit a
build-time warning that the page render can include as a yellow
banner. Don't ship to prod with cached-but-empty data.

### 2. [P1] (confidence: 8/10) .github/workflows/daily-fetch.yml — no concurrency group
_Axis_: `edge_cases`
Manual + scheduled runs can overlap, both write the cache file. No
data corruption likely but flaky CI noise.
**Fix.** Add `concurrency: { group: daily-fetch, cancel-in-progress: false }`.

### 3. [P1] (confidence: 9/10) code/src/lib/github.ts — zero tests
_Axis_: `test_coverage`
github.ts has been silently failing for a week in CI — exactly the
class of bug tests would catch in one commit.
**Fix.** Add vitest test: mock fetch, assert (a) successful response
parses correctly, (b) rate-limit response throws + is caught at the
build level, (c) malformed JSON throws.

### 4. [P2] (confidence: 7/10) code/src/lib/github.ts — coupling undocumented
_Axis_: `architecture`
Adding the daily workflow turns github.ts into a two-consumer module
with no doc note.
**Fix.** 4-line ASCII diagram at the top of github.ts.

## Next actions
- Implement fix for issue #1 in this same tick before adding the daily
  workflow file.
- record_thought capturing the "silently empty page" failure mode so
  the dream pass clusters it under tool-gotchas.
```

## API

```python
from solvo.skills.eng_review.eng_review import AXES, record_eng_review

critique = record_eng_review(
    target_path="code/src/lib/github.ts + .github/workflows/daily-fetch.yml",
    boundary_id="os-alt-daily-fetch-001",
    findings=[
        {"key": "architecture", "rating": 7, "finding": "...", "gap_to_10": "..."},
        # ... one entry per AXES key
    ],
    issues=[
        {"axis_key": "error_rescue", "severity": "P0", "confidence": 9,
         "title": "...", "detail": "...", "fix": "..."},
        # ... one entry per concrete issue
    ],
    overall_score=6,
    ship_readiness="fix-first",
    next_actions=["..."],
)
print(critique.thought_path)
```

## Soft chaining

- `eng_review` benefits from reading a prior `*-ceo-review-critique.md`
  if one exists — the `scope_shape` finding from CEO review is the
  upstream of the `scope_minimality` finding here.
- After `eng_review` returns `fix-first` or `rework`, the agent fixes
  before continuing. After `ship`, the implementation proceeds; if the
  artifact is DX-facing, `devex_review` runs at ship-time.
