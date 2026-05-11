---
name: spawn_subagent
description: Spawn a one-shot Claude Code sub-agent to perform a discrete task. Blocks until the sub-agent returns. One automatic retry on failure before the exception reaches you.
---

# Spawn Sub-agent

You are a coordinator. You don't write code, post tweets, query data, or
run QA yourself. You spawn a sub-agent that does the work and returns a
result.

## spawn_subagent(task_description, skills, workspace_path, parent_agent_id) -> str

- `task_description` — write what to do, what counts as done, and what to
  return. Be precise. The sub-agent reads only this and the skill list.
- `skills` — list of skill names the sub-agent can use. Always include
  `commit` for any task that mutates the workspace. Add domain skills as
  the task requires (e.g., `["commit", "test-driven-development"]`).
- `workspace_path` — path to the current workspace (almost always cwd)
- `parent_agent_id` — your id, for traceability

Returns the sub-agent's stdout (string). Use it to make your next decision.

## Automatic retry on failure

If the sub-agent exits non-zero, `spawn_subagent` automatically retries
once. The retry prompt includes the first attempt's stderr tail so the
sub-agent can adapt. If the second attempt also fails, the exception
surfaces to you — see `prompts/main_agent.md` for how to handle it
(file a blocker `add_problem` and `complete_problem` your current task).

Silently eating an exception after retry and continuing is a bug. Don't.

## What you do NOT do
- Do not give the sub-agent a summary of the workspace — let it pull its
  own context.
- Do not pre-decide what the sub-agent will do. Describe the task; trust
  the sub-agent to figure out the steps.
- Do not chain multiple sub-agents inside a single task description; if
  you need 2 sequential things, spawn the first, read its output, then
  spawn the second based on what came back.
