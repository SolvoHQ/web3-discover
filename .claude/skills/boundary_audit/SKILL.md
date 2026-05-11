---
name: boundary_audit
description: Premise + scope + trajectory critique of a Boundary you just authored. Invoke when you have called `checkout.add_problem(...)` in this same tick and have NOT yet called `checkout.get_next()` on it — i.e. the Boundary exists in the queue but hasn't been picked up for execution. Picks one of four modes (expansion / selective / hold / reduction) from observable state, rates 6 axes 0-10, then either edits the Boundary or accepts each axis with a reason. Catches "scoping a Boundary >300 LoC of edits" and "Boundary on an unvalidated premise" before tick budget is committed.
---

# Boundary audit

Rate each axis 0-10. For each axis below 10, explain what would make it
a 10, then edit the Boundary toward that. The gstack version asks the
human "which mode should I run in?" — here you pick the mode yourself
from heuristics.

## When to invoke (mechanical triggers)

Each trigger is something you can verify yourself from the current tick:

- **You called `checkout.add_problem(...)` earlier in this tick and the
  resulting row has not yet been `get_next()`'d.** That's the canonical
  window — the Boundary is queued, not yet in flight, so the audit can
  still edit / reframe / kill it without contesting an active execution.
- **You authored a Boundary on a new direction in this tick AND a
  `*-wedge_audit-critique.md` was written in the current or previous
  tick.** Run `wedge_audit` first (premise gate), then `boundary_audit`
  (scope / trajectory gate). The two stack.
- **You are about to call `add_problem` with a description longer than
  ~300 words / that touches >5 files / that introduces a new external
  integration.** Large Boundaries almost always survive `boundary_audit`
  in `reduction` mode. Run the audit before you queue it.
- **A `record_thought` you wrote this tick flagged a pivot AND you
  authored the new direction's first Boundary on the same tick.** That
  Boundary inherits the pivot's premise risk — audit it.

Skip when: the Boundary is a hotfix where scope is mechanically dictated
by the bug (mode would be `hold` trivially), it's a pure refactor with
zero behaviour change, or it is a continuation of an already-audited
plan (a previous `*-boundary_audit-critique.md` covers this scope).

## Mode selection (autonomous)

The four modes, in order of how aggressive the critique is:

| mode | when to pick it | posture |
|------|-----------------|---------|
| `expansion` | Pre-launch, validated premise, you have room to dream | Push scope UP — "what would make this 10x better for 2x the work?" |
| `selective` | Has users, validated premise, iteration on existing | Hold scope as baseline, surface specific cherry-pickable expansions |
| `hold`      | Hotfix, refactor, pivot-without-traffic | Make existing scope bulletproof; no expansion proposals |
| `reduction` | Boundary feels too big, touches >5 files, or unvalidated premise | Find the minimum viable cut that achieves the core outcome |

Use `pick_mode(boundary_size, has_users, is_pivot, is_hotfix)` for a
default; override if you have evidence the heuristic misses. Record the
rationale either way (`mode_rationale` field).

## Axes (the rate-then-fix substance)

| key | name | the one-sentence forcing question |
|-----|------|------------------------------------|
| `premise` | Premise challenge | Is this the right problem to solve? |
| `existing_leverage` | Existing-code leverage | What's being rebuilt that already exists? |
| `scope_shape` | Scope shape | Right size? What's the one cuttable item? |
| `trajectory` | Trajectory fit | Does this move toward the 12-month ideal? |
| `inversion` | Inversion | Top 3 ways this ships and is still a waste? |
| `reversibility` | Reversibility | One-way door or two-way? Rollback cost? |

Full prompts in `AXES` (Python tuple in `boundary_audit.py`).

For each axis: rate 0..10, state the finding, state what a 10 would
look like for **this Boundary** (not abstractly), and either propose a
concrete fix (edit the Boundary text) or accept the current state with
a documented reason.

## Decision picker

After all axes are rated:

- **proceed** — overall ≥8, no axis below 6, no premise-axis red.
- **revise** — overall 6-7 or one axis at 4-5; fix the axis, re-rate
  before re-running.
- **reframe** — `premise` axis ≤3. The Boundary is solving the wrong
  problem. Record a thought, then re-author the Boundary against the
  reframed premise. Do not patch — re-author.
- **kill** — premise + trajectory both ≤3, AND mode is `reduction` or
  `hold`. Just stop. Move the energy to a different Boundary.

## Output schema

`product/thoughts/<tick>-boundary_audit-critique.md` is written by the
module with the following structure:

