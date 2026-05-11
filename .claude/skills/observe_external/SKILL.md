---
name: observe_external
description: Pull external reality into the tick — Vercel Analytics pageviews, Gmail inbox, GitHub PR/issue state changes, GoatCounter visits, Railway affiliate clicks. Use when a decision depends on signals outside the workspace (did anyone click the affiliate? did the sponsor reply? did the README-badge PR get merged?). Single call, multi-source, since-last-invocation delta.
---

# Observe External

The workspace's `code/` deploys and `product/` decisions are useful only
insofar as the outside world responds to them. Everything inside the
container — checkout queue, thought log, git history — is your internal
state. Everything *outside* (Vercel pageviews, inbound email, GitHub PR
merges, sponsor replies, affiliate clicks) is invisible by default.

This skill closes that gap. **You** call it when context warrants —
not every tick. It is NOT auto-injected.

## When to call

- A "validate the wedge" problem says "check if anyone is using it" —
  call this to read the pageviews, not the Vercel dashboard manually.
- You sent cold emails N hours / days ago — call this to see replies.
- You opened README-badge issues / awesome-list PRs — call this to see
  which were merged, closed, commented on.
- Your self-imposed kill criterion in mvp.md is "<N visits/wk" — call
  this to read the visit number before deciding to kill.

## When NOT to call

- Every tick "just in case" — that's how the agent ends up doom-
  refreshing dashboards instead of shipping. Call when a decision
  depends on the answer, otherwise keep building.
- Right after deploy — Vercel Analytics has a ~minute lag, Gmail
  replies take human-time. Wait a tick or two.

## API

```python
from solvo.skills.observe_external import observe

# Default: all sources, last 24h delta
md = observe()

# Specific sources only (faster, fewer creds needed)
md = observe(sources=["vercel", "github"])

# Wider since-window for low-signal sources
md = observe(sources=["vercel"], since_hours=168)  # 1 week
```

Returns a **markdown string** (NOT a side-file). You read it directly
and decide what to do. The string is structured:

```
# External state — <timestamp>

## Vercel
- since last check: 2026-05-11 03:00:00Z  (5h ago)
- pageviews: 142  (+18 vs prev window)
- top paths:
  - /pricing  47
  - /          39
  - /docs/intro 22

## Gmail
- new since last check: 3
- 2026-05-11 04:12  contact@pikapods.com  RE: Sponsorship inquiry
  "Hi, thanks for reaching out. We'd be interested in..."
- ...

## GitHub
- since last check: 2026-05-10 22:00:00Z
- changed: 4
  - SolvoHQ/os-alt #12  PR  merged
  - foo/awesome-x #198  PR  closed (rejected)
  - bar/baz #44         issue commented (no merge yet)
  - ...

## GoatCounter
- unique visits last 24h: 0
- (no signal yet — wedge not validated)

## Railway
- no RAILWAY_AFFILIATE_TOKEN — skipped
```

## Source coverage

| Source | Env vars (all in `<ws>/.solvo/secrets.env`) | Degrades to |
|---|---|---|
| Vercel | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, opt. `VERCEL_TEAM_ID` | "no vercel credentials" segment |
| Gmail | `AGENT_EMAIL_IMAP_HOST/USERNAME/APP_PASSWORD` | "no gmail credentials" segment |
| GitHub | `GH_TOKEN` or `GITHUB_TOKEN` | "no github credentials" segment |
| GoatCounter | `GOATCOUNTER_SITE`, `GOATCOUNTER_TOKEN` | "no goatcounter credentials" segment |
| Railway | `RAILWAY_AFFILIATE_TOKEN` | "no railway credentials" segment |

**Each source is independently failable.** Missing GitHub token doesn't
block the Vercel section from rendering. Network errors in one source
don't kill the others.

## State (since-last-invocation)

Each source writes a tiny JSON file under
`<workspace>/.solvo/state/observe_external_<source>.json` recording
the last-seen timestamp / cursor (Gmail UID, GitHub event id, etc.).
Consecutive calls return **delta**, not the whole history. Wipe the
file under `.solvo/state/` to reset a source's cursor.

The state directory is gitignored — it's local to the running container
(or to the operator's host when invoked outside Docker).

## Failure modes

- All sources return their own "no X credentials" string and the call
  still succeeds. The skill never raises for missing creds — it just
  produces a markdown segment saying so. Use this to detect "the
  operator never wired me up for X" without crashing the tick.
- Network failure on one source: that source's segment says
  "error: <one-line tail>". Other sources still render. The skill
  itself does not raise except on programmer error (bad arg type).
- First call with a fresh workspace: every source returns
  "first invocation — no baseline" plus the current snapshot. Second
  call onward returns delta.

## What this skill does NOT do

- Doesn't *act* on the signal. You read the markdown, you decide what
  problem to add to the checkout queue.
- Doesn't open the dashboards in a browser. Use `browse` for that.
- Doesn't reply to email. Use Resend / `email_receive` outbound paths.
- Doesn't merge PRs. Use `gh pr merge` via Bash.
