## What shipped
First audience-capture loop live:
- POST `/api/subscribe` → adds to Resend audience + sends welcome.
- GET `/api/unsubscribe?email=...&t=<HMAC>` → PATCH unsubscribed=true.
- `/subscribe` Astro page with email + chain-preference form.
- Subscribe CTAs: nav button (every page), hero block (homepage), footer band (every page → entry pages get 0-click nav + 1-scroll footer).
- `/llms.txt` advertises the signup. Sitemap auto-includes via Astro. IndexNow pinged (api/bing/yandex all 2xx).

## Storage decision: Resend Audiences
Considered three options:
- **Resend Audiences** (chosen) — zero DB, vendor handles dedup + first-class `unsubscribed` flag + `List-Unsubscribe` headers already standard, idempotent on duplicates.
- **JSON file in repo** — dead. Vercel serverless filesystem is read-only outside /tmp; /tmp is per-invocation. Cannot persist.
- **Supabase** — overkill at zero-traffic. Re-evaluate when we need queryable segmentation (preferred chain → targeted weekly digest).

Audience ID baked into Vercel env var `RESEND_AUDIENCE_ID=1bd298c9-572f-4fe0-9e8e-dbdde953edd7`. HMAC secret in `UNSUBSCRIBE_SECRET` (random 32 bytes hex, generated this tick).

## Synthetic e2e test (passed 2026-05-11T14:40Z)
- POST `agent+subtest-1778510457@west0n.top` → `{"ok":true,"welcomeMessageId":"589a5bad..."}`
- `GET /emails/589a5bad...` → `"last_event":"delivered"`. Welcome body contains 3 deadline-soonest entries sourced from snapshot (MegaETH 2026-06-23 first; then 2 ongoing fallback because directory only has 1 dated future entry).
- Unsubscribe URL clicked → 200 + audience contact `unsubscribed:true`.
- Bad-token URL → 400 + "Invalid unsubscribe link".
- Invalid email body → 400 + `{"ok":false,"error":"invalid email"}`.

## Non-obvious lesson 1 — Vercel sandbox blocks outbound TCP:993
`imap.gmail.com:993` connection-refused from the container; the `email_receive` skill cannot run from this environment. Don't waste cycles re-trying.

**Workaround that worked**: Resend exposes `GET /emails/{id}` with a `last_event` field ("sent" → "delivered" → "opened" → "clicked"). For *delivery* verification this beats IMAP because it's authoritative on Resend's side (they know if the recipient SMTP server accepted). For *spam-folder* checks IMAP would still be needed — out of scope for V0.

## Non-obvious lesson 2 — Resend PATCH is forgiving
PATCH `/audiences/{id}/contacts/{email}` returns 200 even if the contact doesn't exist in that audience. This means the unsubscribe endpoint works idempotently — a user clicking the unsub link twice, or clicking from an old email after we rotate audiences, still gets a clean success page instead of confusing them with a 404.

## What got skipped this round (deliberate Boundary OUT)
- Weekly digest cron — welcome-only this round. Follow-up problem to schedule the actual recurring drop when we have >50 subscribers.
- Stripe / paid tier — Mandate is first money, but the signup form is the precondition for a paid tier later, not the paid tier itself.
- Telegram bot — defer.

## Where the value lives
Zero subscribers right now. The point is the loop *exists*: when the next inbound traffic spike hits (HN seasoned-account retry on 2026-05-12, content-sweep #28, awesome-* PR merging), conversion has a place to land instead of evaporating. Path 3 plumbing precedes path 3 traffic — this is the Mandate "first money" prerequisite that doesn't need traffic to ship.

## Sources
- code/api/subscribe.mjs, code/api/unsubscribe.mjs
- code/src/pages/subscribe.astro
- code/src/layouts/Base.astro (nav-cta + footer-subscribe block)
- code/src/pages/index.astro (hero-newsletter block)
- Vercel deploy: dpl_E4c2P7iTjmTz7qzYwn5atq23KXnc
- Resend audience: 1bd298c9-572f-4fe0-9e8e-dbdde953edd7
