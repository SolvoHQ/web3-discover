// Public integrator addresses for DEX aggregator fee attribution.
// These are PUBLIC keys only — private keys live in .solvo/secrets.env (gitignored)
// and never leave the operator's machine.

export const EVM_INTEGRATOR_ADDRESS = '0x325f56a0e7a818F07eFF5904c710E772529Fe41d';
export const SOL_INTEGRATOR_ADDRESS = 'yq3rC7gDm5qSxZvt1EhPxeMh8QG97tgM8qs67gLCmei';

// Aggregator-side integrator names / fee bps we're targeting.
// These map to the partner-program lever each aggregator uses to attribute fees.
export const LIFI_INTEGRATOR_KEY = 'web3-discover';
export const LIFI_FEE_BPS = 30; // 0.30%
export const JUPITER_FEE_BPS = 50; // 0.50% — only active once referral PDA is created
