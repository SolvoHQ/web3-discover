---
title: Airdrop tax basics for US/EU farmers
blurb: When a token landing in your wallet becomes a taxable event, how cost basis works when you eventually sell, and the bookkeeping habits that save you weeks at filing time. Not financial advice.
theme: taxes
publishedOn: 2026-05-11
lastUpdated: 2026-05-11
---

> **Not financial or legal advice.** Tax law varies by country, by state, and by year. This guide is a starting map, not a substitute for a professional who knows your specific situation. The penalty for getting it wrong is real money. Talk to a crypto-literate accountant before filing.

Most airdrop farmers think about taxes once, at the end of the year, when it's already too late to fix the bookkeeping. The expensive mistakes are almost never about the tax law itself — they're about not having the data on hand to apply the law. This guide covers the rough shape of how airdrops are taxed in the US and the EU, and the small habits during the year that make filing painless.

## The two events you have to track

For nearly every framework, an airdrop produces two distinct taxable moments:

1. **Receipt** — when the token shows up in a wallet you control, in a form you can do something with.
2. **Disposal** — when you eventually sell, swap, spend, or bridge it for something else.

These are valued separately, and the gap between them is where the math gets interesting (or expensive).

## United States: how the IRS sees airdrops

The IRS published Rev. Rul. 2019-24 on airdrops and hard forks. The short version:

- **Receipt is ordinary income.** When you have "dominion and control" over the token — meaning you can transfer, sell, or use it — the fair market value at that moment is ordinary income, taxable at your marginal rate.
- **Your cost basis is that same fair market value.** When you later sell, your gain or loss is `sale price − fair market value at receipt`.
- **Disposal triggers capital gains.** If you held the token more than 12 months between receipt and disposal, the gain is long-term (preferential rates). Less than 12 months: short-term, taxed as ordinary income.

What "dominion and control" means in practice:

- A token that's airdropped to your address but is non-transferable until a future unlock date: probably *not* dominion until unlock.
- A token that lands in your address as a transferable ERC-20 you could swap immediately: yes, dominion at the receipt block.
- A claim that requires you to actively call a `claim()` function: dominion at the moment your claim transaction confirms, not at the snapshot.

The IRS has not given exhaustive guidance on these edge cases. A defensible position is to use the timestamp at which you could first have moved the token, even if you didn't.

### Reporting forms (US)

- Ordinary income from airdrops generally flows through to Schedule 1, "Other income".
- Capital gains/losses on disposal go on Form 8949 → Schedule D.
- Starting tax year 2025, US brokers issued **Form 1099-DA** for digital asset proceeds. DEX swaps and self-custody activity are not on it; you still need your own records.
- The "did you receive, sell, or otherwise dispose of digital assets" question on Form 1040 needs a "yes" if any of this happened. Lying to the IRS on a yes/no question goes badly.

## European Union: a sketch (the situation is fragmented)

The EU does not have a single tax regime for crypto. Each member state writes its own rules, and they are not converging. A rough field guide to a few high-population jurisdictions:

- **Germany** — Airdrops you actively claim or for which you "perform a service" (quests, social media tasks, providing liquidity) are typically taxable as ordinary income at receipt. Pure unsolicited drops may not be. Crypto held more than 12 months is then tax-free on disposal — Germany's well-known one-year rule. Under 12 months: taxed as ordinary income.
- **France** — Crypto-to-crypto trades are generally not taxed; the tax event is crypto-to-fiat. Disposal is taxed under a flat 30% PFU regime. Airdrop receipt itself is a contested area; recent doctrine treats consideration-based drops as taxable income at receipt.
- **United Kingdom** (not EU, but in scope here) — Airdrops are income if received in exchange for a service, otherwise generally not taxed at receipt. Disposal is capital gains, with an annual exempt amount that has been shrinking.
- **Netherlands** — Crypto holdings are taxed as wealth (box 3) on a deemed-yield basis at year-end, regardless of realized gains. Airdrop receipt at fair market value adds to the wealth balance.
- **Portugal** — Previously famous for crypto-friendliness; the 2023 reform introduced capital gains tax on short-term (<12 month) crypto disposals. Airdrops sit in an ambiguous category that's been moving.

If you live in the EU, "search your country plus crypto tax 2026" is not optional. The rules have shifted year-over-year, and the official tax authority site is more current than any English-language summary.

## The MiCA layer (informational, not tax)

[MiCA](https://www.esma.europa.eu/policy-activities/crypto-assets) — Markets in Crypto-Assets — is an EU-wide *regulatory* framework, not a *tax* framework. It mostly affects exchanges, issuers, and stablecoin operators. It does not change how your individual airdrops are taxed; that stays national. But it does drive what KYC and reporting the exchanges you cash out through will demand of you.

## What to actually record during the year

The single best tax-prep habit is to log each airdrop event when it happens, not in March. A minimum useful record per event:

| Field | Why it matters |
| --- | --- |
| Date and time (UTC) | Determines tax year and FMV timestamp. |
| Wallet address | Lets you tie back to on-chain proof. |
| Transaction hash | The single primary key the IRS recognizes. |
| Token symbol and contract address | Disambiguates forks and impersonator tokens. |
| Amount received | Self-evident, but write it down. |
| Fair market value in USD/EUR at receipt | This is the income number. |
| Source URL of the FMV (CoinGecko, exchange, etc.) | An auditor will ask. |
| Notes on character of receipt | "Active claim", "passive drop", "for liquidity", "for quest" — affects classification. |

Spreadsheet or a tool like Koinly / CoinTracker / Recap / Awaken — both work. The tools save time on capital gains lot accounting (FIFO/HIFO/specific identification) and 8949 formatting; you still have to feed them clean data.

## Common mistakes that cost money

- **Forgetting to record FMV at receipt.** Without it, you'll later either overpay (using $0 basis, all gain is income) or guess wrong and get audited.
- **Treating a claim as "free money" with no tax obligation.** The IRS does not. Ordinary income at receipt is the default position.
- **Selling within 12 months by accident.** A one-day-too-early sale in a long-term-favorable jurisdiction can swing the rate by 20+ percentage points. If you have a token that's already in profit and approaching the 12-month mark, the timing of the sale is itself a tax decision.
- **Not accounting for gas as a cost basis adjustment.** The gas you paid to claim is generally an addition to basis or a deductible cost (jurisdiction dependent). Across a hundred claims, this adds up.
- **Mixing tax wallets with non-tax wallets.** If you've been using the same wallet for personal spending and airdrop farming, every coffee transaction now needs to be characterized. Separate wallets from day one — for tax reasons alone, even before security.

## The minimum-effort version

If you do nothing else this year:

1. Keep a single spreadsheet with one row per airdrop receipt: date, token, amount, USD value at receipt, tx hash.
2. Keep a second spreadsheet with one row per disposal: date, token, amount, USD value at disposal, gas, tx hash.
3. At year end, hand both to an accountant who has filed crypto returns before. The fee will be lower than the audit risk of doing it yourself wrong.

The expensive mistake is not paying too much tax. The expensive mistake is not having records.

## Further reading on this site

- [How to spot a fake airdrop](/guides/airdrop-scams) — before you have a tax problem, don't have a scam problem.
- [Wallet hygiene for airdrop farmers](/guides/wallet-hygiene) — separated wallets make tax separation trivial.
- [Live airdrop directory](/airdrops) — hand-vetted, deadline-sorted, freshness-stamped.
