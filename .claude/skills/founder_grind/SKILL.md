---
name: founder_grind
description: Step out of the executor role for ~5 minutes and grind on the product as if you were its Founder. Run the thinking primitives below before adding a new top-priority problem, or after shipping a non-trivial change. Output is one thought + at most one new problem. Soft trigger — skip when you genuinely have nothing to grind on.
---

# Founder Grind

You spend most ticks executing. This skill is a **deliberate pause** to
ask the questions a daily executor never has time for and a Founder
never has the luxury of skipping. Don't run mechanically — pick the
primitives that are sharp for *this* moment and ignore the rest.

## When to invoke

- Before `add_problem` when you're about to set a new top-priority
  goal (especially one that will eat a multi-tick budget)
- After shipping a feature / deploy / distribution attempt — to look
  at the live state through user eyes before picking next
- When `list_queue()` looks like a checklist of small chores rather
  than a coherent next bet
- Voluntarily, when something feels off and you can't name what

## When NOT to invoke

- Mid-task, mid-tool-call — finish the action first
- For mechanical work (typo fix, queue housekeeping)
- Repeatedly within the same tick (one grind per tick is enough)

## The primitives

Pick 2-4 that are sharp right now. Don't run all of them.

### 1. User-intent restate

In one sentence: who reaches this product and what mental state are
they in when they arrive? If you can't say it crisply, the next
problem you add will be solving the wrong thing.

### 2. Two user paths

Walk two concrete user journeys end-to-end against the **current live
URL** (use `WebFetch` or Playwright if needed). Don't imagine — load
the page and follow the cursor. Note the moments friction happens.

### 3. Smallest 10× perceived-quality move

What's the cheapest change (≤30 min of work) that would make a
first-time user think "this is cared for"? Often a typography pass,
a missing empty-state, a 200ms hover affordance, an OG image, a
copy-tightening. Polish *is* function when it lifts perceived
quality past the threshold.

### 4. Cheapest validation experiment

What's the smallest signal that would tell you the wedge is right
or wrong? Cheaper than the next ship: log a referrer, ship a fake
button, write a paragraph and post it.

### 5. The Founder reframe

If you owned the equity in this and had to make rent next month, what
would you stop doing? Often the answer is "the polished engineering
side-quest I'm about to commit to" — kill it, ship the messy
high-leverage thing instead.

### 6. The graveyard scan

Open `product/log.md` tail and `product/thoughts/`. Have you already
recorded a "X is a dead road" insight that contradicts what you're
about to do? If yes — stop, re-plan around it.

## Output

After the grind, write **one** `record_thought(...)` capturing the
sharpest realization (if any). Then **at most one** `add_problem`
based on it. Both are optional — sometimes the grind concludes
"current direction is right, no change". That's a valid output too.

## Anti-patterns

- Running all 6 primitives because the skill listed them — that's
  methodology theater
- Long thought entries summarizing the grind — write what *changed*,
  not the process
- Adding 5 small problems because the grind surfaced 5 ideas — pick
  the sharpest one, drop the rest

## Examples (for shape, not template)

**Short grind (most common)**:

> ran primitive 2 (user paths) on the live site. The mobile viewport
> shows the input field but the keyboard hides the result on iPhone
> SE. Adding it as problem #N: "Lift result above input on
> sub-700px viewports".

**Pivot grind**:

> primitives 4+5 together. The HN+sourcehut wedge isn't producing
> referrers (per thought bb3fa117). Asking "what would I do if rent
> depended on this" — the answer is GitHub Action marketplace
> placement (devs find tools when they're already failing on a
> related task). Pivoting; new problem at #1.
