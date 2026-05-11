Replaced the 3-row placeholder array with 22 real currently-active web3 airdrop entries. Confirmed each project canonical domain via WebFetch (or accepted research signal where rate-limited): Hyperliquid → hyperfoundation.org (.xyz redirects); Backpack → backpack.exchange; Meteora → meteora.ag; MetaMask → metamask.io; Base → base.org; Polymarket → polymarket.com; Rainbow → rainbow.me; Ostium → ostium.app (redirects to app.ostium.com); Extended → extended.exchange; Glider → glider.fi; Fogo → fogo.io; Ink → inkonchain.com; Reya → reya.xyz (network redirects); Katana → katana.network; Layer3 → layer3.xyz; Galxe → galxe.com; Pendle → pendle.finance; Ether.fi → ether.fi; Berachain → berachain.com; Linea → linea.build; Symbiotic → symbiotic.fi; Mitosis → mitosis.org.

## Risk-flag policy I landed on
- verified = team has publicly committed to TGE OR token live + ongoing season
- unverified = real protocol, real activity, but token plans community-inferred
- suspect = excluded from listings entirely
Result: 12 verified / 10 unverified / 0 suspect.

## Why this ship matters
First content drop giving the site genuine SEO surface — 22 canonical /airdrops/<slug>/ URLs, each with H1 + meta description + dl-structured data. Sitemap auto-includes all. The bootstrap ship was about route shape; this ship is about being indexable for real airdrop-related queries.

## Architectural note for next tick
- Moved off src/data/airdrops.ts (deleted) onto Astro content collections: src/content/airdrops/*.md with zod schema at src/content/config.ts
- Helper at src/lib/airdrops.ts centralizes "exclude suspect + sort by deadline ascending (ongoing sorts last)"
- zod schema needs z.coerce.string() for deadline + addedOn because YAML auto-parses ISO dates → caught as build error first try

## Open follow-ups (NOT done in this tick)
- #4 monetization wiring (already queued)
- Daily content refresh / staleness audit cron — without it "currently-active" becomes a lie within weeks
- No Twitter / HN traffic driver wired
- No analytics yet to validate "first non-brand organic visitor" from mvp.md

Live URL: https://web3-discover.vercel.app/airdrops/
