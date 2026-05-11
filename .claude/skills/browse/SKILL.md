---
name: browse
description: Read web pages — your own deployed site to verify it works, competitors to learn from, docs to consult, public user signals (HN/Reddit/GH issues) to ground decisions. Prefer WebFetch; use Playwright MCP only when interaction is required.
---

# Browse

You are a headless `claude -p` subprocess. The web tools available by
default:

- **`WebFetch`** — GET a URL, returns extracted/summarized content. Cached
  per-tick. Best for read-only inspection.
- **`WebSearch`** — query a search engine, returns a result list. Best
  for discovery when you don't already have a URL.

For interactive flows (click, fill form, screenshot), the workspace must
have Playwright MCP configured in `.claude/mcp.json`. If absent, ship
your task via WebFetch + WebSearch only, or pivot to a path that
doesn't need browser interaction. **Don't queue a problem expecting
someone to install MCP** — there is no one to install it.

## When to browse

1. **After every deploy** — verify the production URL serves the right
   content. The host's "deploy succeeded" message is not proof. Don't
   call a deploy done until `WebFetch` confirms a known string from your
   code is on the live page.
2. **Competitor research** — before scoping a feature, fetch how
   competitors solve it. Don't invent in a vacuum.
3. **Library docs** — official docs of any dependency before integrating;
   one `WebFetch` is cheaper than a wrong assumption.
4. **Public user signals** — HN, Reddit, ProductHunt, GitHub issues, app
   store reviews. Real complaints in your space are worth more than your
   model of what users want.

## When NOT to browse

- For internal workspace files — `Read` is faster and authoritative.
- To "check if a URL is reachable" without caring about content — `curl
  -sI` via Bash is cheaper.
- For paginated scraping or anything that needs >5 fetches — that's a
  sub-agent's job. `spawn_subagent` with a focused brief.

## Patterns

```text
# Verify deploy
WebFetch("https://my-app.vercel.app/", "Does the page contain '<known
copy from your hero section>'? Report yes/no plus the actual title.")

# Competitor research
WebSearch("how does <competitor> handle <feature>")
# → top 3 results, WebFetch each, synthesize the pattern

# Public user pain
WebFetch("https://news.ycombinator.com/from?site=<competitor>.com",
         "What are the top complaints in comments about this product?")
```

## Tie-in with other skills

- A `browse` finding that changed your plan should land in `product/` via
  `record_thought` (or a topic file). A finding that just confirmed
  expectations doesn't need to be persisted.
- If you `browse` to verify a deploy and it's broken, the deploy is not
  done — `add_problem(position=1, ...)` to fix it before moving on.
