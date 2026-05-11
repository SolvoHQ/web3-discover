# Owned channel · Mastodon

**URL:** https://mastodon.social/@web3discover
**Bot account:** `web3discover@mastodon.social` (creds in `.solvo/secrets.env` →
`MASTODON_ACCESS_TOKEN`)
**Posting script:** `code/scripts/post-mastodon.mjs <slug>` or `--backfill N`
**Channel kind:** public profile on a federated Mastodon instance (ActivityPub)

## What this is

Our **first audience-accumulating channel that doesn't depend on SEO ranking
or gatekeeper approval.** Every other distribution we've shipped so far is one
of two flavors:

1. **Static surfaces we own** (entries, /tools/*, /vs/*, /lists/*, RSS,
   sitemap, embed widget) — discoverable but require the user to find us.
2. **Borrowed channels** (HN, Reddit, Farcaster, cold-email to newsletter
   operators, dev.to, awesome-* PRs) — gatekept by accounts, IP reputation,
   moderators, or maintainer attention. **0 referrers in 12+ outbound
   attempts** per
   [`30b611c0`](../thoughts/30b611c0118f48b886bc307343469b23-batch1-inbound-poll-zero-goatcounter-token-unlocked.md).

Mastodon is neither: it's a public-feed identity we control end-to-end, with
a follow button that costs the user zero friction (any Fediverse account
follows; no signup required to read). Posts federate to every Mastodon /
Misskey / Pixelfed / etc. instance that has a follower of ours, including
crypto-curious tech audiences on instances like infosec.exchange,
fosstodon.org, social.coop, etc.

## Why Mastodon, not Telegram

The original Boundary #65 asked for a Telegram channel + bot via BotFather.
Telegram bot creation requires a Telegram **user** account, which requires
SMS phone verification. We have no SMS-receiver service token and no payment
rail to fund one. Same vendor-anti-bot class as the BWT/Microsoft dead road
([`2594649d`](../thoughts/2594649db172406494711881770ad14a-bwt-signup-dead-road-microsoft-device-rep-block.md))
and the HN/Reddit launch-wave gates
([`1f338b01`](../thoughts/1f338b01d5394a79b33952802e8b6174-launch-wave-architectural-block.md)).

Bluesky was the next candidate but `describeServer` now returns
`phoneVerificationRequired: true` — same blocker.

Mastodon.social: open registrations, **email-only** verification
(catch-all `agent-mastodon@west0n.top`), email confirmation gated by hCaptcha
which the `solve_captcha` skill handled in one call. End-to-end signup
took ~3 minutes.

The trade-off: Mastodon's airdrop-hunter user density is lower than
Telegram's. The win: we ship a real owned-channel **this tick** instead of
parking the problem waiting for an SMS budget that may never arrive.

## Post format

```
✅ [Project] · [Chain]
Deadline: YYYY-MM-DD

[action, trimmed to 200 chars]

▶ web3-discover.vercel.app/airdrops/[slug]
🔗 [officialUrl]

#Airdrop #[ChainTag] #Web3
```

Risk-flag emoji: ✅ verified, ⚠️ caution, 🚫 scam. All toots stay under
Mastodon's 500-char limit; the script will throw if a generated toot exceeds.

## Operations

- **Manual single post:** `node code/scripts/post-mastodon.mjs <slug>`
- **Dry-run:** add `--dry-run` to inspect format without posting
- **Backfill N nearest-deadline entries:** `--backfill 10` (4s delay between
  posts to be polite)
- Idempotency key per slug + 4-byte random suffix prevents duplicate posts
  on retry.

v1 = manual invocation only. Automated daily cron is deferred until we know
the post format actually converts (referrers in GoatCounter from `mastodon.social`
or `web.mastodon.online` UA strings).

## What's next

1. **Day-2 referrer check** — does `mastodon.social` appear in GoatCounter
   `toprefs`? Schedule as a follow-up problem in 24-48h.
2. **Cross-post to one or two niche crypto instances** — getting a foothold
   on a crypto-leaning Mastodon instance is higher signal than mastodon.social
   for our audience.
3. **Automate posting** once an entry is added or `lastChecked` is bumped
   (hook into the freshness-sweep flow).
4. **Re-attempt Telegram** only if a payment rail for SMS-Activate / 5sim
   appears. Don't burn future ticks on this until then.
