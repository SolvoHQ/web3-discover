---
name: wedge_audit
description: Six-question forcing critique of a candidate direction. Invoke when you are about to call `add_problem` with a description that proposes a new direction / pivot / fresh wedge, OR when you just wrote a `product/<topic>.md` proposing a wedge in this same tick — run wedge_audit BEFORE the problem gets checked out. Specificity-only rigor (named user, observed behaviour, this-week wedge); no human in the room, you ask AND answer.
---

# Wedge audit

Six forcing questions, asked of yourself, before you commit a tick budget
to a new direction. Adapted from gstack's `office-hours` for the
autonomous loop: there is no human in the room, so you ask AND answer.

The rule the gstack version was built around still applies here:
**specificity is the only currency.** "Devs would love this" gets thrown
out. "westonyushi@gmail.com cancelled openalternative.co after 30
seconds because no setup-time score" is currency.

## When to invoke (mechanical triggers)

Each trigger is something you can verify yourself from the tick context —
no human, no proactive layer, no voice cue.

- **You are about to call `checkout.add_problem(...)` and the description
  begins a new direction.** "New direction" = the workspace's current
  `product/mvp.md` (or equivalent) doesn't already cover this wedge, OR
  you recently `record_thought`ed that the existing wedge is failing.
  Stop. Run wedge_audit first. Pass the audit before the `add_problem`
  call.
- **You just authored or edited a `product/<file>.md` this tick that
  proposes a wedge / pivot / fresh direction**, and you have not yet
  written the corresponding Boundary problem. Audit the artifact BEFORE
  the Boundary is authored.
- **A `record_thought` you wrote in the current or previous tick
  recommends a pivot.** Before that pivot turns into a Boundary, audit
  the new direction.
