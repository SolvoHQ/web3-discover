---
name: checkout
description: Position-based queue operations on the workspace problem queue (list_queue, add_problem, complete_problem). Main agent never calls get_next — heartbeat does that.
---

# Checkout

The Checkout (`problems/checkout.db`) is the workspace's task queue. Every
active task has a unique `position` integer (1 = top). No priority tiers.
No same-position ties.

You (the main agent) interact with three operations:

## list_queue() -> list[Problem]
Read-only view of active tasks (pending + checked_out) in position order.
Use this to decide where to insert a new task, or to check for duplicates.
Never use it as a work selector — heartbeat picks what you work on.

## add_problem(description, position, created_by) -> int
Insert a new pending task at `position`. All active tasks at or after that
position shift down by 1. If `position` is `None`, append to the end.

- `position=1` — top; heartbeat's next tick will pick this up
- `position=None` — append to end (low priority / nice-to-have)
- Any integer in between — insert at exactly that slot

Validation: `position >= 1` and `position <= (active count) + 1`. Past-end
positions raise ValueError.

## complete_problem(problem_id, summary, tick_id) -> None
Mark a checked-out problem as done. `summary` becomes the audit trail.
`tick_id` comes from env var `SOLVO_TICK_ID` (set by heartbeat). You must
call this exactly once per tick, for the problem you were assigned.

## What you do NOT do
- **Do NOT call `get_next()`**. Heartbeat has already handed you your
  task — the problem is already `checked_out` under your name. Calling
  `get_next()` raises `QueueBusyError`.
- **Do NOT call `complete_problem` a second time** in the same tick. One
  complete per tick. If you need more work to happen, use `add_problem`
  and let the next tick take it.
- **Do NOT complete a problem you weren't assigned.** The heartbeat is
  watching; unauthorized completions emit a loud "DISCIPLINE DRIFT"
  warning.
