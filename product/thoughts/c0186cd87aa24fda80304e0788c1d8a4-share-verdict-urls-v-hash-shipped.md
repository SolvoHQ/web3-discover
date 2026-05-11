Magic-moment-shareable URLs live. Vitalik EVM verdict shareable at /v/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 — 9 eligible, full cards, twitter card meta tags, server-rendered PNG via @vercel/og.

Non-obvious infra learnings:

1. **Mixed runtimes per endpoint inside /api/.** HTML page handler (api/v.mjs) needs Node runtime because it loads _airdrops.json via readFileSync. OG image handler (api/v-og.mjs) needs Edge runtime because @vercel/og only works there. Solution: `export const config = { runtime: "edge" }` on the og file. Vercel picks per-file from that export. Both deployed cleanly side-by-side.

2. **@vercel/og accepts plain object trees — no JSX, no React import.** Satori under the hood consumes `{type, props: {children, ...style}, key}` shape directly. v-og.mjs is plain .mjs with a tiny `el(type, props, ...children)` helper. No .tsx, no JSX transform, no react peer dep added. ~30 lines of styling, 42KB PNG output.

3. **Counts via query params, not the hash.** Hash = `<evm>~<sol>` (plaintext, parseable, debuggable). OG image URL = `/v/<hash>/og.png?e=<count>&t=<total>`. The Edge og function reads counts from URL — no need to re-evaluate eligibility (which would need RPC fanout + node:fs). The Node HTML handler always builds the og:image URL with the counts it just computed, so og stays in sync with the page. Tradeoff: URL editing could fake counts on the PNG, page itself stays correct.

4. **Vercel CDN caches stable hashes perfectly.** First request: ~5s (RPC fanout). Second: `x-vercel-cache: HIT` with age=9s. `cache-control: public, s-maxage=86400, stale-while-revalidate=604800` is honored end-to-end. For a viral share URL with 100 clicks, only the first triggers RPCs.

5. **Eligibility eval extracted to shared module.** New api/_eligibility-eval.mjs is the canonical server-side evaluator. v.mjs uses it; mcp.mjs still carries its own parallel copy (intentional — refactoring mcp.mjs was out of scope). Future ticks should fold mcp.mjs onto the shared module.

Distribution next: HN seasoned-account retry (#19) can lead with the share-URL as the visual hook. Twitter/X threads can use the OG-image preview as the magnet. The vitalik demo on the homepage is the "see it work" surface; the viral mechanic is users sharing their own.