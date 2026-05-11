---
name: email_receive
description: Read inbound mail (verification codes, signup OTPs, password resets) via IMAP. Use when a registration / API key issuance / password recovery flow needs you to click a link or copy a code from email. Returns parsed EmailMessage with from/subject/body/links.
---

# Email Receive

Many registration flows (Reddit, Mastodon, Codeberg, Netlify, …) reject
disposable mail providers (mail.tm, dropmail.me) by domain blocklist.
You have a real domain (`west0n.top` via Cloudflare Email Routing →
Gmail) pre-wired so you can use `<random>@west0n.top` aliases that all
land in the same Gmail inbox, and read verification mail via IMAP.

## When to call

- Right after submitting a signup form that says "we sent you an email"
- After triggering a password reset
- After requesting a magic-link login

## When NOT to call

- The platform doesn't email you anything (just shows the API key
  inline) — read the page response instead
- You're testing — write your own bytes; don't poll real Gmail in
  unit tests (the skill's tests mock imaplib)

## API

```python
from solvo.skills.email_receive.receive import (
    wait_for_email,
    recent,
    EmailReceiveTimeout,
)

# Wait up to 120s for an email from any reddit.com sender
try:
    msg = wait_for_email(
        from_filter="reddit.com",
        timeout=120,
        poll_interval=5,
    )
except EmailReceiveTimeout:
    # Either the email never arrived (check spam, alias typo) or the
    # platform never sent — record_thought and move on
    raise

print(msg.from_addr)    # e.g. "noreply@reddit.com"
print(msg.subject)      # e.g. "Verify your Reddit account"
print(msg.links)        # ['https://reddit.com/verify/abc123', ...]
print(msg.body)         # full text/plain body
```

`from_filter` / `to_filter` / `subject_filter` are substring matches
(IMAP server doesn't support glob). Pass the distinctive part:
`"reddit.com"` not `"*@reddit.com"`.

## Aliases

The `*@west0n.top` Cloudflare catch-all means you can use any local
part. **Generate a per-platform alias** so platforms can't reverse-
correlate accounts by email:

```python
import secrets
alias = f"reddit-{secrets.token_hex(4)}@west0n.top"
# use alias in the signup form
msg = wait_for_email(to_filter=alias.split('@')[0], ...)
```

## Troubleshooting

- `NoCredentialsError`: `AGENT_EMAIL_IMAP_*` env vars not set. Check
  via `echo $AGENT_EMAIL_IMAP_HOST` inside a tick. If empty, fall
  back to `<random>@<your-own-domain>` if you have one, or pivot to
  signup flows that don't require email verification at all.
- Login fails: app password expired / revoked. Pick a different
  signup path that doesn't need this skill — don't park work waiting.
- Email never arrives: check the alias actually went through Cloudflare
  Email Routing; default folder is INBOX (or whatever
  `AGENT_EMAIL_IMAP_FOLDER` says). Some platforms (Reddit) take a few
  minutes to send.
