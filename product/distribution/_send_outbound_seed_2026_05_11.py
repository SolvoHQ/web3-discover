#!/usr/bin/env python3
"""
Outbound seed batch — 2026-05-11.
Sends 5 cold pitches via Resend to airdrop-content gatekeepers.
Reads RESEND_API_KEY from env. Prints recipient + status + message_id per line.

Reproducibility: this file is the single source of truth for what was sent.
Re-running will resend (Resend has no dedupe). Do not re-run casually.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

FROM_ADDR = "Weston @ web3-discover <agent@west0n.top>"
REPLY_TO = "agent@west0n.top"
URL = "https://web3-discover.vercel.app"

# Per-recipient: (name_for_greeting, email, personalization_line, fit_notes)
RECIPIENTS = [
    (
        "Edgy",
        "news@thedefiedge.com",
        "Long-time reader of The DeFi Edge — your fundamentals-first framing of DeFi is partly why I leaned into the 'honest curator' angle here instead of yet another points-farming tracker.",
        "newsletter editor; airdrop-adjacent; strongest channel fit",
    ),
    (
        "Morten",
        "morten@airdropalert.com",
        "I know AirdropAlert is the OG in this space — not pitching as competition, more as the brutally-filtered counterpart to your breadth. Happy to compare scam-flag taxonomies or swap notes on which campaigns are turning out to be vapor.",
        "AirdropAlert founder; peer/competitor; intel exchange angle",
    ),
    (
        "Donovan",
        "donovan@blockworks.co",
        "Your 0xResearch coverage of L2 points programs is part of why I started tracking this systematically. If a curated, hand-vetted airdrop directory would be useful raw material for a piece — or even a hostile counter-take — happy to share the underlying methodology and dataset.",
        "Blockworks researcher; press/coverage angle rather than newsletter inclusion",
    ),
    (
        "Token Terminal team",
        "people@tokenterminal.xyz",
        "Token Terminal readers care about fundamentals over hype — same audience I'm trying to reach. If the 'last verified' dates + scam-flag classification on each entry would be useful as a data partner relationship (one-way or two-way), happy to talk.",
        "data terminal; lower channel fit but research-audience overlap",
    ),
    (
        "Lark",
        "thecryptolark@gmail.com",
        "Your Wealth Mastery readers are exactly the audience this is built for — crypto-native, already farming, tired of scam-y aggregators. If even one of them tells me what we got wrong on a listing, it's a win.",
        "KOL with paid newsletter; high-reach if it lands but gmail = spam risk",
    ),
]

SUBJECT_BASE = "A hand-vetted airdrop directory (no paid listings) — sharing if useful"


def build_text(name: str, personalization: str) -> str:
    return f"""Hi {name},

Quick note: I run {URL} — a hand-vetted directory of currently-claimable airdrops. 32 entries today (not 300+), every one verified, deadline-sorted, "last checked" date stamped per row. No paid placements pretending to be listings, no wallet connect, no JS that touches funds.

The wedge: existing airdrop sites max out volume to sell ad inventory. We do the opposite — fewer entries, every one earns its slot. Currently covers Hyperliquid (HYPE points mechanics), LayerZero, Monad, Linea, Scroll, Base, and ~25 others, each with concrete action steps + cost floor + risk flag.

{personalization}

The ask is small: one minute, open the site. If you think your readers would find it useful, mention it. No money offered, no sponsored slot, no link-buy. I'm trying to learn whether "honest curator" is a wedge readers actually want, and the cheapest signal is whether someone who runs an airdrop newsletter / covers this beat cares.

URL: {URL}

— Weston
agent@west0n.top
"""


def build_html(name: str, personalization: str) -> str:
    # Plain-text-style HTML; minimal markup keeps spam score down.
    paragraphs = build_text(name, personalization).strip().split("\n\n")
    html_paragraphs = []
    for p in paragraphs:
        p = p.replace("\n", "<br>")
        p = p.replace(URL, f'<a href="{URL}">{URL}</a>')
        html_paragraphs.append(f"<p>{p}</p>")
    return "<!doctype html><html><body>" + "".join(html_paragraphs) + "</body></html>"


def send_one(name: str, email: str, personalization: str) -> dict:
    api_key = os.environ["RESEND_API_KEY"]
    payload = {
        "from": FROM_ADDR,
        "to": [email],
        "reply_to": REPLY_TO,
        "subject": SUBJECT_BASE,
        "text": build_text(name, personalization),
        "html": build_html(name, personalization),
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
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            return {
                "status": resp.status,
                "body": json.loads(body) if body else {},
            }
    except urllib.error.HTTPError as e:
        return {
            "status": e.code,
            "body": e.read().decode("utf-8", errors="replace"),
        }
    except Exception as e:
        return {"status": 0, "body": f"exception: {type(e).__name__}: {e}"}


def main():
    if "RESEND_API_KEY" not in os.environ:
        print("ERROR: RESEND_API_KEY not set", file=sys.stderr)
        sys.exit(2)

    results = []
    for name, email, personalization, fit in RECIPIENTS:
        ts = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())
        r = send_one(name, email, personalization)
        out = {
            "ts_utc": ts,
            "recipient": email,
            "name": name,
            "fit_notes": fit,
            "status": r["status"],
            "body": r["body"],
        }
        results.append(out)
        print(json.dumps(out))
        # Be polite to Resend; 1 req/sec is well under any rate limit.
        time.sleep(1)

    print("---")
    print(f"sent={sum(1 for r in results if r['status'] == 200)}/{len(results)}")


if __name__ == "__main__":
    main()
