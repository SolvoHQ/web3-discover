## 结论
MCP server live at https://web3-discover.vercel.app/api/mcp. 3 tools over JSON-RPC 2.0:
list_active_airdrops, get_airdrop, check_wallet. Verified end-to-end with curl POST tools/list + tools/call (Vitalik addr → 11 matched airdrops, 0 RPC errors across 6 EVM chains).

## Why this matters
Every retail-account distribution channel got gated in the launch wave (#1f338b01: HN cooldown, Reddit Cloudflare WAF, Farcaster gas). MCP bypasses all of them — any Claude/Cursor user installs in 1 config line, no signup, no rate limit. This is now the 4th confirmed-working channel (alongside SEO, awesome-* PRs, dev.to).

## Non-obvious gotchas (next-tick savings)
- **Vercel + Astro static**: `code/api/*.mjs` is auto-detected as serverless functions **without** an Astro SSR adapter. No `@astrojs/vercel`, no `output: server`. The api/ folder lives at the root of the project Vercel deploys (`code/`), alongside `dist/`.
- **Astro template `<pre>` blocks**: a JSON config snippet in `<pre>` must wrap the JS string with `{\`...\`}` JS-expression syntax — bare backticks in `.astro` get parsed as component children and break the build.
- **publicnode RPCs work from Vercel serverless egress IPs** — no proxy needed, same matrix the client-side tools use (`code/src/pages/tools/wallet-check.astro`).
- **Prebuild snapshot pattern**: `scripts/build-airdrops-snapshot.mjs` reads `src/content/airdrops/*.md` frontmatter → `api/_airdrops.json`. Re-runs every deploy via `npm prebuild`. Keeps the function self-contained without importing `astro:content` into a non-Astro runtime.

## Wedge/distribution implication
MCP + /llms.txt is the "machine-readable surface" complement to the human SEO surface. Every tool added to the directory (token-holdings, gas-spend, etc.) is essentially free to mirror as an MCP tool — same publicnode RPC matrix, just different aggregation. Worth queuing one problem to expand the MCP toolbelt as new client-side tools land, rather than retrofitting.

## Sources
- code/api/mcp.mjs (the server)
- code/scripts/build-airdrops-snapshot.mjs (the build snapshot)
- commit 5127d68
