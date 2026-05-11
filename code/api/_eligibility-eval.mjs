// Shared server-side eligibility evaluator. Consumed by:
//   - /api/mcp.mjs (MCP check_eligibility tool)
//   - /api/v.mjs   (share-verdict URL renderer)
//
// Re-derives a deterministic verdict from {evm, sol} by fanning out to publicnode
// RPCs and matching against the prebuilt rule registry + airdrop snapshot.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = JSON.parse(readFileSync(resolve(__dirname, '_airdrops.json'), 'utf-8'));
const ELIGIBILITY = JSON.parse(readFileSync(resolve(__dirname, '_eligibility-rules.json'), 'utf-8'));
const ELIG_RULES = ELIGIBILITY.rules;
const ELIG_NO_RULE = ELIGIBILITY.noRuleReason;

export const EVM_RX = /^0x[a-fA-F0-9]{40}$/;
export const SOL_RX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const EVM_RPCS = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  base:     'https://base-rpc.publicnode.com',
  linea:    'https://linea-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  polygon:  'https://polygon-bor-rpc.publicnode.com',
  bsc:      'https://bsc-rpc.publicnode.com',
};
const SOL_RPC_URL = 'https://solana-rpc.publicnode.com';
export const CHAIN_LABELS = {
  ethereum: 'Ethereum', base: 'Base', linea: 'Linea',
  arbitrum: 'Arbitrum', polygon: 'Polygon', bsc: 'BSC', solana: 'Solana',
};

function collectNeeds(rule, needs) {
  if (rule.kind === 'chainTx') needs.evmTxCount.add(rule.chain);
  else if (rule.kind === 'tokenBalance') needs.evmTokenBalance.push({ chain: rule.chain, contract: rule.contract });
  else if (rule.kind === 'solanaTx') needs.solanaTx = true;
  else if (rule.kind === 'holdsSolMint') needs.solMints.add(rule.mint);
  else if (rule.kind === 'any' || rule.kind === 'all') {
    for (const r of rule.rules) collectNeeds(r, needs);
  }
}

function encodeBalanceOf(holder) {
  const stripped = holder.toLowerCase().replace(/^0x/, '');
  return '0x70a08231' + '0'.repeat(24) + stripped;
}

function hexToBigInt(h) {
  if (!h || h === '0x') return 0n;
  try { return BigInt(h); } catch { return 0n; }
}

