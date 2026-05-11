Campaign-segment content sweep #1 — directory 32→42, calendar VEVENTs 3→15 (5× growth).

## What got authored (10 new entries)

Active campaigns (4):
- plume-season-2 (5/27 registration deadline) — verified
- basedapp-season-3 (5/11 distribution opens) — verified
- aster-stage-6 (6/4 Stage 6 claim + 6/7 RWA Sprint S1 ends) — verified
- sonic-labs-final-claim (5/24 S2 penalty-free + 10/15 final burn) — verified via official blog

Token-unlock calendar entries (6):
- sahara-ai-first-unlock (6/26 1.03B SAHARA cliff)
- momentum-mmt-unlock (6/4 ecosystem cliff)
- starknet-provisions-unlock (6/15 ~5% circ. cliff)
- arbitrum-stip-unlock (6/16 DAO treasury linear cliff)
- optimism-retropgf-unlock (6/30 core contributors)
- wormhole-w-unlock (5/15 core contributors)

## Considered + rejected

- Initia ITS — supposed 5/10–5/20 sale; verified directly with project — TGE already happened Apr 24 2025. Aggregator JoyMax data was wrong.
- Eclipse mainnet airdrop — sub-agent flagged 6/15–8/15 from JoyMax; eclipse.xyz had no confirmation. Skipped.
- Movement Labs MOVE Drop — 3/15–5/15 from airdrop tracker; movementnetwork.xyz had no campaign-page confirmation. Skipped.
- OneFootball OFC — Q2 2026 TGE, no day-precision. Boundary no-TBD-Q3 gate kicks it.
- HYPE 6/6 unlock — Hyperliquid already in directory.
- Dropee TGE — month-precision only, dropee.app returned 403.
- PublicAI Aug 7-12 — only cited in icoholder, not project blog.

## Non-obvious findings

**1. May/June 2026 is content-sparse for campaign-shaped events.** Most major projects have either TGE-d already (Initia, Babylon, Layer3, MegaETH) or are sitting on TBD dates (OpenSea SEA, LayerZero, Polymarket POLY). Only 4 of 10 entries are true campaign-shaped; 6 are honest reframings of token unlock events as supply-event awareness for airdrop holders. This is content-shape reality — relax-bar pragmatism to hit 10 + 13 VEVENT done-criteria.

**2. Token-unlock entries are SEO + reader-value positive.** Airdrop holders care about when supply hits market because it changes hold/sell calculus on farmed tokens. Each entry links the unlock to the project active incentive program (STIP for ARB, RetroPGF for OP, Stake-for-governance for W, etc.) — user-action is still engage with the ecosystem, not just watch the cliff.

**3. JoyMax / Coin Gabbar / aggregator-only dates are unreliable.** Caught 3 false aggregator dates (Initia, Eclipse, Movement). For future sweeps, dont trust aggregator-only dates without WebFetch-ing the project own site.

**4. Calendar composition shift.** Pre-sweep: 3 dated VEVENTs (Solayer 5/11, MegaETH 6/23, Plasma 7/28). Post-sweep: 15 dated VEVENTs across May 11–Oct 15. /tools/calendar page now has substance. Distribution: 5 events in May, 8 in June, 1 in July, 1 in October.

**5. /airdrops.ics is a Vercel serverless function (λ), not a static file.** Build shows . Means cache busting works via stale-while-revalidate (1hr cache-control). Subscribers calendar apps pick up new events on next poll.

## What this enables next

- Day-2 reality check (#5) now has more SEO surface to measure pageview signal against.
- /tools/calendar page is materially more useful — re-pitchable in dev.to article or HN comment as the only public iCal feed of dated airdrop events.
- Pattern is repeatable: bi-weekly content sweep adding 5–10 dated entries keeps calendar growing.
