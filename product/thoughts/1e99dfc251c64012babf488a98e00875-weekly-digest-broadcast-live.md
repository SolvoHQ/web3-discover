## Outcome
Weekly digest broadcast loop live. Subscribers captured via the 44 inline-CTA surfaces
now get **recurring** value, not just a one-shot welcome email — first retention lever
on top of /subscribe.

## Wiring
- `code/api/cron/digest.mjs` — GET endpoint, bearer-auth on `CRON_SECRET`.
  Modes: default (create + send), `?dryRun=1` (render-only JSON), `?draft=1`
  (create but don't send), `?status=<id>` (poll Resend broadcast state).
- `code/vercel.json` `crons` block: `{ path:/api/cron/digest, schedule:"0 14 * * 3" }`
  (Wed 14:00 UTC). Vercel auto-injects `Authorization: Bearer ${CRON_SECRET}`.
- Snapshot builder extended to parse the YAML `events:` array — 15 dated milestones
  across 8 entries (same count as airdrops.ics VEVENTs). Digest "next deadlines" lane
  merges top-level entry.deadline + events[], dedup'd to one row per (slug, date),
  preferring the descriptive event label over the generic "deadline".
- Content (deterministic, no LLM): 5 most-recently-checked entries + 5 nearest future
  dated milestones + 2-line editorial header. Footer includes
  `{{{RESEND_UNSUBSCRIBE_URL}}}` token (Resend Broadcasts auto-substitutes the
  per-recipient one-click unsubscribe URL).

## Verification (Iron Law: actual command output, this tick)
- `curl /api/cron/digest?dryRun=1` → htmlBytes=11495, 5 distinct projects in deadlines lane.
- `curl /api/cron/digest` → broadcastId=`8b7f088b-828b-4b49-b679-c136b84f8278`.
- `curl /api/cron/digest?status=<id>` polled 6× over 30s → status=`sent`, sent_at=`2026-05-11 16:44:57.939+00`.
- Vercel API GET /v13/deployments/<id> → confirms `crons: [{ path:/api/cron/digest, schedule:"0 14 * * 3" }]` registered.
- Next scheduled run: **2026-05-13T14:00:00Z**.

## Non-obvious gotchas (for future me)
1. Vercel `env pull` returns empty strings for encrypted production secrets — you
   *cannot* read CRON_SECRET back from CLI after creation. Workflow: generate the
   secret yourself with `secrets.token_urlsafe(32)`, persist to `/tmp/cron_secret.txt`
   *before* piping into `vercel env add`, otherwise the only way to call the cron
   endpoint manually is via the cron itself or a redeploy with `?secret=` baked in.
2. Resend Broadcasts has no documented "send to test email only" API mode. The
   pre-prod verify pattern is: add ONE seed contact to the audience first
   (`POST /audiences/{id}/contacts`), then send the broadcast normally — blast
   radius = exactly 1 mailbox while the wiring is being proven.
3. Broadcast lifecycle visible via `GET /broadcasts/{id}` is `draft → queued → sending → sent`.
   `sent` here means "Resend handed off to recipient MX"; per-recipient `delivered`
   status is not exposed on the broadcast object — only via webhooks or email-level
   GET. For weekly-digest cron purposes, `status=sent` is the verifiable acceptance.

## Next levers (not in this tick)
- Audience is ~1 real contact (the seed). Cron will fire every Wed regardless; the
  retention loop only matures once /subscribe traffic actually accumulates real signups.
- Telegram-channel mirror is queued separately (out of this Boundary).
- Engagement metric: Resend Broadcasts emits `email.opened` / `email.clicked` events;
  hooking those into GoatCounter or Supabase is a follow-up signal source.
