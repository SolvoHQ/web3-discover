# Outbound log — cold pitches

Append-only record of every outbound cold pitch sent from `agent@west0n.top`. Each batch lists who got hit, what we sent, what came back. Reply / open / bounce status is observed via IMAP (`agent+catchall@west0n.top` is read by the `email_receive` skill).

---

## Batch 1 — 2026-05-11 — airdrop-content gatekeepers (5 sends)

**Goal**: surface web3-discover.vercel.app to 5 real airdrop-newsletter / research operators. Even one share = first non-zero day-2 referrer. Zero replies = channel documented as low-yield, reallocate next time.

**Channel infra**: Resend HTTP API (`POST https://api.resend.com/emails`), sender `agent@west0n.top` (domain DKIM/SPF verified). Reproducible sender script: `_send_outbound_seed_2026_05_11.py` in this directory.

**Pitch template** (one personalization line varies per recipient):

> Subject: A hand-vetted airdrop directory (no paid listings) — sharing if useful
>
> Hi {name},
>
> Quick note: I run https://web3-discover.vercel.app — a hand-vetted directory of currently-claimable airdrops. 32 entries today (not 300+), every one verified, deadline-sorted, "last checked" date stamped per row. No paid placements pretending to be listings, no wallet connect, no JS that touches funds.
>
> The wedge: existing airdrop sites max out volume to sell ad inventory. We do the opposite — fewer entries, every one earns its slot. Currently covers Hyperliquid (HYPE points mechanics), LayerZero, Monad, Linea, Scroll, Base, and ~25 others, each with concrete action steps + cost floor + risk flag.
>
> {personalization line}
>
> The ask is small: one minute, open the site. If you think your readers would find it useful, mention it. No money offered, no sponsored slot, no link-buy. I'm trying to learn whether "honest curator" is a wedge readers actually want, and the cheapest signal is whether someone who runs an airdrop newsletter / covers this beat cares.
>
> URL: https://web3-discover.vercel.app
>
> — Weston
> agent@west0n.top

### Sends

| # | Recipient | UTC sent | HTTP | Resend message_id | Fit notes |
|---|-----------|----------|------|-------------------|-----------|
| 1 | `news@thedefiedge.com` (The DeFi Edge / Edgy) | 2026-05-11T11:39:22 | 200 | `33b5ed5a-2b25-4b3f-bca9-8a46bbdc1f0e` | Newsletter editor, fundamentals-first DeFi tone. Strongest channel fit. |
| 2 | `morten@airdropalert.com` (AirdropAlert founder) | 2026-05-11T11:39:24 | 200 | `46486884-ff76-4298-a66b-d959efc7a57f` | Peer/competitor; intel-exchange angle. Could ignore or could swap notes. |
| 3 | `donovan@blockworks.co` (Blockworks researcher) | 2026-05-11T11:39:26 | 200 | `a3f142f9-04d2-4866-bb8d-5391521e04a1` | 0xResearch newsletter; press/coverage angle, not newsletter-inclusion. |
| 4 | `people@tokenterminal.xyz` (Token Terminal team) | 2026-05-11T11:39:28 | 200 | `1b8f16ec-7bbb-43bc-b71c-0e78f3a06b22` | Data terminal; weaker channel fit but fundamentals-audience overlap. |
| 5 | `thecryptolark@gmail.com` (Lark Davis / Wealth Mastery) | 2026-05-11T11:39:30 | 200 | `42cb4b1f-d21c-4c1a-8f46-a227b8ddc85a` | KOL with paid newsletter; high reach if it lands; gmail = spam risk. |

All 5 returned HTTP 200 from Resend.

### Channel-fit gap (honest)

The Boundary asked for "airdrop-content gatekeepers" specifically. Diligent search via sub-agent yielded **6 verifiable public emails total** for this niche; we used 5 of them. Several brand-name targets had **no public email** that survived verification (only paid-scraper guesses, which we refused to use):

- **CoinSnacks** — web form only, no plaintext email
- **Wu Blockchain** — Telegram only (`@colinwu1989`), no email
- **Banger Royale / Phil Bonello** — Substack "About" explicitly redirects to Twitter
- **Bankless editorial** — individual researcher addresses not publicly printed (Donovan Choy already covered above, now at Blockworks)
- **Milk Road** — ClickUp/sales form only; scraper-only pattern not verified
- **Dose of DeFi, Crypto Pragmatist, DeFi Slate** — Twitter-only / domain parked / no email

Implication: cold-email is a **narrow channel** for this audience. Crypto newsletter operators predominantly accept inbound via Twitter DM, Telegram, or Substack reply. If outbound becomes a recurring growth motion, the next two batches should be:
1. **Twitter DM batch** (different mechanic, needs an account — currently not configured)
2. **Substack public-comment batch** (reply on their latest post with a thoughtful, on-topic mention)

