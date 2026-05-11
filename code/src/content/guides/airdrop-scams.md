---
title: How to spot a fake airdrop
blurb: The five questions to ask before you click any "claim" button. A field manual for staying solvent in a category where the scammers spend more on UX than the protocols do.
theme: scams
publishedOn: 2026-05-11
lastUpdated: 2026-05-11
---

If you farm airdrops long enough, someone will eventually hand you a link that drains your wallet. The bad news is that the fake claim pages now look better than the real ones — scammers have UX budgets, while real protocols often launch with rough-edged announcements. The good news is that the scams almost always fail one of five basic checks. Run every link through this list before you sign anything.

## 1. Where did the link come from?

The single highest-leverage filter. Treat the source like the link itself.

- **Twitter replies under a real account.** ~95% of these are paid impersonator accounts. The reply with the highest engagement is almost always the scam — scammers buy engagement.
- **Discord DMs from "support".** Real teams almost never DM first. Real support says so in their pinned channel.
- **Telegram groups, especially "official airdrop channel" variants.** Spin-offs are trivial to create; the name in the URL means nothing.
- **Google ads for a project name.** Phishers routinely outbid the real domain. The first sponsored result for a major airdrop is frequently malicious.
- **A blog post you've never heard of.** "10 airdrops to claim now" pages are a known vector — they sprinkle one fake link among real ones for plausible deniability.

The safe path is boring: navigate to the protocol's main domain from a known good source (the GitHub repo, a previously-saved bookmark, a curated directory you trust), then follow internal links from there.

## 2. Does the domain match exactly?

Phishers love a homoglyph. Things to look at:

- **Top-level domain swap.** `protocol.io` vs `protocol.app` vs `protocol.xyz`. Only one of these is real, and the others were registered the day after the announcement.
- **Subtle character swaps.** `rn` for `m`, zero for `o`, capital `I` for lowercase `l`. Copy the URL into a plain-text field and look at it letter by letter.
- **Subdomain tricks.** `claim-protocol.io.airdrop-portal.xyz` is `airdrop-portal.xyz`, not `protocol.io`. The leftmost label is window dressing.
- **Punycode.** Browsers used to render Cyrillic look-alikes as if they were Latin characters; modern browsers usually catch this, but check the address bar for `xn--` if anything looks slightly off.

If you can't verify the domain matches the one on the project's GitHub, X bio, and docs, close the tab.

## 3. What is it asking you to sign?

This is the question that separates "lose nothing" from "lose everything". Open your wallet's transaction simulator (Rabby, Phantom's preview, Wallet Guard, Pocket Universe) and read the simulated outcome before you approve.

Red flags, roughly worst to least bad:

- **`setApprovalForAll` on an NFT or token contract.** This grants the recipient permission to transfer **all** of that asset from your wallet, now and in the future. Real airdrop claims almost never need this. If you see it on a claim flow, leave.
- **`increaseAllowance` or `approve` for an unlimited amount on a stablecoin or wrapped token.** Same family. A claim should not need spending permission on your USDC.
- **An EIP-712 typed-data signature with a `Permit` or `PermitBatch` field.** These are off-chain signatures that give someone permission to move tokens later. They cost no gas and produce no on-chain trace until the attacker uses them — which is exactly why scammers prefer them now.
- **A signature whose message text doesn't match the action.** Reading "Sign in to ProjectX" while the underlying typed data is a permit on USDC is a classic gas-free drain.
- **A claim that wants you to *send* tokens first** ("pay $50 in ETH to unlock your $500 claim"). No legitimate airdrop has ever required this. None.

If your wallet doesn't show you a simulation, use a different wallet for claims. The 30 seconds you save by skipping the preview is not worth the risk.

## 4. Is anyone independently confirming the claim is live?

Real airdrops produce a small flood of confirming signals: the project's official X account posts it, the docs page is updated, the contract is verified on the relevant block explorer, the team's engineers tweet from their personal accounts. Fake airdrops produce one channel — the channel you're already on.

Concrete checks:

- The contract address you're being asked to interact with should appear on the project's official docs or GitHub, not just in the page you're on.
- The contract should be verified on the relevant explorer (Etherscan, Solscan, Basescan, etc). Unverified contracts are not automatically scams, but for a claim flow this is unusual.
- A real claim period generates conversation on the project's own Discord / Telegram. If nobody else is talking about a claim being live, the claim is probably not live.
- Search the contract address on Twitter. If the only mentions are bots and the same impersonator handles, that's the impersonator handles confirming each other.

A working heuristic: if the claim page is the *only* place you can confirm the claim exists, the claim does not exist.

## 5. Why is there time pressure?

Almost every drainer page has artificial urgency. "Claim closes in 14:59." "Only 1,832 wallets left." "Snapshot ends at midnight." This is sales-funnel design borrowed straight from regular phishing — pressure shuts off the part of your brain that asks the first four questions.

Real airdrops do have deadlines, but they're announced weeks in advance, on the project's own channels, and the countdown in the official claim portal matches the countdown the team has been advertising. If the countdown is the *first* place you learned about the deadline, that's a flag.

A useful rule: any claim page can wait 10 minutes. Close the tab. Walk away. Independently re-confirm the domain. Come back. If the offer evaporated, it was supposed to.

## The one-paragraph version

Treat every "claim" link as guilty until proven innocent. Get to the protocol's site through a route you control (bookmark, GitHub README, curated directory). Verify the domain character-by-character. Read the simulated transaction in your wallet before approving. Cross-check the claim against at least one independent channel. Ignore urgency. The airdrops you miss by being cautious will cost you nothing; the wallet you drain by being trusting will cost you everything.

## Further reading on this site

- [Wallet hygiene for airdrop farmers](/guides/wallet-hygiene) — separating the wallets you risk from the ones you don't.
- [Airdrop tax basics for US/EU farmers](/guides/airdrop-taxes) — what to track when a claim actually does work.
- [Live airdrop directory](/airdrops) — hand-vetted, scam-filtered, deadline-sorted.
