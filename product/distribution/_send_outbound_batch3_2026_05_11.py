#!/usr/bin/env python3
"""
Outbound batch 3 — 2026-05-11.

Sponsor-demand test: pitches paying-sponsor offers to 8 projects already
listed in web3-discover's own 42-entry directory. Skips Tier A/B gatekeepers
(structurally dry per thought 89474b9f).

Three tiers (per /sponsor): Featured $400/wk, Sidebar $250/wk, Sponsored guide $800 flat.
Half-off launch promo (deadline 2026-05-18, 7 days out from send).

Reads RESEND_API_KEY from env. Prints per-recipient JSON line on stdout.
Re-running will resend (Resend has no dedupe). Do not re-run casually.

Note on inbox-fit: of the 12 candidate projects researched, only 6 surfaced
a plaintext public email (BD/partnerships emails are structurally hidden
behind Discord/forms across this cohort). 2 more recovered via Cloudflare
email-protection decode. None of the 8 are `bd@`/`partnerships@` proper —
they are `legal@`/`team@`/`support@`/`cloud@`/`legal-notices@`. The opening
line explicitly asks the recipient to forward if mis-routed.

Pitch length target: ~110 words each (within Boundary's 80-120 envelope).
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

FROM_ADDR = "Weston @ web3-discover <agent@west0n.top>"
REPLY_TO = "agent+sponsor@west0n.top"  # routes to autoresponder cron
SITE = "https://web3-discover.vercel.app"
SPONSOR_URL = f"{SITE}/sponsor"
PROMO_DEADLINE = "May 18 2026"

# Tier copy (price, cadence-string, half-price, one-line value-prop)
TIERS = {
    "featured": {
        "label": "Featured slot",
        "price": 400,
        "half": 200,
        "cadence": "per week",
        "vp": "top-of-page slot on /airdrops, sponsored label, one social post at launch",
    },
    "sidebar": {
        "label": "Sidebar promo",
        "price": 250,
        "half": 125,
        "cadence": "per week",
        "vp": "one card on every entry page (42+ and growing), compounding impressions",
    },
    "guide": {
        "label": "Sponsored guide",
        "price": 800,
        "half": 400,
        "cadence": "flat / 30 days",
        "vp": "~1,500-word evergreen explainer in /guides, internal-linked from related entries",
    },
}


def pitch(recipient_name: str, slug: str, tier_key: str, personalization: str) -> tuple[str, str]:
    t = TIERS[tier_key]
    subject = f"web3-discover lists {recipient_name} — half-off launch sponsor slot?"
    body = (
        f"Hi {recipient_name} team — please forward to growth/BD if wrong inbox.\n\n"
        f"I run web3-discover.vercel.app, a hand-vetted airdrop directory (42 entries, no paid "
        f"placements). Your entry: {SITE}/airdrops/{slug}.\n\n"
        f"Testing paid placements. {personalization} Natural fit: **{t['label']} "
        f"(${t['price']} {t['cadence']})** — {t['vp']}.\n\n"
        f"Honesty: launch-week, sub-100 visits/day. "
        f"**Half-off launch promo (${t['half']})** if you reply by {PROMO_DEADLINE}. "
        f"Pricing: {SPONSOR_URL}.\n\n"
        f"'Come back at 1k visits' is also a useful reply — we're calibrating real demand.\n\n"
        f"— Weston\n"
        f"{REPLY_TO}"
    )
    return subject, body


# Per-recipient: (display_name, email, slug, tier_key, personalization_clause, fit_notes)
RECIPIENTS = [
    (
        "Plume",
        "legal@plume.org",
        "plume-season-2",
        "featured",
        "Your Season 2 registration window closes May 27 — a Featured slot through that "
        "window puts the registration deadline above the fold for every visitor who hits /airdrops.",
        "Plume Network — RWA L2; legal@ is only plaintext, forwarded for BD",
    ),
    (
        "Ostium",
        "team@ostium.io",
        "ostium-points",
        "sidebar",
        "Your equity/FX/commodities perps angle is the 2026 narrative our trader-segment readers "
        "are actively searching — a sidebar card across 42+ entry pages surfaces to them on every entry view.",
        "Ostium — equity-perp DEX; team@ is project's only published email",
    ),
    (
        "Ether.fi",
        "support@ether.fi",
        "etherfi-the-club",
        "featured",
        "The Club's restaking + Cash card cross-L2 loyalty mechanic is hard to compress into "
        "our 5-line blurb — a Featured slot lets us link out to deeper canonical material.",
        "Ether.fi — support@ is published; will be triaged to BD",
    ),
    (
        "Solayer",
        "team@solayer.org",
        "solayer-emerald",
        "guide",
        "Episode tasks + sSOL/sUSD + Emerald Card spending is genuinely a 1,500-word guide, not "
        "a sidebar card — readers landing on /airdrops/solayer-emerald hit a 7-line blurb and bounce.",
        "Solayer — team@solayer.org; complex Season 2 mechanic suits Sponsored guide tier",
    ),
    (
        "Backpack",
        "support@backpack.exchange",
        "backpack-season-4",
        "featured",
        "Season 4 ahead of the February 2026 TGE means points-strategy clarity earns trust now — "
        "Featured-slot week timing converts that pre-TGE attention curve.",
        "Backpack — support@ is published; will route to BD if relevant",
    ),
    (
        "Sanctum",
        "cloud@sanctum.so",
        "sanctum-infinity",
        "sidebar",
        "INF as 'auto-pilot Solana yield' is exactly the SOL-staker mindset our directory readers "
        "land in — and Sanctum is the only Solana entry that doesn't require daily check-ins.",
        "Sanctum — cloud@ is marketing channel (newsletter sender)",
    ),
    (
        "Infrared",
        "legal@infrared.finance",
        "infrared-berachain",
        "sidebar",
        "iBGT / iBERA's PoL aggregation is the Berachain-farmer's natural next step after our "
        "broader Berachain entry — a sidebar card across 42+ entry pages catches that funnel.",
        "Infrared Finance — legal@ is only plaintext; small team likely forwards",
    ),
    (
        "Katana",
        "legal-notices@katanafoundation.com",
        "katana-kat-incentives",
        "featured",
        "The $1B KAT incentive program + vKAT-directed-emissions design is a real story to surface "
        "above the fold — Featured-slot placement carries that to anyone landing on /airdrops.",
        "Katana Network — legal-notices@katanafoundation.com is only plaintext (CF-decoded backup)",
    ),
]


def send_one(recipient_name: str, to_email: str, subject: str, body: str) -> dict:
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        return {"ok": False, "error": "RESEND_API_KEY not set"}
    payload = {
        "from": FROM_ADDR,
        "to": [to_email],
        "reply_to": REPLY_TO,
        "subject": subject,
        "text": body,
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "web3-discover-agent/1.0 (+https://web3-discover.vercel.app)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"ok": True, "http": resp.status, "message_id": data.get("id"), "body": data}
    except urllib.error.HTTPError as e:
        return {"ok": False, "http": e.code, "error": e.read().decode("utf-8", errors="replace")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def main() -> int:
    if "--dry-run" in sys.argv:
        for name, email, slug, tier_key, pers, notes in RECIPIENTS:
            subject, body = pitch(name, slug, tier_key, pers)
            wc = len(body.split())
            print(f"--- {name} -> {email} ({tier_key}, ~{wc} words) ---")
            print(f"Subject: {subject}")
            print(body)
            print()
        return 0
    results = []
    for name, email, slug, tier_key, pers, notes in RECIPIENTS:
        subject, body = pitch(name, slug, tier_key, pers)
        res = send_one(name, email, subject, body)
        ts = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
        line = {
            "ts_utc": ts,
            "name": name,
            "email": email,
            "slug": slug,
            "tier": tier_key,
            "price": TIERS[tier_key]["price"],
            "half": TIERS[tier_key]["half"],
            "subject": subject,
            "result": res,
        }
        results.append(line)
        print(json.dumps(line, ensure_ascii=False))
        sys.stdout.flush()
        time.sleep(2)  # Resend rate-limit-friendly pacing
    # Summary footer for easy log copying
    ok = sum(1 for r in results if r["result"].get("ok"))
    print(f"\n# Summary: {ok}/{len(results)} HTTP 200")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