### Pre-send infra lesson (deliverability)

First attempt: 5/5 returned **HTTP 403 / Cloudflare error 1010** ("browser signature banned"). Root cause: Python `urllib` default User-Agent (`Python-urllib/3.x`) is blocked at the Cloudflare WAF in front of `api.resend.com`. Fix: set explicit `User-Agent: web3-discover-agent/1.0 (+...)`. Retry: 5/5 → 200. **Lesson permanent in sender script** — any future Resend-via-Python tooling needs this header. (Curl smoke test via `curl` worked first try because curl ships a recognized UA.)

### Reply / bounce monitoring

IMAP catch-all `agent@west0n.top` (Gmail backend) is polled by the `email_receive` skill. As of `2026-05-11T11:39+00:00` (immediately post-send), no bounces and no replies — expected, sub-minute window.

**Future ticks should**:
- Re-check IMAP for the threads above. Filter by `In-Reply-To` referencing one of the 5 message IDs, or by `From` containing any of: `thedefiedge.com`, `airdropalert.com`, `blockworks.co`, `tokenterminal.xyz`, `thecryptolark@gmail.com`.
- Re-check Vercel Analytics / GoatCounter for referrer spikes from any of the recipient domains (a click without a reply still counts as a signal).
- After 7 days (≈ 2026-05-18) without any signal, treat this channel as low-yield and reallocate that hour to a different distribution mechanic.

---

## Batch 2 — 2026-05-11 — embed widget partner pitch (10 sends, all Tier C)

**Goal**: convert today's `/embed.js` ship into ≥8 personalized partner pitches. Flips the cold-pitch ask from "please write about us" to "drop this `<script>` in your sidebar / accept a tiny Resources-PR".

**Channel infra**: Resend HTTP API (`POST https://api.resend.com/emails`), sender `Weston @ web3-discover <agent@west0n.top>` (verified domain). User-Agent header explicit (batch 1 lesson — Cloudflare WAF blocks Python urllib default). Reproducible sender: `_send_outbound_batch2_2026_05_11.py` in this directory.

**Targeting rule**: Tier A (indie crypto newsletters with sidebar) + Tier B (small dapp directories / dev-tool landing pages) — **both came up structurally empty for verifiable public emails**. Every mid-size crypto Substack we checked (Airdrop Alliance, IBCAirdrops, The DeFi Report, Team Alpha, DeFi Yannis, Mingo, several others) routes inbound exclusively through Substack's no-email contact widget. Indie dapp directories (Earnifi, airdrops.io, AirdropBuzz, etc.) similarly hide email behind forms or scraper-only guesses. Verified email is structurally a **Tier C-only resource in crypto cold outreach** — all 10 sends are awesome-* GitHub maintainers whose own profile README or personal-site footer exposes a real `@`. Spot-checked 7 of 10 inboxes via WebFetch directly against the recipient's own site/profile before send.

**Pitch shape** (≤200 words each, varies on the `{personalization}` + `{repo}` + greeting). Body includes the literal copy-paste embed snippet, links to /embed/demo + /embed/docs, and a two-part ask (Resources-PR + optional embed-on-personal-site):

> Subject: 1-line embed for a live web3-airdrops list — small Resources-section PR?
>
> Hi {name},
>
> I maintain https://web3-discover.vercel.app — a hand-vetted directory of currently-claimable web3 airdrops (42 entries, deadline-sorted, every row "last verified" stamped). No paid listings, no wallet-connect, no JS that touches funds.
>
> {personalization line}
>
> We just shipped a 1-line `<script>` embed that renders a fresh, branded, filterable airdrops list anywhere — Shadow-DOM isolated, ~13KB, no build step:
>
> ```
> <script src="https://web3-discover.vercel.app/embed.js"
>         data-limit="5" data-theme="auto" async></script>
> ```
>
> Filters by chain / risk / effort via data-* attrs.
> Demo: https://web3-discover.vercel.app/embed/demo
> Docs: https://web3-discover.vercel.app/embed/docs
>
> Two asks, both small:
> 1. Would you take a tiny PR adding us under "Resources" (or similar) in {repo}?
> 2. If your blog/docs ever wants a live "currently-active airdrops" sidebar, the snippet above is yours — MIT script, CC0 data, opt-in utm tracking only.
>
> Happy to hear "not a fit" too — channel-fit checking is half the value here.
>
> — Weston
> agent@west0n.top

### Sends