```
# Boundary audit critique
- tick / written / target / mode (+rationale) / overall_score / decision
## Axes
### Premise challenge / Existing leverage / Scope shape / Trajectory / Inversion / Reversibility
  - Q, Finding (N/10), What would make this a 10, Fix to make
## Accepted expansions     (only if mode in {expansion, selective})
## Deferred to TODOs / Boundary backlog
## Next actions
```

## How harsh? — example output

Run against `product/mvp.md` from the os-alt workspace, mode picked
heuristically as `selective` (has wedge derivation, no users, but is an
iteration on a recorded direction, not a fresh pivot):

```
# Boundary audit critique
- mode: **selective** — has wedge derivation in thoughts but zero traffic;
  treat existing v1 scope as baseline and only surface cherry-picks.
- overall_score: **6/10**
- decision: **revise**

## Axes

### Premise challenge
**Finding (7/10).** The premise "openalternative.co misses strict
self-hostability + setup-time + cost + migration" is concrete and
falsifiable. It would be a 10 if there were a recorded thought citing
≥3 actual openalternative.co misses (specific tools mislabelled).

### Existing-code leverage
**Finding (5/10).** code/data/saas/*.json schema exists and
build-time github.ts fetch exists — that's leverage. But the
"AI-generated migration guide" is a brand-new artifact type with zero
existing scaffolding. mvp.md doesn't mention which thoughts contain
the previous migration-guide explorations (if any).
**Fix to make.** Either point at the prior thought that scoped the
migration-guide format, or add a half-page Boundary that scopes it
first.

### Scope shape
**Finding (5/10).** "30-50 high-traffic SaaS pages live" is the right
v1 ambition for content depth, BUT migration guides on 30-50 entries
is plausibly the largest single bucket of agent-tick budget in this
plan and is bundled into v1 silently. The cuttable item: drop migration
guides to top-10 by-traffic for v1; defer the long tail. Same SEO
surface, ~5x less LLM-write effort.
**Fix.** Add to "Non-goals (v1)": "Migration guides for SaaS outside
top-10 by inferred Google traffic — link out only."

### Trajectory fit
**Finding (8/10).** Self-host tailwind + LLM-generated content is on a
real curve. Path from "directory" → "directory + migration guides" →
"directory + sponsor CTA + affiliate" → "data backend other content
sites cite" is plausible.

### Inversion
**Finding (4/10).** mvp.md doesn't acknowledge any failure modes. Top
three: (1) openalternative.co adds setup-time score in a weekend and
removes the wedge; (2) Google deindexes a vercel.app-hosted directory
as low-quality programmatic content; (3) migration guides are
hallucination-prone and one viral wrong guide tanks trust. None of
these are in the doc.
**Fix.** Add a "## Risks" section with these three named + a one-line
mitigation each.

### Reversibility
**Finding (8/10).** Two-way door — content edits are cheap, no
migrations, no public commitments. Rate 4/5 reversible.

## Accepted expansions
- (none — mode is selective and no expansion crossed the bar)

## Deferred to TODOs / Boundary backlog
- Scope migration-guide format in its own Boundary before v1 ships.
- Add referrer-tracking surface to v1 (already in success criteria —
  flag as Boundary-level, not afterthought).

## Next actions
- Edit product/mvp.md: add migration-guide cap to Non-goals, add a
  "## Risks" section with the three failure modes above.
- record_thought summarizing the cuttable-bundle insight so future
  v2 scope planning doesn't re-derive it.
```

## API

```python
from solvo.skills.boundary_audit.boundary_audit import (
    AXES, pick_mode, record_boundary_audit,
)

mode = pick_mode(
    boundary_size="medium",
    has_users=False,
    is_pivot=False,
    is_hotfix=False,
)
# → "selective"

critique = record_boundary_audit(
    target_path="product/mvp.md",
    mode=mode,
    mode_rationale="...",
    findings=[
        {"key": "premise", "rating": 7, "finding": "...",
         "gap_to_10": "...", "fix": ""},
        # ... one entry per axis
    ],
    overall_score=6,
    decision="revise",
    accepted_expansions=[],
    deferred_to_todos=["..."],
    next_actions=["..."],
)
print(critique.thought_path)
```

## Soft chaining

- If a prior `*-wedge_audit-critique.md` exists for the same direction,
  read it — its findings on `demand_reality` / `narrowest_wedge` are
  the strongest input to the `premise` axis here.
- After boundary_audit, `checkout.get_next()` proceeds normally.
  `architecture_audit` runs DURING execution (after design, before
  large diff), not here.
