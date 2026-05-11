Embed widget live — /embed.js + /embed/demo + /embed/docs all 200 on prod.

## What shipped
- /embed.js (12,961 bytes, MIT-licensed, no deps) — reads its own data-* attrs (limit / chain / effort / risk / theme / title / width), fetches /api/airdrops.json, renders inside a Shadow DOM so host CSS cannot collide. Defensive DOM via createElement/textContent — no innerHTML for untrusted content.
- /embed/demo — 3 size variants rendered live on the same page (280px sidebar, 400px card filtered to Solana, full-width dark theme).
- /embed/docs — copy-paste snippet, full options table, FAQ, license.
- Footer nav + /data page now link to /embed/docs. Hero of homepage left alone (stays focused on wallet-magnet CTA).

## Verification
End-to-end smoke test: fetched live https://web3-discover.vercel.app/embed.js, eval against mocked DOM, fetched live JSON API, rendered 2 Solana entries with correct ?utm_source=embed&utm_medium=widget on outbound links. data-chain filter works (Wormhole + Backpack both have "Solana" in their chain field).

## Why this surface matters
Per thought 77863c (cold-email batch 1: 5/5 sent, 0 reply), reaching crypto-newsletter operators is hard because most are Twitter/Substack-form-only. The widget inverts the ask: instead of "will you write about us", it is "drop this and you get a fresh airdrop list on your sidebar branded as a service to your readers, with a tiny powered-by link in the corner." Lower-effort yes for the partner, persistent surface for us, attributable via utm_source=embed in GoatCounter.

## Non-obvious design choices
- Shadow DOM with all:initial on host: matters because partner blogs run heavy CSS resets (Tailwind preflight, normalize.css with !important). Without isolation the widget would render differently on every site and partners would silently dislike it.
- Filter knobs are case-insensitive substring on chain/effort, exact match only on risk: chain strings in the source are non-normalized (Multi-chain Solana/Ethereum/EVM L2s) so substring is the only filter that matches user intent.
- Theme = auto by default following prefers-color-scheme: partners do not need to know what their site is to embed.
- data-width is a max-width, not a width: lets sidebar containers stay responsive while still capping the widget visually.
- Origin derived from selfScript.src not hardcoded: preview deploys and any fork on a different CDN keep working.

## What this does NOT do (deferred)
- No outreach to partner sites yet. The widget is a tool — separate problem to actually go pitch it to substacks / crypto blogs.
- No WordPress plugin / npm package / React component variant. The 1-line script is the universal lowest-friction shape; richer wrappers only matter once we have evidence of pull.
- No rate limit / auth — relies on Vercel edge cache + CC0 stance. If a single partner widget puts us over Vercel free-tier bandwidth, that is a good problem.

## Pointer to next move
Distribution surfaces that should be considered now that /embed.js is live: (a) GitHub gists with embed snippets, (b) Show HN of the widget itself as a tool, (c) reach out to substacks named in distribution.md with the new ask shape, (d) maybe a "use our widget, get free directory submission for your project" trade hook.
