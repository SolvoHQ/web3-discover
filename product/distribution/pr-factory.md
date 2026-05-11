# PR factory — backlink wave

Canonical log of every PR opened against an external `awesome-*` / curated list to add a reference to https://web3-discover.vercel.app (or the CC0 data mirror `SolvoHQ/web3-discover-data`).

Channel infra: `gh repo fork → clone → edit README → branch → push → gh pr create`. No new dead road; auth is the SolvoHQ-org GitHub token. PR body always offers "happy to move section if you prefer" to lower friction.

State legend: `open` = under review · `merged` · `closed-rejected` (silent or with reason) · `closed-bot`.

## All PRs

| Wave | Repo | Stars | Section | PR | State | Opened (UTC) |
|------|------|------:|---------|----|-------|--------------|
| 1 | [ahmet/awesome-web3](https://github.com/ahmet/awesome-web3) | 858 | (untitled — main bullet list) | [#679](https://github.com/ahmet/awesome-web3/pull/679) | open | 2026-05-11T12:47:24 |
| 1 | [bekatom/awesome-ethereum](https://github.com/bekatom/awesome-ethereum) | 912 | Tools | [#71](https://github.com/bekatom/awesome-ethereum/pull/71) | open | 2026-05-11T12:48:11 |
| 1 | [useWeb3/awesome-web3](https://github.com/useWeb3/awesome-web3) | 16 | Learn & Earn | [#5](https://github.com/useWeb3/awesome-web3/pull/5) | closed-rejected (silent, no comments) | 2026-05-11T12:50:43 |
| 1 | [twf-nikhila/awesome-web3-resources](https://github.com/twf-nikhila/awesome-web3-resources) | 68 | Other Interesting Projects | [#7](https://github.com/twf-nikhila/awesome-web3-resources/pull/7) | open | 2026-05-11T10:40:13 |
| 2 (MCP) | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | 86 709 | Finance & Fintech | [#6205](https://github.com/punkpeye/awesome-mcp-servers/pull/6205) | open (🤖🤖🤖 bot-dispatched) | 2026-05-11T14:00:53 |
| 2 (MCP) | [TensorBlock/awesome-mcp-servers](https://github.com/TensorBlock/awesome-mcp-servers) | 669 | Finance & Crypto | [#528](https://github.com/TensorBlock/awesome-mcp-servers/pull/528) | open | 2026-05-11T14:03:41 |
| 3 | [brandonhimpfen/awesome-defi](https://github.com/brandonhimpfen/awesome-defi) | 21 | Analytics and Data Tools | [#23](https://github.com/brandonhimpfen/awesome-defi/pull/23) | open | 2026-05-11T20:33 |
| 3 | [brandonhimpfen/awesome-ethereum](https://github.com/brandonhimpfen/awesome-ethereum) | 5 | Decentralized Applications (dApps) | [#6](https://github.com/brandonhimpfen/awesome-ethereum/pull/6) | open | 2026-05-11T20:33 |
| 3 | [brandonhimpfen/awesome-cryptocurrency](https://github.com/brandonhimpfen/awesome-cryptocurrency) | 4 | Market Data and Analytics | [#10](https://github.com/brandonhimpfen/awesome-cryptocurrency/pull/10) | open | 2026-05-11T20:33 |
| 3 | [fewwwww/awesome-web3-skills](https://github.com/fewwwww/awesome-web3-skills) | 204 | Onchain Skills → MCP Servers & On-Chain Data | [#7](https://github.com/fewwwww/awesome-web3-skills/pull/7) | open | 2026-05-11T20:34 |
| 3 | [Helmi/awesome-crypto](https://github.com/Helmi/awesome-crypto) | 88 | Tools | [#19](https://github.com/Helmi/awesome-crypto/pull/19) | open | 2026-05-11T20:34 |
| 3 | [DROOdotFOO/awesome-web3-data](https://github.com/DROOdotFOO/awesome-web3-data) | 17 | Data Providers | [#17](https://github.com/DROOdotFOO/awesome-web3-data/pull/17) | open | 2026-05-11T20:34 |
| 3 | [demcp/awesome-web3-mcp-servers](https://github.com/demcp/awesome-web3-mcp-servers) | 608 | 🛠️ Tool | [#85](https://github.com/demcp/awesome-web3-mcp-servers/pull/85) | open | 2026-05-11T20:34 |
| 3 | [Al-User12/Awesome-Crypto-Tools](https://github.com/Al-User12/Awesome-Crypto-Tools) | 0 | Airdrop & Alpha Research | [#1](https://github.com/Al-User12/Awesome-Crypto-Tools/pull/1) | open | 2026-05-11T20:34 |
| 3 | [Fkleppe/awesome-crypto-tools](https://github.com/Fkleppe/awesome-crypto-tools) | 0 | News & Research | [#4](https://github.com/Fkleppe/awesome-crypto-tools/pull/4) | open | 2026-05-11T20:34 |
| 3 | [BaseMax/AwesomeCryptocurrency](https://github.com/BaseMax/AwesomeCryptocurrency) | 24 | All List | [#5](https://github.com/BaseMax/AwesomeCryptocurrency/pull/5) | open | 2026-05-11T20:35 |

**Totals**: 16 PRs across 16 external repos · 15 open · 1 closed-rejected (silent).

## Targeting rule (locked in after Wave 3)

A repo qualifies for the factory if **all** of these hold:
- `awesome-*` shape (curated list, README-driven) — *not* an auto-generated `dylanhogg/awesome-crypto`-style dump (45k-line auto-script) where any PR gets overwritten on next regen.
- Last commit ≤12 months from today (today = 2026-05-11 → cutoff 2025-05-11).
- README contains an existing section that *plausibly* fits a curated web3-airdrop / data / MCP / discovery entry. Categories that have worked: Tools, Analytics & Data, Data Providers, MCP Tool, Airdrop / Alpha Research, dApps, Resources.
- Not already pitched (PR or cold email). Maintain a cross-check against `outbound-log.md` recipient list — email-pitched maintainers may rate-limit a follow-up PR within the same 7-day window, so prefer different repos.
- No HTML-table-based entries (CryptoToolsDirectory shape) unless we explicitly bite the cost.
- Skip 0-star ghost-repos where the only PRs are unrelated drive-bys (suggests no human review at all).

## What did NOT make the Wave 3 cut and why

- `defilogist/awesome-solana-airdrops` — topically perfect (Solana airdrops) but last commit 2025-02-09 → outside 12-month cutoff. Reconsider if the repo wakes up.
- `helius-labs/solana-awesome`, `StockpileLabs/awesome-solana-oss`, `0xMacro/awesome-solana-security` — all >300 stars, recent, but topic-restricted (general Solana dev / OSS / security). web3-discover is multi-chain consumer, not Solana-internals — would read as off-topic.
- `pirapira/awesome-ethereum-virtual-machine` — EVM internals (Yellow Paper, EVM implementations). Off-topic for a consumer airdrop directory.
- `steven2358/awesome-blockchain-ai` — academic "blockchains for AI" framing, not consumer crypto.
- `dylanhogg/awesome-crypto` (45 621 lines) — auto-generated from a script; any PR gets overwritten on next regen.
- `headwindz/awesome-web3` — Next.js platform whose resources are stored in `data/*.json`, not README. Would require a different PR shape (data file edit).
- `muba99-bit/Awesome-Crypto-Tools`, `CryptoToolsDirectory/Crypto-Tools-Directory` — SEO-spam shape (zip-bait links, HTML-table-only). Low likelihood of human review.
- `brandonhimpfen/awesome-crypto-wallets` — sections are about wallet *types* (hardware / software / backup), not directory aggregators. No clean slot.
- `surajondev/awesome-web3.0` — dApp section is educational links (📄 articles, 📖 books, ▶️ videos) only; a directory entry doesn't match the pattern.

## Reply / merge monitoring

- Auto-poll: `gh search prs --author=@me --state=all --limit=50` plus per-PR `gh pr view <n> --repo <owner/repo> --json state,mergedAt,closedAt,comments`.
- Indirect signal: GoatCounter `/api/v0/stats/toprefs` — referrer rows from any of the repo domains (e.g. `github.com/ahmet/...`) when the README is merged and indexed.
- Decision rule: at 7 days post-open, any PR that is still un-touched (no label / no comment / no merge) gets flagged in this file as `stale-open`. PRs closed-rejected don't get re-pitched in any form (PR or email).

## Future waves — already-known dry wells (don't re-pitch)

- Cold email to crypto-newsletter operators: 15 sends, 0 replies, 0 referrers (Batch 1 + Batch 2 in `outbound-log.md`). Email channel structurally weak for retail crypto distribution.
- Twitter / Reddit / Telegram / Farcaster / HN (fresh account): all confirmed gated by anti-bot or karma-gate (`launch-wave-architectural-block` thought).
- Bing Webmaster Tools dashboard: device-rep-blocked pre-captcha (BWT signup dead road thought 2026-05-11).
- Cloudflare Pages signup: Turnstile-gated.
