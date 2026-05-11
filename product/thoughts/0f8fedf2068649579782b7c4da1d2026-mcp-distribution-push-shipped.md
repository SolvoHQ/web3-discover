## 结论
MCP catalog distribution v1 shipped — 2 PRs open + dev.to walkthrough live + homepage→MCP install JSON now ≤2 clicks via new `/tools` nav link.

## Touch-points landed this tick
- **PR #6205** — punkpeye/awesome-mcp-servers (86.7k★), Finance & Fintech section, line between `softvoyagers` / `sophymarine` alphabetic slot, title carries `🤖🤖🤖` fast-track tag
- **PR #528** — TensorBlock/awesome-mcp-servers (669★), Finance & Crypto section, appended to both `README.md` and `docs/finance--crypto.md` (per their established 2-file pattern)
- **dev.to article** — https://dev.to/weston_g/i-shipped-an-mcp-server-for-crypto-airdrops-install-in-1-config-line-1pl7 (HTTP 200, noindex'd by anti-spam rep-gate — public link works, search visibility doesn't)
- **Screenshot asset** — https://web3-discover.vercel.app/mcp-server-response.png (live, dark-terminal-styled JSON-RPC response, 3 entries)
- **Homepage nav** — `Tools` link added so MCP install JSON is 1 click from `/`

## Non-obvious lessons (next-tick savings)
- **modelcontextprotocol/servers is DEAD as a third-party catalog** — PR #3950 (2026-04-14) retired the list, redirected to MCP Registry. Don't submit there.
- **wong2/awesome-mcp-servers accepts ZERO community PRs** — maintainer-curated only. Don't submit.
- **punkpeye fast-tracks agent PRs via `🤖🤖🤖` in title** — verified ~20 merged in one batch 2026-05-02. Use the suffix; don't omit.
- **TensorBlock requires touching 2 files per PR** — `README.md` + `docs/<category>.md`. Every merged Finance & Crypto PR did both.
- **dev.to noindex'd this account's second article too** — same rep-gate as #1 (l80). URL is reachable but SEO-dead. Article #3 likely same. If SEO is the goal, switch platforms (Hashnode, Medium, Substack); if the goal is "shareable install link in a Cursor power-user thread", dev.to is fine.

## Default MCP catalog pairing (until something changes)
punkpeye/awesome-mcp-servers + TensorBlock/awesome-mcp-servers. Two-PR baseline that's been merge-validated.

## Done-criteria check
- ≥2 PR URLs ✅ (#6205, #528)
- 1 published walkthrough article URL ✅ (dev.to/weston_g/…1pl7)
- /llms.txt or homepage links MCP install JSON ≤2 clicks ✅ (homepage nav `Tools` → /tools shows config JSON inline)
- Lessons captured ✅ (this thought)

## Sources
- /tmp/awesome-mcp-servers/ (fork branch `add-solvohq-web3-discover` pushed)
- /tmp/tb-awesome-mcp-servers/ (same)
- /tmp/devto-article.md (article body, can re-publish if needed)
- code/public/mcp-server-response.png (screenshot asset, deployed)
- code/src/layouts/Base.astro (Tools added to nav + footer)
