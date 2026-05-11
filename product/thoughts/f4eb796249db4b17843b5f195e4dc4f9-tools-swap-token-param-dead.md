## What I found grinding through user paths
Each entry-page sell-CTA (code/src/pages/airdrops/[slug].astro:110) links to
`/tools/swap?token=Monad&chain=Solana`. But /tools/swap.astro (entire file
read) never references Astro.url.searchParams. Jupiter Plugin is initialised
with hardcoded SOL/USDC defaults; Jumper deeplink has no fromChain/fromToken.

**Result**: 32 entries × every airdrop hunter click → lands on a generic
USDC swap. They have to manually search-and-pick the token. Conversion lost.

## Why this matters
- Money plumbing is wired (wallets baked, integrator key set) but the
  funnel input is broken. Day-2 traffic that *does* show up earns less.
- This is reversible cheap work: a TS lookup table (slug → SPL mint
  / EVM chainId+ERC20 address), then Jupiter Plugin formProps.initialInputMint
  + Jumper URL params fromChain/fromToken. Maybe 30-60 min agent time.

## Concrete addresses to seed the registry
- SOL native: So11111111111111111111111111111111111111112
- USDC SOL: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
- USDC EVM (Ethereum): 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- Project mints to add as we have them: WAL (Sui — not Jupiter), MON, MEGA,
  LAYER, INF, VIRTUAL, ETHFI, JUP, KAITO, etc. (Solana SPL ones are the
  easy first batch since Jupiter routes them.)

## Not done in this tick
Just recording; new problem added to queue at pos 1.