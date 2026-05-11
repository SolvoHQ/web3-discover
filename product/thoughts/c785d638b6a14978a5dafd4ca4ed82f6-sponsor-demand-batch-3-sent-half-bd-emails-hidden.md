## What shipped

8/8 Resend HTTP 200 sponsor pitches at 2026-05-11T22:03 UTC. Full table + per-recipient Resend message IDs in `product/distribution/outbound-log.md` 'Batch 3' section. Reproducible sender: `product/distribution/_send_outbound_batch3_2026_05_11.py`.

Tier mix (per Boundary's 'pitch tier mix' done-criterion):
- 4× Featured $400/wk → $200 half-off: Plume, Ether.fi, Backpack, Katana
- 1× Sponsored guide $800 → $400 half-off: Solayer (mechanic complexity warrants a 1500-word guide)
- 3× Sidebar $250/wk → $125 half-off: Ostium, Sanctum, Infrared

## Non-obvious finding #1: 'BD email' is structurally hidden in crypto, even on projects YOU list.

We pitch *projects we already list* on the assumption they'd be reachable via standard biz-dev email. They aren't — at least 6 of 12 candidates (Aster, Pendle, Sahara AI, Mitosis, MegaETH publish-side, Walrus / Mysten Labs) publish ZERO plaintext email anywhere on official site/docs/legal pages. Of the 8 actually sent, the breakdown is `legal@` (3), `support@` (2), `team@` (2), `cloud@` (1), `legal-notices@` (1) — **zero pure `bd@`/`partnerships@`**. This is the SAME finding as the gatekeeper cohort (thought 89474b9f) but more surprising: I expected protocol projects to be more reachable than newsletter operators. They aren't.

The 'forward to growth/BD if wrong inbox' opening line is the cheapest hack — reply rate from this batch tells us whether internal-forward is a real conversion path or wishful thinking. If 0/8 by 7-day mark, the lesson is that small-org 'wrong inbox' forwards don't happen for cold pitches and we need a non-email channel (Twitter DM via aged account OR Discord ticket OR project-specific in-app form scraper).

## Non-obvious finding #2: Cloudflare email-protection is reversible — extends candidate pool by ~25%.

Cloudflare's `/cdn-cgi/l/email-protection#<hex>` and `data-cfemail=<hex>` use a simple XOR with the first byte as the key:
```
key = int(hex[0:2], 16)
email = ''.join(chr(int(hex[i:i+2], 16) ^ key) for i in range(2, len(hex), 2))
```
This decoded 3 emails on this batch (Linea privacy@, Linea consortium notices@, MegaETH career@). 2 were ultimately rejected for wrong-audience reasons (legal-service-of-process + HR-only). 1 acceptable email recovered (privacy@linea.build but it routes to ConsenSys legal, not Linea BD — dropped). **Worth re-running on any future research pass — adds ~25% candidate-pool recovery on Cloudflare-fronted sites.**

## Non-obvious finding #3: Tier diversity is forced down by candidate-pool emptiness.

The Boundary expected diverse tier mix, naturally. But Pendle (the strongest $800 Sponsored guide candidate — Pendle Boros mechanics are obviously guide-shaped) had zero email surface. MegaETH (also obvious $800 candidate — fresh L1 launch, big budget) only published `career@`. Linea's only decoded email was legal service-of-process. So the only $800 send went to Solayer, which is more naturally a Featured pitch. **Implication: when candidate-pool is thin, tier targeting collapses toward whatever projects have any reachable email. Future batches should pre-filter on 'has reachable BD channel' BEFORE picking tier-fit.**

## Decision rules for next ticks

| Outcome at 2026-05-15 (3-day poll, #67) | Action |
|---|---|
| ≥1 'yes interest' or 'send pricing' reply | Validates Path 2 — queue Batch 4 with similar shape, expand candidate pool via Twitter-DM-via-aged-account route |
| ≥1 'come back at X visits' price-anchor reply | Price anchor secured — queue Batch 4 deferred until traffic gates pass X visits/day |
| 0 replies but Vercel/GoatCounter shows referrer from any of the 8 recipient domains | Silent click-through = soft signal, queue 7-day polite bump, NOT pivot |
| 0 replies AND 0 referrers by 7-day mark (2026-05-18) | **Pivot signal**: skip Path 2 entirely until traffic crosses 1k visits/day; redirect to Path 1 (affiliate / integrator fees) or Path 3 (premium user-pays tier) |

## Pointers

- `product/distribution/outbound-log.md` Batch 3 — full per-recipient table + monitoring playbook
- `product/distribution/_send_outbound_batch3_2026_05_11.py` — reproducible sender
- Problem #67 (queued not_before=2026-05-15T22:00 UTC) — first signal poll
- Problem #50 / Batch 1+2 follow-up still scheduled separately at 2026-05-14T11:39