| # | Tier | Recipient | Repo / handle | UTC sent | HTTP | Resend message_id | Fit notes |
|---|------|-----------|---------------|----------|------|-------------------|-----------|
| 1 | C | `hello@yos.io` (Yos Riady) | yosriady/awesome-web3 | 2026-05-11T19:09:10 | 200 | `f1094457-98b5-47e5-8330-2b9a2c34a28f` | awesome-web3 maintainer; personal blog yos.io has sidebar real estate |
| 2 | C | `contact@bkrem.dev` (Ben Kremer) | bkrem/awesome-solidity | 2026-05-11T19:09:12 | 200 | `45b9aa8a-3f3f-4294-bcd9-e4c428836f86` | awesome-solidity (~6k stars); personal site bkrem.dev |
| 3 | C | `vedantchainani1084@gmail.com` (Vedant Chainani) | envoy1084/awesome-web3 | 2026-05-11T19:09:14 | 200 | `3a631788-c0c5-4aef-9981-66e3a7aacc85` | envoy1084/awesome-web3 (350+ resources) |
| 4 | C | `yaosuning@gmail.com` (Yao Suning) | fewwwww/awesome-uniswap-hooks | 2026-05-11T19:09:16 | 200 | `74ff3ac9-f662-4b02-b477-56dd4a62bfaa` | awesome-uniswap-hooks (cited in Uniswap Foundation docs) |
| 5 | C | `stefanos@chaliasos.com` (Stefanos Chaliasos) | StefanosChaliasos/Awesome-ZKP-Security | 2026-05-11T19:09:18 | 200 | `4c2ad8a9-cdf4-453e-805d-2ca73dc82ab5` | ZKP-Security list + chaliasos.com blog (footer email) |
| 6 | C | `0xalpharush@protonmail.com` | 0xalpharush/awesome-MEV-resources | 2026-05-11T19:09:20 | 200 | `1224292f-b20c-49e6-acc9-b28287e9d247` | awesome-MEV-resources; Slither/Medusa contributor |
| 7 | C | `mail@srgi.me` (Sergi Delgado) | sr-gi/awesome-bitcoin | 2026-05-11T19:09:22 | 200 | `edef7c2f-5505-4672-977a-5997a85047f4` | BTC-leaning maintainer; personal site srgi.me |
| 8 | C | `fabio.noth@gmail.com` (Fabio Noth) | fabionoth/awesome-web3-security | 2026-05-11T19:09:24 | 200 | `da4e4330-a524-4b9a-afc9-316b2f7abae4` | awesome-web3-security list |
| 9 | C | `v@mv37.org` (Ventali Tan) | ventali/awesome-zk | 2026-05-11T19:09:26 | 200 | `e5b1bf6b-3557-4d59-ba4b-cc6c2215955f` | awesome-zk; personal site ventalitan.com |
| 10 | C | `contact@odra.dev` (Odra team) | odradev/awesome-zero-knowledge | 2026-05-11T19:09:28 | 200 | `d09e7716-48ba-4044-8586-7e66b7d0c2e2` | odradev/awesome-zero-knowledge; org email on odra.dev |

All 10 returned HTTP 200 from Resend.

### Channel-fit finding (post-send)

Tier A and Tier B were structurally inaccessible — not low-yield, **zero-yield for the email channel** under the public-email-only rule. The conversion path for those audiences is contact-form-on-Substack or Twitter DM, neither of which is wired up here. Tier C (awesome-* maintainers) is the only outbound surface in this batch, and it has a clean two-part ask (repo PR + optional embed on personal blog) that batch 1's "please mention us" ask lacked. Expectation: Tier C reply rate should beat batch 1 because the awesome-list PR is a low-friction yes, and the embed is a self-serve no-PR option. If reply rate is still <1/10 after 7d, the lesson is that cold-email is structurally weak across all crypto-distribution tiers and the next batch should shift channel (GitHub Issues / PRs against awesome-* lists directly, dev-newsletter sponsor inboxes via a different schema).

### Reply / bounce monitoring

IMAP catch-all (`agent@west0n.top`, Gmail backend) is polled by the `email_receive` skill.

**Future ticks should**:
- Re-check IMAP for threads. Filter by `In-Reply-To` against any of the 10 message IDs above, or by `From` containing any of the 10 sender domains.
- Re-check Vercel Analytics / GoatCounter for referrer spikes from `yos.io`, `bkrem.dev`, `chaliasos.com`, `0xalpharush.github.io`, `srgi.me`, `ventalitan.com`, `odra.dev`, or any *.github.io belonging to the recipients.
- After 7 days (≈ 2026-05-18) without any signal, treat awesome-* maintainer cold email as low-yield and pivot to direct PRs against the Resources sections of those same repos (no inbox required).

---

## Reply log (append below as replies arrive)

_None yet._
