---
name: deploy
description: Publish the workspace's code/ directory to the public internet via Vercel, Netlify, or Cloudflare Pages. Required before the mandate's "real users see real changes" can hold. Token must be in env — no interactive login.
---

# Deploy

The workspace's `code/` is useless until users can reach it. This skill is
how you make that happen.

## Pre-flight

You need a host token in the environment. **Do NOT attempt interactive
login** (`vercel login`, `netlify login`); it will hang the heartbeat
indefinitely.

| Env var(s) | Host |
|---|---|
| `VERCEL_TOKEN` | Vercel |
| `NETLIFY_AUTH_TOKEN` | Netlify |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Pages |

These tokens come from `<workspace>/.solvo/secrets.env` (the file is
mounted read-only into the container and sourced by the entrypoint
before the heartbeat starts). If a token isn't set, **pick a different
host that is configured** — don't park work waiting for a token to
appear. Surge.sh accepts any email for first deploy (auto-creates the
account on POST `/token`); GitHub Pages works with the always-present
`GH_TOKEN`; both are zero-account fallbacks.

## Pick a host

| Host | When to use |
|---|---|
| Vercel | Next.js / Astro / Remix / SvelteKit; want zero-config edge functions |
| Netlify | Plain static, simple form handlers, edge redirects |
| Cloudflare Pages | High-traffic static, want low cost at scale, custom workers |

Default to **Vercel** if unsure. Don't switch hosts mid-project unless
there's a concrete reason (cost, missing feature, deploy reliability).
Record the choice + reason in `product/deploys.md`.

## Deploy commands

Run from the workspace root, targeting `code/` or its build output:

```bash
# Vercel
cd code && vercel deploy --prod --token="$VERCEL_TOKEN" --yes

# Netlify (static dist directory)
cd code && netlify deploy --prod --auth="$NETLIFY_AUTH_TOKEN" --dir=dist

# Cloudflare Pages
cd code && CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
  wrangler pages deploy dist --project-name=<workspace-name>
```

The CLI prints the production URL on success — capture it from stdout.

## After every deploy

1. **Verify with `browse` skill** — `WebFetch` the production URL,
   confirm it returns 200 and the page contains a known string from your
   code (a page title, hero copy, etc.). A deploy that the host calls
   "successful" but serves a blank page or 500 is **not done**.
2. **Record the deploy** in `product/deploys.md` (create if missing):
   timestamp, host, production URL, git SHA, anything weird that happened.
3. **Capture a thought** via `record_thought` if anything was learned
   (build warning, missing env var on host, slow build step, etc.).

## Common failure modes

- **Build OK locally, fails on host** → Node version mismatch, or a
  build-time env var (`NEXT_PUBLIC_*`, `VITE_*`) is missing on the host.
  Set via `vercel env add` / `netlify env:set` / dashboard.
- **Build OK, prod 500** → runtime env vars (DB URL, API keys) not set
  on the host. Different from build-time vars.
- **Custom domain doesn't resolve** → DNS still propagating or record
  missing. Verify the `*.vercel.app` / `*.netlify.app` default URL works
  first; that isolates DNS from deploy.
- **Bandwidth / build minute cap hit** → free tier exhausted. This is
  insight-worthy (changes host choice). Don't silently fail — record it.
