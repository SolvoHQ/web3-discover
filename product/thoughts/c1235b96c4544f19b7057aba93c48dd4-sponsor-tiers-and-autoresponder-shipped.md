# /sponsor 3-tier pricing rationale + autoresponder architecture

## PRICING (anchored low for zero-traffic; lock-90d sweetener for first sponsor)
- **Featured slot $400/wk** — was the original pre-tier rate; below typical crypto-newsletter Featured ($300-1500/wk public rate-card range — Defiant $1200-2000, Bankless $5K+ but huge audience; smaller niches $200-500). Zero traffic → anchor below median.
- **Sidebar promo $250/wk** — lower commitment; recurring impressions across 42+ entry pages so cheaper-per-eyeball as directory grows.
- **Sponsored guide $800 flat (30-day window)** — evergreen indexable artifact; pays once, keeps earning organic clicks. 4-day first-draft SLA.
- First sponsor on each tier locks rate for 90 days (early-mover sweetener).

## Autoresponder architecture
- Vercel Hobby cron CANT run more often than daily — `vercel deploy` errored on `0 * * * *` with "Hobby accounts are limited to daily cron jobs". Pivoted to `30 9 * * *`.
- /sponsor copy updated to "Autoresponder confirms receipt; a human replies within 24h" — daily SLA aligns with human reply SLA, so no expectation gap.
- Sub-hourly escape hatch: GitHub Actions schedule (5-min granularity, free on public repos) can curl the endpoint with CRON_SECRET. Not built yet — wait for actual inbound signal.

## IMAP architecture
- Raw IMAP-over-TLS client (~80 LoC) in code/api/cron/sponsor-watch.mjs rather than pulling imapflow/node-imap. Zero deps + smaller cold-start, limited to LOGIN/SELECT/UID SEARCH/UID FETCH/UID STORE. If IDLE or extension support ever needed → swap to imapflow.
- BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)] — does NOT auto-set \Seen on read; explicit UID STORE +FLAGS \Seen only after successful Resend send. Means Resend failure leaves message UNSEEN for next-day retry — exactly the idempotency we want.
- Self/loop guard: From: matches @west0n.top OR IMAP username → skip send but still mark Seen.

## Synthetic test results (Resend delivered@resend.dev echo address)
- dryRun (Featured slot): 200 OK, htmlBytes=3898, tier detection works.
- dryRun (Sponsored guide): 200 OK, htmlBytes=3942, tier detection works.
- fixture (Sidebar promo → delivered@resend.dev): resendId=0c36920d-b50e-4257-8fe4-ad16796b9444, GET /emails/{id} last_event=delivered. End-to-end pass.

## Constraint to remember
**Vercel Hobby cron limit**: max 2 crons OR daily granularity. If both needed → GHA-curls-Vercel is the standard escape hatch.
