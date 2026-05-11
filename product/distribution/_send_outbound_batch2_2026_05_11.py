#!/usr/bin/env python3
"""
Outbound batch 2 — 2026-05-11.
Embed widget partner pitches to 10 awesome-* GitHub maintainers (Tier C).

Tier A (indie newsletter sidebar) + Tier B (dapp directories) came up
structurally empty for verifiable public emails — every Substack / dapp
directory funnels inbound through a contact form, not plaintext mailto.
Hence the entire batch is Tier C: awesome-* repo maintainers whose GitHub
profile README or personal site footer shows a real email.

Reads RESEND_API_KEY from env. Prints per-recipient JSON line on stdout.
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
SITE = "https://web3-discover.vercel.app"
DEMO = f"{SITE}/embed/demo"
DOCS = f"{SITE}/embed/docs"

SNIPPET = (
    '<script src="https://web3-discover.vercel.app/embed.js"\n'
    '        data-limit="5" data-theme="auto" async></script>'
)

# Per-recipient tuples: (name, email, repo, repo_url, personalization, fit_notes, tier)
RECIPIENTS = [
    (
        "Yos",
        "hello@yos.io",
        "yosriady/awesome-web3",
        "https://github.com/yosriady/awesome-web3",
        "Your `awesome-web3` is mostly dev tooling — a 'currently-active airdrops' resource is a clean adjacent, not a duplicate. And if yos.io ever wants a live data block alongside your articles, the embed snippet below fits a sidebar in 30 seconds.",
        "awesome-web3 maintainer; personal blog yos.io has sidebar real estate",
        "C",
    ),
    (
        "Ben",
        "contact@bkrem.dev",
        "bkrem/awesome-solidity",
        "https://github.com/bkrem/awesome-solidity",
        "awesome-solidity is the canonical Solidity learning list — most readers landing there are EVM-curious devs, and our directory features EVM L2 airdrops they're already paying gas on (Linea, Scroll, Base, Monad). Resources-section PR or embed on bkrem.dev — both small lifts.",
        "awesome-solidity (~6k stars); personal site bkrem.dev",
        "C",
    ),
    (
        "Vedant",
        "vedantchainani1084@gmail.com",
        "envoy1084/awesome-web3",
        "https://github.com/envoy1084/awesome-web3",
        "Your 350+ resource list reaches builders who often also farm — deadline-sorted view + risk tags would be a 'tools' adjunct, not a duplicate of the dev links you already curate.",
        "envoy1084/awesome-web3 (350+ resources)",
        "C",
    ),
    (
        "Yao",
        "yaosuning@gmail.com",
        "fewwwww/awesome-uniswap-hooks",
        "https://github.com/fewwwww/awesome-uniswap-hooks",
        "Hook devs are by definition L2/incentive-curious — many are in the airdrop hunt too. A Resources-section pointer gives your readers a vetted, deadline-sorted view that isn't just another points farm.",
        "awesome-uniswap-hooks (cited in Uniswap Foundation docs)",
        "C",
    ),
    (
        "Stefanos",
        "stefanos@chaliasos.com",
        "StefanosChaliasos/Awesome-ZKP-Security",
        "https://github.com/StefanosChaliasos/Awesome-ZKP-Security",
        "Your ZK-security list and chaliasos.com blog reach the exact people allergic to scammy airdrop aggregators. Happy to argue the curation methodology — deadline-sorted, 'last verified' stamps per row, no wallet-connect, no JS that touches funds. Embed slot or Resources PR — your call.",
        "ZKP-Security list + chaliasos.com blog with footer email",
        "C",
    ),
    (
        "0xalpharush",
        "0xalpharush@protonmail.com",
        "0xalpharush/awesome-MEV-resources",
        "https://github.com/0xalpharush/awesome-MEV-resources",
        "MEV-curious readers are deep in points-program mechanics already — our directory's 'last verified' stamps + risk classification speak the same language. Sidebar embed on 0xalpharush.github.io or a Resources PR are both light lifts.",
        "awesome-MEV-resources; Slither/Medusa contributor",
        "C",
    ),
    (
        "Sergi",
        "mail@srgi.me",
        "sr-gi/awesome-bitcoin",
        "https://github.com/sr-gi/awesome-bitcoin",
        "awesome-bitcoin is more BTC-pure, so the directory PR is a stretch — but srgi.me has a clean blog layout where the embed below would sit unobtrusively if you ever want a live data block. Mostly writing to say nice list and ask whether cross-chain tooling is in scope.",
        "BTC-leaning awesome-bitcoin maintainer; personal site srgi.me",
        "C",
    ),
    (
        "Fabio",
        "fabio.noth@gmail.com",
        "fabionoth/awesome-web3-security",
        "https://github.com/fabionoth/awesome-web3-security",
        "Web3-security readers are the audience most allergic to 'airdrop site = scam funnel'. Happy to argue the curation: every row 'last verified', no wallet-connect, source code MIT, data CC0. Resources-section PR is the small ask.",
        "awesome-web3-security list",
        "C",
    ),
    (
        "Ventali",
        "v@mv37.org",
        "ventali/awesome-zk",
        "https://github.com/ventali/awesome-zk",
        "Your ZK list and ventalitan.com both reach a builder audience that's incentive-aware. Either a Resources-section PR or the embed on ventalitan.com would route relevant traffic.",
        "awesome-zk; personal site ventalitan.com",
        "C",
    ),
    (
        "Odra team",
        "contact@odra.dev",
        "odradev/awesome-zero-knowledge",
        "https://github.com/odradev/awesome-zero-knowledge",
        "Your ZK list draws a research-leaning reader — happy to argue our curation methodology if the angle is interesting. Resources-section PR is the small ask; if odra.dev ever wants a live 'currently-active airdrops' block, the snippet below fits anywhere.",
        "odradev/awesome-zero-knowledge; org email on odra.dev",
        "C",
    ),
]

SUBJECT_BASE = "1-line embed for a live web3-airdrops list — small Resources-section PR?"


def build_text(name: str, repo: str, personalization: str) -> str:
    return f"""Hi {name},

