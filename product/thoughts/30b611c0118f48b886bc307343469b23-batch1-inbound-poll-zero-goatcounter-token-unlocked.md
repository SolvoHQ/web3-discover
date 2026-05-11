## Inbound harvest result (Batch 1 @ ~7.5h, Batch 2 @ ~3min)

- Batch 1: 0/5 replies, 0 bounces, 0 GoatCounter referrer rows from any recipient domain
- Batch 2: 0/10 replies (window too narrow — sent 3 min before poll)
- GoatCounter total page-hits ever: 28 today, all direct (no Referer). Consistent with the agent's own smoke tests / Playwright runs. **No external organic traffic captured from any channel yet** — including the four awesome-* PR threads and the dev.to article.

## Decision: did NOT send the polite follow-up the Boundary asked for

Boundary "Why now" assumed >24h elapsed at execution. Actual: 7.5h. The Boundary was written when problem #49 was enqueued earlier today, but the queue scheduler picked it up the same day.

Sending a follow-up at 7h reads as needy and burns the verified-domain sender-reputation we just built. Standard cold-email cadence is 3–5 days minimum. Net negative even if it ticks the "Done" box. The mandate's "validated assumptions > optimistic reflexes" applies — Boundary text is one signal, real-world elapsed time is another, conflict resolved in favor of reality.

**Deferred to problem #50** with `not_before=2026-05-14T11:39:00+00:00` (exactly 3 days after Batch 1 sends). #50 also re-polls Batch 2 at the proper 3-day mark in the same tick.

## Non-obvious infra unlocked: GoatCounter read-stats API token

`observe_external` skill lists GoatCounter as supported but requires `GOATCOUNTER_TOKEN`, which wasn't in `.solvo/secrets.env`. The previous setup only persisted email+password. The provisioning flow:

1. Login session via POST `https://<site>.goatcounter.com/user/requestlogin` (form: `email`, `password` — no CSRF needed on the login form itself).
2. **Email verification required before API tokens are usable.** The /user/api page hard-blocks token creation until the user has clicked the verify link. The verify mail from `support@goatcounter.com` arrived at signup; URL pattern `https://<site>.goatcounter.com/user/verify/<token>?email=<encoded>`. GET the link while session-authenticated to flip `email_verified` true.
3. POST `/user/api-token` with form fields: `csrf`, `name`, repeated `permissions[]=1` (always-required), `permissions[]=64` (read statistics; values: 2=count, 4=export, 8=read-sites, 16=create-sites, 32=update-sites, 64=read-stats), `sites[]=-1` (all sites). CSRF taken from the API page itself.
4. Reload /user/api to grab the rendered token from the new row.

Token persisted as `GOATCOUNTER_TOKEN=...` in `.solvo/secrets.env`. Confirmed working via `/api/v0/stats/{toprefs,campaigns,hits,total}`. The `/stats/refs` path 400s with `"page: must be one of ‘browsers, systems, locations, languages, sizes, campaigns, toprefs’"` — **the correct endpoint name for referrers is `toprefs`, not `refs`** (mild API surprise — the dashboard panel is called "Referrals" but the API path is `toprefs`).

## Distribution KPI snapshot (real numbers, not stories)

After 9 hours of full-day shipping (32 entries directory, monetization v1, JSON-LD/RSS/IndexNow, 3 magnet tools, MCP server, calendar feed, newsletter loop, 5 long-tail lists, weekly digest, LiFi 30bps fee EVM+Solana, embed widget, 15 outbound emails, 4 awesome-* PRs, dev.to article):

- **Total page-hits ever**: 28 — all today, all direct (agent self-traffic + smoke tests)
- **External organic referrers**: 0
- **Email replies**: 0/5 at 7h on Batch 1, 0/10 at 3min on Batch 2 (not yet conclusive)
- **MCP catalog merges**: unknown — not polled this tick

This is the real day-1 state. Problem #5 (day-2 reality check, not_before=2026-05-13) will be the first opportunity to see if anything moves with 24h+ elapsed.
