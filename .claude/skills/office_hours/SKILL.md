---
name: office_hours
description: YC-style six-question forcing critique of a candidate product direction. Agent invokes BEFORE authoring a fresh Boundary problem for a new direction — validates "is this worth building" with specificity-only rigor.
---

# Office Hours

Six forcing questions, asked of yourself, before you commit a tick budget
to a new direction. Adapted from gstack's `office-hours` for the
autonomous loop: there is no human in the room, so you ask AND answer.

The rule the gstack version was built around still applies here:
**specificity is the only currency.** "Devs would love this" gets thrown
out. "westonyushi@gmail.com cancelled openalternative.co after 30
seconds because no setup-time score" is currency.

## Invocation triggers

- **Before authoring a fresh Boundary problem** for a new direction
  (pivot, expansion vertical, new wedge). Don't open a `Boundary.md` until
  you've passed this.
- **When a `record_thought` is recommending a pivot** — run the new
  direction through office_hours before committing.
- **When you catch yourself padding a `product/<topic>.md` without
  evidence** — that's the smell. Stop, run office_hours, only resume if
  you survive it.

Do **not** invoke for: typo fixes, scope reductions inside an already-
validated Boundary, anything where the answer to "is this worth
building" is already a recorded thought.

## How it works

Two-step pattern (deliberate split — the substance is the agent's, the
mechanics are the module's):

1. You read the candidate artifact + any related thoughts.
2. You compose, in your own reasoning, answers to the six forcing
   questions in `FORCING_QUESTIONS`. For each: an answer, the evidence,
   a 0-10 rating, and what would make it a 10.
3. You decide an overall verdict and a single concrete assignment.
4. You call `record_office_hours(...)` to persist the critique to
   `product/thoughts/<tick>-office-hours-critique.md`.

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

The gstack version asks the human. You decide based on your own findings:

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

The skill writes `product/thoughts/<tick>-office-hours-critique.md` with
this structure (rendered by the module — you don't write the file
yourself):

```
# Office Hours critique
- tick / written / target / verdict / overall_score
## One-line pitch
## Forcing questions
### <question 1..6>
- Q, Answer (N/10), Evidence, What would make this a 10
## Assignment
```

The thought file is **how** this skill feeds `dream`: when there are
several office_hours critiques in `product/thoughts/raw/`, dream can
cluster them by theme (e.g. `cluster/premise-failures.md`) and distill
recurring failure modes into `principle/*.md`.

## How harsh? — example output

Run against `product/mvp.md` of the os-alt workspace (a self-host SaaS
alternatives directory):

```
# Office Hours critique
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
from solvo.skills.office_hours.office_hours import (
    FORCING_QUESTIONS, record_office_hours,
)

# After composing your findings in-reasoning:
critique = record_office_hours(
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
# → "product/thoughts/<tick>-office-hours-critique.md"
```

## Soft chaining

- `ceo_review` benefits from reading any prior office_hours critique for
  the same direction — `ceo_review` challenges premises; office_hours
  challenges whether the premises are worth challenging at all.
- `dream` will pick up `*-office-hours-critique.md` files in
  `product/thoughts/raw/` and may cluster them into a `critiques.md`
  theme. Don't try to chain that yourself.