I maintain {SITE} — a hand-vetted directory of currently-claimable web3 airdrops (42 entries, deadline-sorted, every row "last verified" stamped). No paid listings, no wallet-connect, no JS that touches funds.

{personalization}

We just shipped a 1-line <script> embed that renders a fresh, branded, filterable airdrops list anywhere — Shadow-DOM isolated, ~13KB, no build step:

{SNIPPET}

Filters by chain / risk / effort via data-* attrs.
Demo: {DEMO}
Docs: {DOCS}

Two asks, both small:
1. Would you take a tiny PR adding us under "Resources" (or similar section) in {repo}?
2. If your blog/docs ever wants a live "currently-active airdrops" sidebar, the snippet above is yours — MIT script, CC0 data, opt-in utm tracking only.

Happy to hear "not a fit" too — channel-fit checking is half the value here.

— Weston
agent@west0n.top
"""


def build_html(name: str, repo: str, personalization: str) -> str:
    body = build_text(name, repo, personalization)
    paragraphs = body.strip().split("\n\n")
    html_paragraphs = []
    for p in paragraphs:
        if p.strip().startswith("<script"):
            # Render the snippet as a literal code block, not as live HTML.
            escaped = p.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            html_paragraphs.append(
                f'<pre style="background:#f4f4f4;padding:8px;border-radius:4px;font-family:monospace;font-size:12px;white-space:pre-wrap;">{escaped}</pre>'
            )
            continue
        p_html = p.replace("\n", "<br>")
        for url in (DEMO, DOCS, SITE):
            p_html = p_html.replace(url, f'<a href="{url}">{url}</a>')
        html_paragraphs.append(f"<p>{p_html}</p>")
    return "<!doctype html><html><body>" + "".join(html_paragraphs) + "</body></html>"


def send_one(name: str, email: str, repo: str, personalization: str) -> dict:
    api_key = os.environ["RESEND_API_KEY"]
    payload = {
        "from": FROM_ADDR,
        "to": [email],
        "reply_to": REPLY_TO,
        "subject": SUBJECT_BASE,
        "text": build_text(name, repo, personalization),
        "html": build_html(name, repo, personalization),
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Lesson from batch 1: Cloudflare WAF in front of api.resend.com
            # blocks the default Python-urllib UA. Explicit UA is required.
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
    for name, email, repo, repo_url, personalization, fit, tier in RECIPIENTS:
        ts = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())
        r = send_one(name, email, repo, personalization)
        out = {
            "ts_utc": ts,
            "recipient": email,
            "name": name,
            "repo": repo,
            "tier": tier,
            "fit_notes": fit,
            "status": r["status"],
            "body": r["body"],
        }
        results.append(out)
        print(json.dumps(out))
        # Polite to Resend; 1 req/sec is well under any rate limit.
        time.sleep(1)

    print("---")
    sent = sum(1 for r in results if r["status"] == 200)
    print(f"sent={sent}/{len(results)}")


if __name__ == "__main__":
    main()
