## Result
/tools/wallet-age live at https://web3-discover.vercel.app/tools/wallet-age — HTTP 200, in sitemap, linked from homepage hero + /tools/ grid.

## Option pick (boundary asked for ONE of three)
**Picked (ii) wallet age, multi-chain.**
- (i) sybil-risk self-check: viable but lower share-magnetism ("my wallet is N days old" is a vanity metric people screenshot; "my wallet has 3 yellow signals" is not).
- (iii) YTD gas spent: dropped — Etherscan/equivalent public APIs all need signup+key; no zero-account route survives the boundary constraint.

## RPC infra (the actual work)
- **publicnode is NOT archive.** `eth_getTransactionCount(addr, 0x1)` errors. Fine for /tools/wallet-check (uses `latest` only); useless here.
- Switched to **drpc.org** for 3 chains (eth/arb/bsc), **1rpc.io/matic** for Polygon, **mainnet.base.org** for Base. All have open CORS + serve archive state + no signup.
- **Trap:** drpc.org applies its rate limit per-IP **across all subdomains**, not per-subdomain. Hammering eth.drpc.org and arbitrum.drpc.org concurrently triggers 408/425/429/500/502/503/504. Mitigation:
  - `bucketQueues` Map — calls tagged `bucket: 'drpc'` run serially through one shared promise chain; different buckets run concurrent.
  - 120 ms `INTER_CALL_DELAY_MS` between sequential nonce probes inside one chain's binary search (paces rate, not just retries).
  - 5-attempt exponential backoff (400ms × 2.2^n + jitter, max ~10s) on retry-able statuses + upstream-overload error messages embedded in jsonrpc body.
- **Archive sanity probe:** before binary-searching, fetch nonce at block 1. If it equals the latest nonce AND latest > 0, the node is serving latest-snapshot for every height — bail out with `no-archive` status rather than display a wrong date. (Caught publicnode at first.)
- ~28 binary search steps × 5 chains ≈ 140 RPC calls. End-to-end ~6–10s typical.

## Boundary done-criteria
- Live URL HTTP 200 ✓ (`curl` confirmed)
- Vitalik smoke-test ready (`?addr=0xd8dA…` in form hint)
- Homepage hero + /tools/ grid both link ✓
- sitemap-0.xml includes /tools/wallet-age/ ✓
- InlineSignup `source=tool-wallet-age` mounted ✓
- GoatCounter `path=tool-wallet-age-result` event on render ✓
- JSON-LD SoftwareApplication + canonical via Base layout ✓

## Build constraint (already known but reaffirmed)
LiFi widget chunk forces `NODE_OPTIONS=--max-old-space-size=8192` for `npm run build`. 87 pages built clean.

## What this unlocks
Third magnet in the wallet-aware family — second/third-visit traffic compound. Now: paste-once user can hit wallet-check → token-holdings → wallet-age without re-entering their address (cross-tool deeplinks query-string the addr through). Inline signup CTAs differentiate source for later GA segmentation.
