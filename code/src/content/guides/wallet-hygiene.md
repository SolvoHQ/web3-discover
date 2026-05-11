---
title: Wallet hygiene for airdrop farmers
blurb: How to separate the wallets you risk from the ones you don't, why a transaction simulator pays for itself the first time, and the recurring revocation habit that closes the longest-lived attack surface in crypto.
theme: hygiene
publishedOn: 2026-05-11
lastUpdated: 2026-05-11
---

Most wallet drains do not come from one bad signature. They come from a stockpile of forgotten approvals, granted across dozens of dapps over months, sitting on a wallet that also holds the user's life savings. The fix is structural: separate the wallets you use for farming from the wallets that hold value, simulate every transaction, and revoke approvals on a schedule. This guide walks through each.

## The three-tier wallet model

The minimum useful structure for a serious airdrop farmer is three tiers. Each tier has a different threat model, and value flows in one direction.

### Tier 1 — Cold storage (the vault)

- **Hardware wallet.** Ledger, Trezor, GridPlus, Keystone. Self-hosted firmware, seed phrase on metal, kept somewhere physical you control.
- **Never connects to a dapp.** Period. Not even once. Not for "just this one mint". A hardware wallet that has signed a dapp transaction is no longer a vault wallet; it's now a hot wallet with extra steps.
- **Holds the assets you can't afford to lose.** Your long-term ETH, BTC, blue-chip positions, the airdrop tokens you've harvested and plan to hold.
- **Receives transfers from Tier 2 only.** Outbound transactions are rare and deliberate — usually only to consolidate harvested airdrop tokens or to refresh Tier 2 gas.

### Tier 2 — Warm wallet (the operating account)

- **A hot wallet** (MetaMask, Phantom, Rabby, etc.) holding modest balances — enough gas for the next few weeks of farming and any temporary positions.
- **Funded from Tier 1 in chunks**, never directly from an exchange (so the cold address never gets associated with a doxxed CEX deposit).
- **Used for occasional, deliberate signing** on protocols you have a high-trust relationship with: bridge operators, blue-chip DEXes, stablecoin issuers.
- **Periodically swept clean** when balances exceed a threshold you set — push the excess up to Tier 1.

### Tier 3 — Burner wallets (the farming hands)

- **One wallet per campaign**, or per category of activity. Phantom on Solana for Solana drops. A fresh MetaMask address per EVM L2 campaign cluster.
- **Funded with just enough gas** to complete the airdrop's required actions. Top up only when needed.
- **Assume each burner will eventually be compromised.** The point of a burner is that the blast radius of a bad signature is "the $40 of gas in this wallet", not "everything I own".
- **Harvested promptly.** When the airdrop tokens land, sweep them to Tier 2 within a day or two and never use that burner again.

The principle: value flows up (Tier 3 → Tier 2 → Tier 1). Risk flows down (the riskiest signing happens on the wallets with the least value).

### Why "one wallet for everything" loses

Three real failure modes that the tier model prevents:

- **Approval debt.** A wallet you've used for two years has hundreds of token allowances granted across dozens of dapps, some of which now have known vulnerabilities or have been abandoned. Burner wallets cap your exposure at a campaign's worth.
- **Phishing blast radius.** If you sign a malicious permit on Tier 3, the attacker gets the $40 of gas in that wallet. Same signature on a one-wallet-for-everything setup: they get the savings.
- **Sybil detection on your good wallet.** Many airdrops penalize wallets that touched known sybil clusters. Keeping each campaign on a clean wallet keeps your other allocations from getting tainted.

## Transaction simulators: not optional

A transaction simulator runs the transaction against a forked state of the chain *before* you sign it and tells you what would actually happen. Approvals, balance changes, NFT transfers, contract calls — visible in plain English.

The category-leading options as of 2026:

- **Rabby** (browser wallet) — built-in simulator on every transaction. Probably the lowest-friction option for full-time farmers. EVM only.
- **Phantom** (Solana, also EVM) — transaction preview built in. Catches drainer signatures by default and labels them clearly.
- **Wallet Guard / Pocket Universe** — browser extensions that overlay simulation on top of MetaMask. Useful if you're MetaMask-loyal and don't want to switch wallets.
- **Native wallet simulation in newer MetaMask builds** — improving, but historically less detailed than third-party options.

