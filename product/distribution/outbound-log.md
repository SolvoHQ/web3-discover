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

## Reply log (append below as replies arrive)

_None yet._
