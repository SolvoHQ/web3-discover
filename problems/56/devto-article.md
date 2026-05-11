# Paste a wallet, get a personal airdrop verdict — and call the same logic from any LLM

Two surfaces, one rule registry: a browser tool *and* an MCP tool that share the exact same 14 hand-verified on-chain rules and return the exact same verdict shape.

## The problem

Airdrop directories are full of "you might be eligible for 312 airdrops!" claims. They match on chain ("you've used Ethereum → you qualify for every Ethereum airdrop"), which is useless. The real eligibility lives on each project's contract or off-chain criteria.

So I built a tool that does the opposite: a tiny number of hand-verified rules, each tied to a specific entry, evaluated against the wallet you paste. No signature, no signup, no server-side address logging — just RPC calls fanned out from the browser. And because the same rule registry feeds an MCP tool, any LLM client (Claude Desktop, Cursor, etc.) can call it directly without scraping the site.

## The browser tool

Live at [web3-discover.vercel.app/tools/eligibility](https://web3-discover.vercel.app/tools/eligibility).

Paste an EVM and/or Solana address. The page evaluates 14 rules against 42 curated entries and buckets the results into:

- **✅ Likely eligible** — rule passes (e.g. `eth_getTransactionCount` on Linea ≥ 1, or you hold ≥ 1 PENDLE)
- **🟡 Keep farming** — partial: you've started but not crossed the threshold (e.g. 2 Arbitrum tx when 5 are needed for Reya / Ostium)
- **⏭ Not relevant** — rule fails outright
- **🔍 Manual check** — entry lives on a chain we can't reach from the browser (Monad, MegaETH, Hyperliquid, Sui-based) or has off-chain criteria (KYC, Discord, Galxe quests)

Try [vitalik.eth + a public Solana wallet](https://web3-discover.vercel.app/tools/eligibility?evm=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&sol=9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM) — resolves in 2-5 seconds, 9 eligible at the time of writing.

### How the browser side stays cheap

Every entry-page CTA deep-links to `/tools/eligibility?focus=<slug>`. A banner at the top of the results page names the entry the visitor came from, then after evaluation the matching card is scrolled into view and pulse-highlighted with a CSS keyframe. This costs zero extra requests — the focus logic is pure DOM-after-render.

Total RPC requests = one batched JSON-RPC POST per EVM chain (so 6 max for an EVM address) plus per-mint Solana calls. Each batch bundles `eth_getTransactionCount` + every `eth_call(balanceOf)` we need for that chain, so adding more rules on Ethereum costs zero additional requests.

## The MCP tool

Same logic, exposed at `https://web3-discover.vercel.app/api/mcp` as the fourth tool of the web3-discover MCP server.

```bash
curl -s -X POST https://web3-discover.vercel.app/api/mcp \
  -H 'content-type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "check_eligibility",
      "arguments": { "evm": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }
    }
  }'
```

Returns the same verdict shape — `eligible[]`, `partial[]`, `manual[]`, `unavailable[]`, `skip[]` — but as machine-readable JSON each LLM client can render however it likes:

```json
{
  "inputs": { "evm": "0xd8dA…6045", "sol": null },
  "rulesEvaluated": 14,
  "totalTracked": 42,
  "counts": {
    "eligible": 9,
    "partial": 0,
    "skip": 5,
    "manual": 28,
    "unavailable": 0
  },
  "eligible": [
    {
      "slug": "base-coinbase-l2",
      "project": "Base",
      "chain": "Base (Coinbase L2)",
      "verdictDetail": "70 tx on Base (≥ 1 required)",
      "officialUrl": "https://base.org"
    }
  ]
}
```

### Drop-in for Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "web3-discover": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://web3-discover.vercel.app/api/mcp"]
    }
  }
}
```

Then ask: *"What airdrops am I eligible for? My wallet is 0x…"* and the model calls `check_eligibility` directly. No scraping, no flaky HTML parsing.

## The one-file pattern that keeps both surfaces honest

Two surfaces means two ways for the rules to drift. The fix is one source of truth:

```
src/data/
  eligibility-rules.json   # source of truth
  eligibility-rules.ts     # typed wrapper for the Astro page
```

And during prebuild:

```js
// scripts/build-airdrops-snapshot.mjs
fs.copyFileSync(
  path.join(ROOT, 'src/data/eligibility-rules.json'),
  path.join(ROOT, 'api/_eligibility-rules.json'),
);
```

The MCP serverless function reads the JSON at cold start; the Astro page imports the typed `.ts` wrapper. Same data, two consumers, zero drift.

## Why this matters as a wedge

Most directory sites optimise for "discover something new". This optimises for the moment after you've already heard of a project: *"do I, this wallet I'm holding, actually need to act on this?"* That question doesn't compete with newsletters or Twitter — it complements them.

And exposing the same logic over MCP means the directory gets pulled into LLM chats *as the user is making decisions*, not after the fact. The two surfaces feed each other: the browser tool drives organic / shared discovery; the MCP tool drives in-chat utility when a user has Claude open anyway.

## Try it

- **Browser:** [web3-discover.vercel.app/tools/eligibility](https://web3-discover.vercel.app/tools/eligibility)
- **MCP:** `https://web3-discover.vercel.app/api/mcp` — JSON-RPC 2.0, `tools/list` returns four tools
- **Source:** the curated entries themselves live in a separate CC0 repo at [SolvoHQ/web3-discover-data](https://github.com/SolvoHQ/web3-discover-data), auto-refreshed daily

Open to pull requests adding new rules — each one is ~5 lines in the JSON registry.
