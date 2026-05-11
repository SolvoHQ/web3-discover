// Public integrator addresses for DEX aggregator fee attribution.
// These are PUBLIC keys only — private keys live in .solvo/secrets.env (gitignored)
// and never leave the operator's machine.

export const EVM_INTEGRATOR_ADDRESS = '0x325f56a0e7a818F07eFF5904c710E772529Fe41d';
export const SOL_INTEGRATOR_ADDRESS = 'yq3rC7gDm5qSxZvt1EhPxeMh8QG97tgM8qs67gLCmei';

// LIFI_INTEGRATOR_KEY is registered at portal.li.fi/integrations (account
// web3discover-partners@west0n.top, EVM wallet whitelisted, FeeForwarder
// auto-forwards EVM fees to wallet; LIFI take rate = 25 bps). API key lives
// in .solvo/secrets.env (LIFI_API_KEY) — backend only, never bundle.
// Fee attribution requires @lifi/widget React island OR server-side API proxy:
// static jumper.exchange deeplinks ignore integrator URL params and pay zero.
// LiFi handles BOTH EVM and SVM under the same integrator id. The portal has
// two whitelisted recipients ("Default EVM" = EVM_INTEGRATOR_ADDRESS, "Default
// SVM" = SOL_INTEGRATOR_ADDRESS); LiFi auto-picks the matching one per chain.
export const LIFI_INTEGRATOR_KEY = 'web3-discover';
export const LIFI_FEE_BPS = 30; // 0.30% — live on EVM and Solana via LiFi
