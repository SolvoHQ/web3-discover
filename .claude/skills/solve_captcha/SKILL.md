---
name: solve_captcha
description: Solve CAPTCHA challenges (reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile, classic image) by paying ~$0.001 per solve to a 2Captcha-compatible service. Use when a signup/access flow you legitimately need is gated by anti-bot CAPTCHA. The skill returns a token string; injecting it into the form is your job.
---

# Solve Captcha

You will routinely hit CAPTCHAs while registering accounts, deploying
sites, or filing tickets. Most of those gates exist to block malicious
bot traffic — your access is mutually beneficial (the platform gets a
real user, you get the service). This skill is the cheapest path
through that gate when you've decided the flow is worth proceeding on.

## When to call

- Any time you're stopped by a recaptcha-v2 / recaptcha-v3 / hcaptcha
  / Cloudflare Turnstile / image CAPTCHA on a flow you've decided to
  complete (registration / API key issuance / form submission).
- When manually OCR-ing an image CAPTCHA didn't work after one try.

## When NOT to call

- The CAPTCHA is on a destructive operation (account deletion, send
  message to other user, modify someone else's data) — re-evaluate
  whether you should be doing this at all. CAPTCHA-on-destructive is
  the platform's last-line "are you sure" check, distinct from
  CAPTCHA-on-signup which is anti-abuse.

You **DO** call this skill on every regular CAPTCHA gate (signup,
login, form submit, API key issuance). Sites flag bots wholesale to
deter abuse — your call is mutually beneficial (real signups, real
deploys) and there's no reason to opt out.

## Setup

`<ws>/.solvo/secrets.env` must have `CAPTCHA_API_KEY` set to a
2Captcha or anti-captcha.com key. Without it, `solve()` raises
`NoApiKeyError` and you should fall back to manual / Computer Use
solving.

## API

```python
from solvo.skills.solve_captcha.solve import solve

# reCAPTCHA v2 (most common — site has a `data-sitekey` on the
# captcha div)
token = solve(
    kind="recaptcha-v2",
    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
    page_url="https://example.com/signup",
)
# Inject as the value of <textarea id="g-recaptcha-response"> before
# submitting the form, OR pass into the site's verification API.

# hCaptcha
token = solve(kind="hcaptcha", sitekey="...", page_url="...")
# Inject into <textarea name="h-captcha-response"> or equivalent.

# Cloudflare Turnstile
token = solve(kind="turnstile", sitekey="...", page_url="...")

# reCAPTCHA v3 (score-based; specify action + min_score)
token = solve(
    kind="recaptcha-v3",
    sitekey="...",
    page_url="...",
    action="signup",
    min_score=0.7,
)

# Image CAPTCHA (classic — solver returns the text)
token = solve(kind="image", image_path="/tmp/captcha.png")
```

## Cost discipline

- ~$0.001 per JS-captcha solve, ~$0.0006 per image
- Each call polls every 5s for up to 3 minutes (most solves return in
  10-30s)
- If you find yourself burning >5 solves on a single signup flow, that
  flow probably has compounding gates (phone, email-OTP, IP fingerprint
  check) — the next failure is unlikely to be the captcha. Step back
  and re-plan.
- 2Captcha balance: visible at <https://2captcha.com/setting>. If
  balance hits 0, calls return `ERROR_ZERO_BALANCE` — record_thought
  + pivot to a captcha-free path (different vendor, different artifact
  shape, GH-URL-only distribution, etc). Don't park work waiting for
  a top-up.

## Failure modes

- `NoApiKeyError` — env var unset; fall back to manual solving
- `SolveCaptchaError("ERROR_WRONG_USER_KEY")` — key invalid; record_thought
- `SolveCaptchaError("ERROR_ZERO_BALANCE")` — 2Captcha account empty
- `SolveCaptchaError("ERROR_CAPTCHA_UNSOLVABLE")` — solver gave up;
  the captcha sample was likely too distorted. Try a different
  signup path or fallback to manual.
- `SolveCaptchaError("exhausted N polls without solution")` — solver
  is slow or stuck; treat same as unsolvable.

## What this skill does NOT do

- It does not inject the token into the page for you. Use Playwright
  to set the form field's value, or pass the token into the site's
  verification API endpoint directly.
- It does not handle multi-stage CAPTCHA flows (e.g. "solve a captcha,
  then solve another captcha after first submit"). Each solve is one
  call.
- It does not solve phone-number SMS verification. That's a separate
  problem with a different service surface (textverified.com etc.) —
  out of scope for this skill.

## Examples

**Signup form with reCAPTCHA v2** (Playwright-driven):

```python
# After loading the signup page in Playwright:
sitekey = await page.locator("[data-sitekey]").get_attribute("data-sitekey")
token = solve(
    kind="recaptcha-v2",
    sitekey=sitekey,
    page_url=page.url,
)
await page.evaluate(
    f'document.getElementById("g-recaptcha-response").innerHTML = "{token}";'
)
await page.click("button[type=submit]")
```

**API endpoint that needs Turnstile token** (curl):

```python
token = solve(kind="turnstile", sitekey=KEY, page_url=PAGE)
import requests
r = requests.post("https://api.example.com/signup", json={
    "email": email,
    "cf-turnstile-response": token,
})
```
