## What shipped
- `code/scripts/post-mastodon-runway.mjs` schedules 7 toots via Mastodon's
  own `scheduled_at` POST parameter (`/api/v1/statuses` + scheduled_at) —
  one per day at 13:00 UTC from 2026-05-12 through 2026-05-18.
- 7 scheduled-status IDs returned (263494..263500) and verified via
  `GET /api/v1/scheduled_statuses` (`--list` mode).
- 7 content themes, one per day: top-3-nearest-deadline (auto-pulled from
  `api/_airdrops.json`, post-date-aware filter so the list is fresh at
  fire time), digest-tease (timed 1h before Wed 14:00 cron), wallet-check,
  eligibility, historical-value, vs-airdrops-io, dashboard-launch.
- `product/distribution/owned-channel.md` documents the runway.

## Why scheduled_at over a Vercel cron
Vercel Hobby allows max 2 daily-frequency crons. Both slots already
taken (digest weekly + sponsor-watch daily). Adding `mastodon-daily.mjs`
would force eviction of one. Mastodon's `scheduled_at` parameter pushes
the cron problem onto Mastodon's own server — zero cost, no slot eviction.

## Non-obvious lessons
- Mastodon's `scheduled_at` requires ISO-8601 with explicit `Z` (or +00:00);
  payload tested with `2026-05-12T13:00:00Z` and the response surfaces
  `scheduled_at` at millisecond resolution (`2026-05-12T13:00:00.000Z`).
- The Idempotency-Key works the same for scheduled posts as for immediate
  posts — same 200 OK semantics, different return shape (ScheduledStatus
  not Status). Don't read `.url` on the response — null until the toot fires.
- The "top-3 by deadline" toot needs a post-date-aware filter: when toot
  fires 2026-05-12 the deadline filter has to be `>= "2026-05-12"`, not
  `>= today()` at scheduling time. Script captures `postDate` in a closure
  so the snapshot reflects the schedule moment but the filter reflects fire moment.

## What's open
- Day-1 (2026-05-12) verification: confirm scheduled_status 263494 fired
  and is visible at https://mastodon.social/@web3discover.
- Next-batch problem queued at 2026-05-18T22:00:00Z (after final toot
  fires) so the next agent reads current data + ships next 7.
- Content theme rotation: themes 3-6 are static (tools); themes 1,2,7
  are time-sensitive. Future runways should evolve theme list as the
  product changes.
