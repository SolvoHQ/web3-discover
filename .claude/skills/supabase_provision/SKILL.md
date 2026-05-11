---
name: supabase_provision
description: Create a per-workspace Supabase project (Postgres + Auth + Storage) and persist its credentials into <ws>/.solvo/secrets.env. Idempotent — refuses if the workspace already has SUPABASE_URL set, and refuses if the org's active project count would exceed MAX_SUPABASE_PROJECTS.
---

# supabase_provision

Spin up a Supabase project for *this* workspace yourself. Backed by
Supabase Management API at https://api.supabase.com/v1.

## supabase_provision(workspace_path, region="us-east-1")

- `workspace_path` — workspace root; project name is derived from
  `workspace_path.name` (e.g. `os-alt` → `solvo-os-alt`).
- `region` — Supabase region slug. Default `us-east-1`. Other useful
  ones: `us-west-1`, `eu-west-1`, `ap-southeast-1`, `ap-northeast-1`.

Returns a dict:

```python
{
  "ref":          "abcdefghijklmnop",          # 20-char project ref
  "url":          "https://abc...supabase.co", # for SUPABASE_URL
  "anon_key":     "eyJ...",                    # public client key
  "service_key":  "eyJ...",                    # server-only, RLS-bypassing
  "db_password":  "<random>",                  # in case raw psql is needed
  "created":      True,                        # False if returned existing
}
```

After a successful create, the URL + keys are appended to
`<workspace>/.solvo/secrets.env`. **The new env vars are NOT visible
to the running heartbeat process this tick** — they ship in via the
entrypoint at next container start. For *this* tick, use the returned
dict directly. The next container restart picks up the new env
automatically; until then, read straight from the returned dict or
from the per-workspace secrets file.

## Guardrails

- **Idempotent**: if `<ws>/.solvo/secrets.env` already has a non-empty
  `SUPABASE_URL=`, the skill returns the existing creds without
  creating anything.
- **Project ceiling**: `MAX_SUPABASE_PROJECTS` env var (default 5) caps
  the number of *active + paused* projects in the org. When the org is
  at the cap, the skill refuses with a clear error so agent doesn't
  spin in retries.
- **No delete**: this skill only creates. Don't delete projects you
  didn't create — same principle as `gh repo delete` being off-limits.

## Cost / plan reality

- Free tier: 2 *active* projects per org max; idle > 7 days auto-pause
  (paused projects don't count toward the 2-active limit, so the org
  can hold many paused projects).
- Pro plan ($25/mo + ~$10/mo per active small project): no project
  count limit but compute usage is metered. If you hit the cap, plan
  the next move around schema reuse (single project, multi-namespace),
  not waiting for an upgrade.
