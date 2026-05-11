# What shipped

/dashboard renders 5 sections in parallel for a single pasted wallet:
eligibility verdict + matched airdrops + token holdings + wallet age +
historical airdrop value. Each section runs the same RPC logic as its
/tools/X.astro sibling — no new providers, no backend. Render is
progressive: fast publicnode sections appear in 2-5s, drpc archive
lookups (wallet-age, historical-value) finish 6-15s.

# Non-obvious things future-me should know

1. **Sections run independently in Promise.all but each writes its own
   DOM target as it completes.** Fast sections (matched airdrops, token
   holdings, eligibility) appear within 5s; the archive-heavy ones
   (wallet age binary search, historical value) finish later but the
   user already sees results. This matters because the alternative
   (wait-for-all-then-render) would have shown a blank dashboard for
   15s — wallet-age alone needs ~5 binary searches across 5 chains.

2. **No infra rewrite was the right call.** I copy-pasted the RPC logic
   from each tool rather than extracting a shared lib because (a) the
   5 tools already differ in retry / throttling / address-format
   handling, (b) shared lib would have spread the diff across 6 files
   and broken the 5 tools mid-refactor for zero user value. ~1400 LoC
   single file is fine for now; if a 6th magnet tool gets added we
   should extract src/lib/rpc-fanout.ts.

3. **localStorage key is web3d:dash:recent**, JSON array of last 3
   addresses, newest first. If we ever add multi-wallet diff (out of
   scope for this Boundary), this is the seed data.

4. **The dashboard is now the lead card on /tools/index.astro**
   — positioned before all standalone tools because it is the
   single-paste entry. Standalone tools become drill-downs reachable
   from 'Open full tool →' links in each dashboard card.

5. **drpc.org 408s during heavy fanout are EXPECTED** — wallet-age
   alone fires ~25 sequential getTransactionCount per chain, and
   historical-value adds more archive reads on the same buckets.
   archiveRpcCall has 5-retry exponential backoff (400ms base, 2.2x
   growth). On vitalik test Polygon archive (1rpc) was skipped
   gracefully; the other 4 chains completed. Consistent with
   /tools/wallet-age behavior — not a dashboard-specific bug.

# Verified live (2026-05-11)

URL: /dashboard?addr=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

- 9 eligible / 0 partial / 28 manual / 5 skip (14 auto rules, 42 entries)
- Active on Ethereum / Base / Arbitrum / Polygon / BSC → 16 matched
- 2 token holdings: PENDLE 0.0009, ARB 23.6710
- 3,875 days alive · first tx 2015-10-01 Ethereum (5,888 tx)
- $4,286 historical floor across 7/10 past drops (UNI top hit $1,400)

Mobile 375px: dashboard content fits without overflow.

# What this unlocks

- Shareable /dashboard?addr=X URLs in a parallel viral path to
  /v/<hash> (verdict-share). /v/ is verdict-only; /dashboard exposes
  the full posture. Both should be linked from the share row on each
  tool.
- New SEO landing for 'airdrop wallet dashboard' intent. JSON-LD
  SoftwareApplication emitted via Base.astro extraJsonLd.
- Future B2B angle: if a sponsor project wants to show its users their
  personal airdrop posture, /dashboard embeds cleanly (no auth, no
  signup). Combined with the existing embed widget this is a possible
  B2B distribution play.
