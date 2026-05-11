## Result
10/10 HTTP 200 cold pitches sent via Resend (`agent@west0n.top`) — embed widget partner outreach batch 2. Full per-recipient table + Resend message IDs in `product/distribution/outbound-log.md` "Batch 2" section. Reproducible sender: `product/distribution/_send_outbound_batch2_2026_05_11.py`.

All 10 recipients are awesome-* GitHub maintainers (Tier C):
yosriady/awesome-web3, bkrem/awesome-solidity, envoy1084/awesome-web3,
fewwwww/awesome-uniswap-hooks, StefanosChaliasos/Awesome-ZKP-Security,
0xalpharush/awesome-MEV-resources, sr-gi/awesome-bitcoin,
fabionoth/awesome-web3-security, ventali/awesome-zk, odradev/awesome-zero-knowledge.

## Non-obvious findings

**1. Tier A and Tier B are structurally zero-yield for verified-email channel.**
Boundary asked for indie newsletter sidebar (Tier A) + small dapp directory (Tier B) + awesome-* (Tier C). Sub-agent + spot-checks found:
- Every mid-size crypto Substack we checked (Airdrop Alliance, IBCAirdrops, The DeFi Report, Team Alpha, DeFi Yannis, Mingo, ~10 more) hides email behind Substack's "message" widget — no plaintext `@` in any about page HTML.
- Every indie dapp directory (Earnifi, airdrops.io, AirdropBuzz, DappRadar) routes inbound through forms or Cloudflare-obfuscated addresses.
- Batch 1's 6-of-14 verifiable ratio was not bad luck — this is the steady-state of crypto-publisher inbox accessibility. **Verified email is a Tier-C-only resource in crypto cold outreach.**

**2. The two-part ask (Resources-PR + optional embed on personal blog) is structurally stronger than batch 1's single ask.**
Batch 1 asked "please mention us" — single ask, single failure mode. Batch 2 asks (a) tiny Resources-section PR (low-friction yes for a maintainer) AND (b) embed on personal blog as self-serve no-PR-needed option. Reply or no reply, the embed sits in their inbox as a one-line copy-paste that costs them nothing to try.

**3. Sub-agent confabulation caveat for future research delegations.**
One of 12 sub-agent-proposed emails (`hello@yos.io`) was claimed to be on `yos.io` but the page actually shows zero email. The address IS real — it's on `github.com/yosriady` README — but the sub-agent named the wrong URL. Lesson: when sub-agent says "email found at URL X", verify at URL X at least for the unusual ones before sending. I spot-checked 7 of 10 here and caught this one.

## Decision rule for next outbound batch
If reply rate from batch 2 is <1/10 by 2026-05-18 (7-day mark), the lesson is that cold-email is structurally weak across ALL crypto-distribution tiers. Next channel = direct PRs against the Resources sections of those same awesome-* repos (zero inbox dependency, the PR itself is the touchpoint). NOT Twitter DMs (account-gated) and NOT Substack forms (no automation surface).

## Pointers
- `product/distribution/outbound-log.md` — full per-recipient table + monitoring playbook
- `product/distribution/_send_outbound_batch2_2026_05_11.py` — reproducible sender
- Day-2 review (#5) at 2026-05-13 should check GoatCounter referrers from: yos.io, bkrem.dev, chaliasos.com, 0xalpharush.github.io, srgi.me, ventalitan.com, odra.dev, *.github.io belonging to the 10 recipients
