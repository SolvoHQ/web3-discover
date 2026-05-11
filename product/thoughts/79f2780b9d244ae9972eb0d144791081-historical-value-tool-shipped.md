## Conclusion
Fourth magnetic tool `/tools/historical-value` live. Paste-wallet → 10
hand-picked historical airdrops (UNI / 1INCH / OP / ARB / BLUR / ENA /
EIGEN / JTO / JUP / PYTH) checked against on-chain state; total of
base-tier × claim-day-USD shown.

## Eligibility-source decisions, per airdrop
Each historical airdrop got exactly one deterministic check:

- **drpc-archive `eth_getTransactionCount(addr, hexBlock)`** for
  `evmFirstTxBefore`: UNI (Eth block 10861674), 1INCH (Eth 11543750),
  OP (Optimism 5500000), ARB (Arbitrum 58642080), BLUR (Eth 15772000).
  Loose proxies — "had ≥1 tx on the right chain pre-snapshot" — over-
  includes wallets that were active but never touched the actual
  protocol. Honest disclaimer in the row + the howitworks accordion.
- **publicnode `balanceOf`** for `evmHoldsToken`: ENA (proxy = holds
  USDe), EIGEN (proxy = holds stETH). Misses anyone who redeemed before
  claim day.
- **publicnode `getTokenAccountsByOwner`** for `solHoldsMint`: JTO
  (proxy = holds jitoSOL). Same redemption-blindness caveat.
- **publicnode `getSignaturesForAddress`** for `solHasSignature`:
  JUP, PYTH. Very loose — Solana activity ≠ Jupiter/Pyth use — but
  cheap proxy for first-pass nostalgia.

Snapshot CSV path (option ii of Boundary) was rejected for every
candidate: each Merkle-distributor airdrop has either no public
machine-readable per-address tier table (UNI/BLUR/EIGEN/PYTH/JTO/JUP)
or returns 0 after claim (ARB/OP `claimableTokens` view), so the
heuristic threshold path was strictly better than CSV bundling and
much smaller in repo footprint.

## Done-criteria evidence (real browser session)
- Vitalik + public-SOL → 10/10 eligible at base tier, $14,706 total
  (browser snapshot at 2026-05-11T21:09:53Z).
- Fresh hex address `0xa1b2…c3d4` → $0.00, 0/10, "0 historical claims"
  graceful state + cross-link tray (browser snapshot at 21:10:32Z).

## Key technical learning
publicnode RPCs are pruned-state-only — calling
`eth_getTransactionCount(addr, hexBlock)` for a historical block
returns:
```
{"error":{"code":-32000,"message":"historical state X is not available"}}
```
So any "tx count at past block" heuristic MUST hit drpc.org (or a
similar archive). `/tools/wallet-age` already documented this — re-used
the same `eth.drpc.org` / `optimism.drpc.org` / `arbitrum.drpc.org`
URLs. The Boundary OUT clause forbidding new RPC providers was respected.

## Cross-link surface
- `/tools` index: new ★ Nostalgia magnet card alongside ★ Personal verdict.
- `/tools/eligibility`: post-verdict "Past-tense regret version" banner
  → links here with `evm/sol` carried through.
- `/tools/wallet-check`: companion-paragraph link.
- This page's results section: cross-link tray back to eligibility,
  directory, calendar — funnels nostalgia traffic into the present-tense magnet.

## Deferred from Boundary
`/v/<hash>` verdict-share was OUT-of-scope-able ("if cheap; otherwise
skip"). Verdict here = 10 rows + total — doesn't compress as cleanly as
eligibility's "X/14 buckets" hash structure. Could revisit if usage
warrants; for now the share value is in the cross-links above.

## Wedge thesis (why this tool exists)
- `/tools/eligibility` answers "what could you claim *now*"
- `/tools/historical-value` answers "what *would you have* made if you'd
  known earlier"

Same wedge, past-tense framing. Creates regret-driven engagement → a
second visit reason → newsletter signup. The two tools are a paired
funnel: eligibility for action, historical-value for retention. Pairs
with the planned `/tools/eligibility` future evolution (sponsor-funded
in /sponsor pitch).