- **You are halfway through padding a `product/<topic>.md` with
  speculation** ("users will probably want…", "the market is large
  because…") and have no named user / no observed behaviour to cite —
  that's the smell. Stop writing. Run wedge_audit on what you have so
  far; only resume if you survive it.

Skip when: the diff is a typo / formatting / cross-link fix, the new
problem is a scope reduction inside an already-audited wedge, or you
have a `*-wedge_audit-critique.md` file in `product/thoughts/` for this
same direction from a recent tick and nothing new is on the table.

## How it works

Two-step pattern (deliberate split — the substance is yours, the
mechanics are the module's):

1. You read the candidate artifact + any related thoughts.
2. You compose, in your own reasoning, answers to the six forcing
   questions in `FORCING_QUESTIONS`. For each: an answer, the evidence,
   a 0-10 rating, and what would make it a 10.
3. You decide an overall verdict and a single concrete assignment.
4. You call `record_wedge_audit(...)` to persist the critique to
   `product/thoughts/<tick>-wedge_audit-critique.md`.

Why the split: the Python wrapper enforces shape (a written thought file,
audited fields, structured findings) but never tries to grade the
substance. That stays with you.

## The six forcing questions

| key | question (compressed) |
|-----|------------------------|
| `demand_reality` | Strongest evidence someone would be _genuinely upset_ if it vanished tomorrow? |
| `status_quo` | What's the current workaround and what does it cost? |
| `desperate_specificity` | Name the actual human. Title. What gets them fired. |
| `narrowest_wedge` | Smallest version someone would pay for **this week**. |
| `observation_surprise` | A user did something we didn't expect? (If no — we aren't watching.) |
| `future_fit` | In 3y the world looks different. Does this become more essential or less? |

Full prompts + red flags + "gold" answers in
`FORCING_QUESTIONS` (Python tuple).

**Smart routing — you don't always need all six:**

- Pre-product (no users, no code) → answer Q1, Q2, Q3.
- Has users but no revenue → Q2, Q4, Q5.
- Has paying users → Q4, Q5, Q6.
- Pure infra / dev tooling → Q2, Q4.

When in doubt, answer all six. Skipping is a signal that you don't have
evidence for the ones you skipped — record that as a finding rather than
silently omitting.

## Verdict picker (autonomous)

You decide based on your own findings:

- **worth-building** — at least 4 of 6 questions ≥7/10 AND you have a
  concrete `narrowest_wedge`.
- **wedge-unclear** — demand signal exists but `narrowest_wedge` is
  vague or absent. Don't kill; record + go find the wedge.
- **needs-evidence** — multiple questions answered with "we think"
  rather than observed behaviour. Default verdict if you have no
  observation log.
- **kill** — `status_quo` is "nothing" (no one is doing this badly today)
  AND `demand_reality` is hypothetical only.

## Output schema

The skill writes `product/thoughts/<tick>-wedge_audit-critique.md` with
this structure (rendered by the module — you don't write the file
yourself):

```
# Wedge audit critique
- tick / written / target / verdict / overall_score
## One-line pitch
## Forcing questions
### <question 1..6>
- Q, Answer (N/10), Evidence, What would make this a 10
## Assignment
```

The thought file is **how** this skill feeds `dream`: when there are
several wedge_audit critiques in `product/thoughts/`, dream can cluster
them by theme (e.g. `cluster/premise-failures.md`) and distill recurring
failure modes into `principle/*.md`.

## How harsh? — example output

Run against `product/mvp.md` of the os-alt workspace (a self-host SaaS
alternatives directory):

```
# Wedge audit critique
- verdict: **wedge-unclear**
- overall_score: **5/10**

## One-line pitch

A directory of paid SaaS → strictly self-hostable open-source alternatives
with per-tool setup time, monthly self-host cost, AI-generated migration
guides.

## Forcing questions

### Demand Reality
**Q.** Strongest evidence someone would be genuinely upset if this vanished?
**Answer (3/10).** None yet — site has no live users. Wedge derivation
references search-intent volume on `"self-host slack"` but no observed
behaviour from a named human.
**Evidence.** product/thoughts/*-wedge-vs-openalternative.md cites
keyword volume; no user pulled-in artifact in the workspace.
**What would make this a 10.** A single recorded session of someone
hitting openalternative.co, bouncing because no setup-time score, then
landing on our page and using it.

### Status Quo
**Answer (7/10).** openalternative.co exists and competes head-on; users
also resort to LLM-asked-directly + manual GitHub spelunking. Concrete
workaround: spend 2-4h evaluating 5-10 candidate OSS tools yourself per
SaaS you want to drop. Real cost.

### Desperate Specificity
**Answer (4/10).** "dev / startup tech lead / sysadmin" is a category,
not a person. No named user in the workspace.
**What would make this a 10.** One real founder + their actual Notion
bill + the OSS they evaluated and rejected.

### Narrowest Wedge
**Answer (6/10).** v1 = 30-50 SaaS pages with setup-time + cost +
migration sketch. Concrete and ship-able. But "what does someone pay
for **this week**" is still unanswered — the v1 is content-only, no
revenue surface.

### Observation Surprise
**Answer (1/10).** No one has used this. No analytics referrer yet. We
are pre-observation.

### Future Fit
**Answer (7/10).** Self-hosting tailwind is real (SaaS prices ↑,
compliance pressure ↑, single-tenant LLMs make self-host more
competitive). The thesis survives the 3y test better than "another
directory".

## Assignment

Before opening another Boundary on this direction: find ONE real user.
Cold-DM 5 people in r/selfhosted who posted "leaving X for self-host"
in the last 30 days; ask them to look at /notion and tell us what's
missing. Until at least one says "this is what I needed", we're in
`needs-evidence` territory and any further scope work is speculation.
```

## API

```python
from solvo.skills.wedge_audit.wedge_audit import (
    FORCING_QUESTIONS, record_wedge_audit,
)

# After composing your findings in-reasoning:
critique = record_wedge_audit(
    one_line_pitch="A directory of paid SaaS → strictly self-hostable OSS alternatives...",
    verdict="wedge-unclear",
    overall_score=5,
    findings=[
        {"key": "demand_reality", "answer": "...", "evidence": "...",
         "rating": 3, "gap_to_10": "..."},
        # ... one entry per forcing question you answered
    ],
    assignment="Find ONE real user before opening another Boundary on this.",
    target_path="product/mvp.md",
)
print(critique.thought_path)
# → "product/thoughts/<tick>-wedge_audit-critique.md"
```

## Soft chaining

- `boundary_audit` benefits from reading any prior wedge_audit critique
  for the same direction — `boundary_audit` challenges premises;
  wedge_audit challenges whether the premises are worth challenging at
  all.
- `dream` will pick up `*-wedge_audit-critique.md` files in
  `product/thoughts/` and may cluster them into a `critiques.md`
  theme. Don't try to chain that yourself.
