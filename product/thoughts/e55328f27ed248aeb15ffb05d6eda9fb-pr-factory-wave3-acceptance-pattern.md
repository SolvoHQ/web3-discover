---
name: pr-factory-wave3-acceptance-pattern
description: 10 new awesome-* PRs opened (16 total backlinks); receptive sub-classes are MCP catalogs + topic-broad awesome-web3 with active maintainers; silent-close risk concentrated in tiny single-maintainer Web3 lists
type: project
---

## Conclusion

Wave 3 opened 10 new PRs against curated awesome-* lists (total now 16 across 16 repos, 15 open / 1 closed-rejected). The sub-class taxonomy that should drive future waves:

**Receptive (PR likely to land):**
- **MCP catalogs with bot triage** — punkpeye/awesome-mcp-servers (86.7k stars, robot-emoji fast-track), TensorBlock/awesome-mcp-servers (669), demcp/awesome-web3-mcp-servers (608). Format-strict, but bot-dispatched, fast turnaround. **Highest yield per PR**.
- **Active broad awesome-web3 / awesome-ethereum / awesome-defi maintainers** — ahmet/awesome-web3 (858, ~679 PRs through), bekatom/awesome-ethereum (912). They merge if your section guess matches the existing pattern.
- **Topic-narrow but currently-active lists with an obvious slot** — Al-User12/Awesome-Crypto-Tools has an "Airdrop & Alpha Research" section that is literally our category; DROOdotFOO/awesome-web3-data has Data Providers (fits the CC0 mirror); fewwwww/awesome-web3-skills has an "MCP Servers & On-Chain Data" subsection (fits /api/mcp).

**High silent-close risk (open the PR but expect maybe-merge-maybe-not):**
- **Single-maintainer Web3 lists <100 stars with infrequent commits** — useWeb3/awesome-web3 (16 stars) closed our PR without a single comment, no rejection reason. Likely a personal portfolio repo where the maintainer chose not to grow the list. Sample size 1 in this sub-class; don't over-generalise.
- **Brandonhimpfen mass-list maintainer** — owns 4+ awesome-* repos all pushed same day with low star counts. Could indicate one curator or SEO-farming. Opened 3 PRs to test before scaling up.

**Don't pitch (skipped in Wave 3 even though they passed the date filter):**
- Auto-generated / scraped lists (dylanhogg/awesome-crypto, 45.6k lines from a script) — any PR overwritten on next regen.
- SEO-spam shape (muba99-bit/Awesome-Crypto-Tools — zip-bait readme).
- Lists whose resources live in `data/*.json` not README (headwindz/awesome-web3 is a Next.js platform) — needs different PR shape.
- Topic-restricted lists where our entry would read as off-topic (Solana-only dev lists for a multi-chain consumer directory; awesome-ethereum-virtual-machine for Yellow Paper enthusiasts).
- 0-star ghost-repos whose only PR history is unrelated drive-bys.

## Implication for Wave 4 (when triggered)

- **Default to MCP catalogs** when a new one appears (search GitHub trending for `awesome-mcp` variants). Highest accept rate at lowest effort.
- For non-MCP lists, **filter by PR-merge-throughput-last-90-days, not by star count**. `gh search prs --merged --owner=<x>` is the right metric. A 50-star repo that merges 5 PRs/month is a better target than a 500-star repo with no recent merges.
- Skip any list whose Resources section is exclusively educational content (articles / videos / books). Mismatch shape = silent close.
- Re-check defilogist/awesome-solana-airdrops periodically — perfect topical fit but past the 12-month cutoff at 2026-05-11; if maintainer wakes up, it's the single highest-value PR target we haven't pitched.
- Cross-reference `outbound-log.md` before pitching: don't double-pitch maintainers already emailed (rate-limit risk).

## Sources
- `product/distribution/pr-factory.md` — full PR table (16 PRs, 16 repos, opened / merged / closed states)
- `product/distribution/outbound-log.md` — emailed maintainers (cold-pitch overlap)