async function rawRpcCall(url, body, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchEvmChain(chainKey, evmAddr, needs) {
  const wantTxCount = needs.evmTxCount.has(chainKey);
  const tokens = needs.evmTokenBalance.filter((t) => t.chain === chainKey);
  if (!wantTxCount && tokens.length === 0) return { chain: chainKey, ok: true };

  const reqs = [];
  const ids = { tokens: [] };
  let nextId = 0;
  if (wantTxCount) {
    ids.txCount = nextId++;
    reqs.push({ jsonrpc: '2.0', id: ids.txCount, method: 'eth_getTransactionCount', params: [evmAddr, 'latest'] });
  }
  for (const t of tokens) {
    const id = nextId++;
    ids.tokens.push({ id, contract: t.contract });
    reqs.push({ jsonrpc: '2.0', id, method: 'eth_call', params: [{ to: t.contract, data: encodeBalanceOf(evmAddr) }, 'latest'] });
  }
  let body;
  try {
    body = await rawRpcCall(EVM_RPCS[chainKey], reqs);
  } catch (err) {
    return { chain: chainKey, ok: false, error: err.message };
  }
  const byId = new Map((Array.isArray(body) ? body : []).map((r) => [r.id, r]));
  const out = { chain: chainKey, ok: true, balances: new Map() };
  if (wantTxCount) {
    const r = byId.get(ids.txCount);
    if (r && !r.error) out.txCount = parseInt(r.result, 16) || 0;
    else out.txCountError = (r && r.error && r.error.message) || 'no response';
  }
  for (const t of ids.tokens) {
    const r = byId.get(t.id);
    if (r && !r.error) out.balances.set(t.contract, hexToBigInt(r.result));
    else out.balances.set(t.contract, { error: (r && r.error && r.error.message) || 'no response' });
  }
  return out;
}

async function fetchSolanaTxPresent(solAddr) {
  try {
    const j = await rawRpcCall(SOL_RPC_URL, {
      jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress',
      params: [solAddr, { limit: 1 }],
    });
    if (j.error) return { ok: false, error: j.error.message };
    const sigs = j.result || [];
    return { ok: true, present: Array.isArray(sigs) && sigs.length > 0 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function fetchSplBalance(solAddr, mint) {
  try {
    const j = await rawRpcCall(SOL_RPC_URL, {
      jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
      params: [solAddr, { mint }, { encoding: 'jsonParsed' }],
    });
    if (j.error) return { ok: false, error: j.error.message };
    let total = 0n;
    for (const a of (j.result?.value || [])) {
      const amt = a.account?.data?.parsed?.info?.tokenAmount?.amount;
      if (amt) total += BigInt(amt);
    }
    return { ok: true, raw: total };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function fmtAmount(raw, decimals) {
  if (raw === 0n) return '0';
  const s = raw.toString().padStart(decimals + 1, '0');
  const intPart = s.slice(0, s.length - decimals);
  let frac = s.slice(s.length - decimals).replace(/0+$/, '');
  if (frac.length === 0) return intPart;
  if (frac.length > 4) frac = frac.slice(0, 4);
  return intPart + '.' + frac;
}

function minBigInt(decimals, min) {
  const [whole, fracRaw = ''] = (min + '').split('.');
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * (10n ** BigInt(decimals)) + BigInt(frac || '0');
}

function evaluateRule(rule, state) {
  if (rule.kind === 'chainTx') {
    if (!state.evm) return { status: 'fail', detail: 'No EVM address supplied' };
    const cd = state.byChain[rule.chain];
    if (!cd || !cd.ok || cd.txCountError != null) {
      return { status: 'unavailable', detail: 'RPC unavailable for ' + (CHAIN_LABELS[rule.chain] || rule.chain) };
    }
    const n = cd.txCount || 0;
    if (n >= rule.minCount) return { status: 'pass', detail: n.toLocaleString() + ' tx on ' + CHAIN_LABELS[rule.chain] + ' (≥ ' + rule.minCount + ' required)' };
    if (n > 0) return { status: 'partial', detail: n + ' tx on ' + CHAIN_LABELS[rule.chain] + ' (need ' + rule.minCount + '+)' };
    return { status: 'fail', detail: 'No transactions on ' + CHAIN_LABELS[rule.chain] };
  }
  if (rule.kind === 'tokenBalance') {
    if (!state.evm) return { status: 'fail', detail: 'No EVM address supplied' };
    const cd = state.byChain[rule.chain];
    if (!cd || !cd.ok) return { status: 'unavailable', detail: 'RPC unavailable for ' + (CHAIN_LABELS[rule.chain] || rule.chain) };
    const bal = cd.balances.get(rule.contract);
    if (bal == null || (bal && bal.error != null)) return { status: 'unavailable', detail: rule.symbol + ' balance read failed' };
    const minRaw = minBigInt(rule.decimals, rule.min);
    if (bal >= minRaw) return { status: 'pass', detail: 'Holds ' + fmtAmount(bal, rule.decimals) + ' ' + rule.symbol };
    if (bal > 0n) return { status: 'partial', detail: 'Holds ' + fmtAmount(bal, rule.decimals) + ' ' + rule.symbol + ' (below threshold)' };
    return { status: 'fail', detail: 'No ' + rule.symbol + ' balance' };
  }
  if (rule.kind === 'solanaTx') {
    if (!state.sol) return { status: 'fail', detail: 'No Solana address supplied' };
    if (!state.solana || !state.solana.ok) return { status: 'unavailable', detail: 'Solana RPC unavailable' };
    if (state.solana.present) return { status: 'pass', detail: 'Has Solana signature history' };
    return { status: 'fail', detail: 'No Solana signature history' };
  }
  if (rule.kind === 'holdsSolMint') {
    if (!state.sol) return { status: 'fail', detail: 'No Solana address supplied' };
    const entry = state.solMints && state.solMints[rule.mint];
    if (!entry) return { status: 'unavailable', detail: rule.symbol + ' balance read missing' };
    if (!entry.ok) return { status: 'unavailable', detail: rule.symbol + ' balance read failed' };
    const minRaw = minBigInt(rule.decimals, rule.min);
    if (entry.raw >= minRaw) return { status: 'pass', detail: 'Holds ' + fmtAmount(entry.raw, rule.decimals) + ' ' + rule.symbol };
    if (entry.raw > 0n) return { status: 'partial', detail: 'Holds ' + fmtAmount(entry.raw, rule.decimals) + ' ' + rule.symbol + ' (below threshold)' };
    return { status: 'fail', detail: 'No ' + rule.symbol + ' balance' };
  }
  if (rule.kind === 'any') {
    const sub = rule.rules.map((r) => evaluateRule(r, state));
    if (sub.some((s) => s.status === 'pass')) return { status: 'pass', detail: sub.find((s) => s.status === 'pass').detail };
    if (sub.some((s) => s.status === 'partial')) return { status: 'partial', detail: sub.find((s) => s.status === 'partial').detail };
    if (sub.every((s) => s.status === 'unavailable')) return { status: 'unavailable', detail: 'All checks unavailable' };
    return { status: 'fail', detail: sub.find((s) => s.status === 'fail')?.detail || 'No conditions met' };
  }
  if (rule.kind === 'all') {
    const sub = rule.rules.map((r) => evaluateRule(r, state));
    if (sub.some((s) => s.status === 'unavailable')) return { status: 'unavailable', detail: 'One or more checks unavailable' };
    if (sub.every((s) => s.status === 'pass')) return { status: 'pass', detail: sub.map((s) => s.detail).join(' · ') };
    if (sub.some((s) => s.status === 'pass')) return { status: 'partial', detail: 'Some conditions met: ' + sub.filter((s) => s.status === 'pass').map((s) => s.detail).join(' · ') };
    return { status: 'fail', detail: 'No conditions met' };
  }
  return { status: 'fail', detail: 'Unknown rule kind' };
}

function summariseEntry(e, verdict) {
  return {
    slug: e.slug,
    project: e.project,
    chain: e.chain,
    risk: e.risk,
    deadline: e.deadline,
    effort: e.effort,
    costFloor: e.costFloor,
    blurb: e.blurb,
    officialUrl: e.officialUrl,
    verdictDetail: verdict?.detail,
  };
}

/**
 * Evaluate a wallet against the full rule set. Both inputs are optional but at
 * least one must be present.
 * @param {{evm?: string, sol?: string}} input
 * @returns {Promise<{inputs, rulesEvaluated, totalTracked, counts, eligible, partial, manual, unavailable, skip}>}
 */
export async function evaluateWallet({ evm, sol } = {}) {
  const rawEvm = (evm == null ? '' : String(evm)).trim();
  const rawSol = (sol == null ? '' : String(sol)).trim();
  const evmAddr = rawEvm && EVM_RX.test(rawEvm) ? rawEvm : '';
  const solAddr = rawSol && SOL_RX.test(rawSol) ? rawSol : '';
  if (!evmAddr && !solAddr) {
    throw new Error('Supply at least one of `evm` (0x… 40 hex) or `sol` (base58 32–44 chars).');
  }

  const needs = { evmTxCount: new Set(), evmTokenBalance: [], solanaTx: false, solMints: new Set() };
  for (const slug of Object.keys(ELIG_RULES)) collectNeeds(ELIG_RULES[slug], needs);

  const evmChains = Array.from(new Set([...needs.evmTxCount, ...needs.evmTokenBalance.map((t) => t.chain)]));
  const evmJobs = evmAddr ? evmChains.map((c) => fetchEvmChain(c, evmAddr, needs)) : [];
  const solJobs = [];
  if (solAddr && needs.solanaTx) solJobs.push(fetchSolanaTxPresent(solAddr).then((r) => ({ kind: 'sigs', r })));
  if (solAddr) for (const mint of needs.solMints) solJobs.push(fetchSplBalance(solAddr, mint).then((r) => ({ kind: 'mint', mint, r })));

  const [evmRes, solRes] = await Promise.all([Promise.all(evmJobs), Promise.all(solJobs)]);
  const byChain = {};
  for (const r of evmRes) byChain[r.chain] = r;
  let solana = null;
  const solMints = {};
  for (const item of solRes) {
    if (item.kind === 'sigs') solana = item.r;
    else if (item.kind === 'mint') solMints[item.mint] = item.r;
  }
  const state = { evm: evmAddr, sol: solAddr, byChain, solana, solMints };

  const eligible = [], partial = [], skip = [], unavailable = [], manual = [];
  for (const e of SNAPSHOT.entries) {
    const rule = ELIG_RULES[e.slug];
    if (!rule) {
      const reason = ELIG_NO_RULE[e.slug] || 'no-rule';
      manual.push({ slug: e.slug, project: e.project, chain: e.chain, deadline: e.deadline, officialUrl: e.officialUrl, blurb: e.blurb, reason });
      continue;
    }
    const v = evaluateRule(rule, state);
    if (v.status === 'pass') eligible.push(summariseEntry(e, v));
    else if (v.status === 'partial') partial.push(summariseEntry(e, v));
    else if (v.status === 'unavailable') unavailable.push(summariseEntry(e, v));
    else skip.push(summariseEntry(e, v));
  }

  return {
    inputs: { evm: evmAddr || null, sol: solAddr || null },
    rulesEvaluated: Object.keys(ELIG_RULES).length,
    totalTracked: SNAPSHOT.count,
    counts: {
      eligible: eligible.length, partial: partial.length, skip: skip.length,
      manual: manual.length, unavailable: unavailable.length,
    },
    eligible,
    partial,
    manual,
    unavailable,
    skip,
  };
}

export { SNAPSHOT, ELIG_RULES, ELIG_NO_RULE };