What you want to see in a simulation, on a normal airdrop claim:

- A small ETH/SOL gas spend (the only outflow).
- One inflow of the airdrop token.
- No approvals being granted unless you're depositing into a vault and understand exactly what you're authorizing.

What should make you close the tab:

- The simulator can't simulate the transaction (failure to load, "unable to fetch" — could be a contract designed to be opaque).
- The simulator shows balance changes that don't match what the page described.
- The simulator highlights `setApprovalForAll`, a `Permit` signature, or any open-ended allowance for a transaction that should just be a claim.

The 20 seconds you save by skipping simulation is the most expensive 20 seconds in crypto.

## Revocation: the recurring chore that actually matters

Every approval you've ever granted is still active until you revoke it. Some are needed (your DEX router needs USDC allowance to swap). Most are forgotten. Some are on contracts that have since been hacked.

A revocation cadence:

- **After every airdrop campaign.** When you harvest the tokens from a burner, revoke its approvals to whatever campaign-specific contracts you signed. Cheap on L2s, basically free on Solana.
- **Quarterly sweep on Tier 2.** Even your high-trust warm wallet accumulates. Once a quarter, walk through the list and revoke anything you don't actively need.
- **Annual full audit.** Across all wallets you control, including Tier 1 if it's ever interacted with a dapp.

Tools:

- **revoke.cash** — the canonical revocation tool, works across most EVM chains. Free to view; revocations cost only gas.
- **etherscan / explorer "token approvals" page** — same data, less friendly UI.
- **Phantom** — built-in approvals dashboard for Solana addresses.

Specifically dangerous patterns to look for:

- Unlimited allowances (`uint256.max`) on stablecoins to contracts you no longer use.
- `setApprovalForAll` true on NFT contracts you've never minted from.
- Permit2 universal approvals that you forgot you'd ever signed.

A useful mental model: **approval debt accrues; you have to pay it down.**

## Seed phrase hygiene, in 60 seconds

This guide is about active hygiene, not initial setup. But if you got nothing right at setup, none of the above matters:

- Seed phrase on metal (not paper, not photo, not a password manager file). Multiple physical copies in geographically separated locations you trust.
- Never type your seed into anything. Not a "wallet recovery" form, not a Discord support agent, not a Google Sheet. Anyone who asks for it is an attacker. There are zero exceptions.
- A passphrase ("25th word") on top of the seed gives you a second factor that an attacker who finds the metal still can't bypass. Worth using.

## What the calendar looks like

For a farmer running 20+ active campaigns:

- **Daily**: sign new transactions only on Tier 3 burners. Simulate every one. Sweep harvested tokens to Tier 2.
- **Weekly**: top up burner gas. Spin up a new burner for any new campaign starting that week. Revoke approvals on freshly-completed campaigns.
- **Monthly**: rebalance Tier 2 — push excess to Tier 1, refresh gas if needed.
- **Quarterly**: revocation audit on Tier 2. Re-confirm that Tier 1 is still cold (no dapp signatures).
- **Annually**: full audit across all addresses. Decommission burners that are fully harvested and unlikely to receive future drops.

This is more discipline than most farmers maintain. The ones who maintain it also tend to be the ones who still have wallets to maintain after a few years.

## The one-paragraph version

Use a hardware wallet you never connect to dapps. Use a hot wallet you connect rarely and carefully. Use disposable wallets you assume will eventually be drained. Simulate every transaction. Revoke approvals on a schedule. Treat your seed phrase like a nuclear launch code. Most wallet losses are not bad luck — they're unmanaged debt.

## Further reading on this site

- [How to spot a fake airdrop](/guides/airdrop-scams) — the threats this hygiene defends against.
- [Airdrop tax basics for US/EU farmers](/guides/airdrop-taxes) — separated wallets make tax separation trivial.
- [Live airdrop directory](/airdrops) — campaigns to deploy your fresh burner wallets on.
