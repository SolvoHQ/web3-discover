// Per-slug eligibility rules consumed by /tools/eligibility (browser) and
// api/mcp.mjs (server, check_eligibility tool). Source of truth is the
// sibling JSON file so both runtimes (TypeScript build + Node serverless)
// load the same registry without duplication.

import rulesJson from './eligibility-rules.json';

export type EvmChain = 'ethereum' | 'base' | 'linea' | 'arbitrum' | 'polygon' | 'bsc';

export type Rule =
  | { kind: 'chainTx'; chain: EvmChain; minCount: number }
  | { kind: 'tokenBalance'; chain: EvmChain; contract: string; decimals: number; min: string; symbol: string }
  | { kind: 'solanaTx'; minCount: number }
  | { kind: 'holdsSolMint'; mint: string; decimals: number; min: string; symbol: string }
  | { kind: 'any'; rules: Rule[] }
  | { kind: 'all'; rules: Rule[] };

export type NoRuleReason = 'own-l1-no-cors-rpc' | 'off-chain-criteria' | 'multi-chain-too-loose';

export const RULES: Record<string, Rule> = rulesJson.rules as Record<string, Rule>;
export const NO_RULE_REASON: Record<string, NoRuleReason> =
  rulesJson.noRuleReason as Record<string, NoRuleReason>;
