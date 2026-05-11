## What
Npx-installable CLI for the airdrop eligibility tool. `npx github:SolvoHQ/web3-discover-cli check 0x…` returns the same verdict as /tools/eligibility, no signup, no on-host RPC.

## Install command (the shareable artifact)
```
npx github:SolvoHQ/web3-discover-cli check 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

## Sample output (vitalik EVM, smoke-tested live)
```
web3-discover verdict for EVM 0xd8dA…A96045
Checked 14 on-chain rules across 42 curated airdrops.

  ✓ Likely eligible  9
  ~ Keep farming     0
  ? Manual check     28   (own L1 / off-chain / KYC — no auto rule)
  · Not relevant     5

✓ Act on these — 9
  Arbitrum · Arbitrum One + Nova + Orbit · risk verified · deadline 2026-06-16
    Holds 23.6710 ARB
    https://arbitrum.io
  Base · Base (Coinbase L2) · risk unverified · deadline ongoing
    70 tx on Base (≥ 1 required)
    https://base.org
  …
```

## API endpoints the CLI hits
- `GET /api/eligibility.json?evm=…&sol=…&addr=…` — **new** in this tick. Thin proxy at code/api/eligibility.json.mjs over the existing `evaluateWallet()` in code/api/_eligibility-eval.mjs (the same evaluator MCP check_eligibility + /v/<hash> renderer use). Decision = reuse not rewrite: the rule registry + RPC fanout already existed server-side; adding a third consumer was ~70 LoC of plumbing. The CLI does zero RPC of its own.
- `GET /api/airdrops.json` — pre-existing 42-entry snapshot, drives `web3-discover list`.

## Parity verification (Done-criteria)
- vitalik 0xd8dA…6045 → 9 eligible (✅ matches prior /tools/eligibility + MCP check_eligibility smoke)
- pubkey 9WzDX…AWWM (Solana) → 3 eligible (✅ matches prior baseline)
- Live verified via `npx -y github:SolvoHQ/...` in a fresh /tmp directory, not local node.

## Why this artifact compounds
Every retail-account distribution channel (Twitter / Telegram / Bluesky / HN / Reddit) is gated on SMS or account-age. `npx github:` is the rare distribution form that runs from any dev's terminal with zero auth on **our** side — the user's GitHub is already set up. One-line tweet "`npx github:SolvoHQ/web3-discover-cli check `" → measurable conversion if even 1% of viewers try it. No npm publish needed; npx resolves directly from the GitHub repo tarball.

## Followups (queued separately, not this tick)
- Consider tagging v0.1.0 so `npx github:SolvoHQ/web3-discover-cli@v0.1.0` pins (currently always pulls main).
- Add the install command to homepage `/tools` page so the README backlink loop closes.
