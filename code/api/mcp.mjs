// MCP server over HTTP (Streamable HTTP transport, JSON-RPC 2.0).
// Spec: https://spec.modelcontextprotocol.io/
//
// Exposed at https://web3-discover.vercel.app/api/mcp.
// Four tools:
//   list_active_airdrops(chain?, status?, sort_by?, limit?)
//   get_airdrop(slug)
//   check_wallet(addr)
//   check_eligibility(evm?, sol?)  — port of /tools/eligibility verdict
//
// No auth, read-only. Idempotent. Returns JSON (not SSE).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, '_airdrops.json');
const SNAPSHOT = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));

const ELIGIBILITY_PATH = resolve(__dirname, '_eligibility-rules.json');
const ELIGIBILITY = JSON.parse(readFileSync(ELIGIBILITY_PATH, 'utf-8'));
const ELIG_RULES = ELIGIBILITY.rules;
const ELIG_NO_RULE = ELIGIBILITY.noRuleReason;

const SERVER_INFO = { name: 'web3-discover', version: '0.1.0' };
const PROTOCOL_VERSION = '2024-11-05';

const TOOLS = [
  {
    name: 'list_active_airdrops',
    description:
      `List vetted, currently-active airdrop opportunities tracked by web3-discover (${SNAPSHOT.count} entries). ` +
      'Filter by chain substring (e.g. "Solana", "Base", "Ethereum"), by risk level ("verified" | "unverified"), ' +
      'or by status. Useful when a user asks "what airdrops am I eligible for?" or "what should I farm this week?".',
    inputSchema: {
      type: 'object',
      properties: {
        chain: {
          type: 'string',
          description: 'Case-insensitive substring match against the entry\'s chain field (e.g. "Solana" matches "Solana / Multi").',
        },
        risk: {
          type: 'string',
          enum: ['verified', 'unverified'],
          description: 'Filter by risk level. "verified" = team has confirmed TGE plans; "unverified" = speculative.',
        },
        sort_by: {
          type: 'string',
          enum: ['deadline', 'project', 'added'],
          default: 'deadline',
          description: 'Sort order. "deadline" = soonest first (ongoing entries last). "added" = most recently added first.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 32,
          description: 'Max number of entries to return.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_airdrop',
    description:
      'Return the full details for a single airdrop entry by slug, including action steps, effort estimate, cost floor, ' +
      'risk assessment, and curator notes. Use the slug returned by list_active_airdrops.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The entry slug, e.g. "backpack-season-4" or "megaeth-terminal-points".',
        },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'check_wallet',
    description:
      'Given an EVM (0x…) or Solana wallet address, fan out across 7 public RPCs (Ethereum, Base, Linea, Arbitrum, ' +
      'Polygon, BSC, Solana) to detect which chains the wallet has touched, then surface every tracked airdrop whose ' +
      'chain matches. NOTE: this is a presence check, not eligibility — most airdrops have additional on-chain criteria.',
    inputSchema: {
      type: 'object',
      properties: {
        addr: {
          type: 'string',
          description: 'Wallet address. EVM 0x… (42 chars) or Solana base58 (32–44 chars).',
        },
      },
      required: ['addr'],
      additionalProperties: false,
    },
  },
  {
    name: 'check_eligibility',
    description:
      `Evaluate ${Object.keys(ELIG_RULES).length} hand-verified on-chain rules against an EVM and/or Solana ` +
      `wallet, then bucket all ${SNAPSHOT.count} tracked airdrops into "likely eligible" (rule passes), ` +
      '"keep farming" (partial — has some activity below threshold), "not relevant" (rule fails), and "manual ' +
      'check" (entries living on chains without browser-reachable RPCs or with off-chain criteria). Each rule is ' +
      'one of: presence on an EVM chain (eth_getTransactionCount ≥ N), an ERC-20 balance (balanceOf ≥ min), Solana ' +
      'signature history, or an SPL balance. Server-side RPC fanout; supply at least one of evm or sol. Use when ' +
      'a user asks "what airdrops am I eligible for given this wallet?".',
    inputSchema: {
      type: 'object',
      properties: {
        evm: {
          type: 'string',
          description: 'EVM address (0x… 40 hex). Optional, but at least one of evm/sol is required.',
        },
        sol: {
          type: 'string',
          description: 'Solana address (base58, 32–44 chars). Optional, but at least one of evm/sol is required.',
        },
      },
      additionalProperties: false,
    },
  },
];

// ─── tool handlers ──────────────────────────────────────────────────────────

function toolListAirdrops(args = {}) {
  const { chain, risk, sort_by = 'deadline', limit = 32 } = args;
  let entries = SNAPSHOT.entries.slice();
  if (chain && typeof chain === 'string') {
    const needle = chain.toLowerCase();
    entries = entries.filter((e) => (e.chain || '').toLowerCase().includes(needle));
  }
  if (risk && typeof risk === 'string') {
    entries = entries.filter((e) => e.risk === risk);
  }
  if (sort_by === 'project') {
    entries.sort((a, b) => (a.project || '').localeCompare(b.project || ''));
  } else if (sort_by === 'added') {
    entries.sort((a, b) => (b.addedOn || '').localeCompare(a.addedOn || ''));
  }
  // deadline ordering is already the snapshot's default
  entries = entries.slice(0, Math.min(Math.max(parseInt(limit, 10) || 32, 1), 100));
  const summary = entries.map((e) => ({
    slug: e.slug,
    project: e.project,
    chain: e.chain,
    blurb: e.blurb,
    deadline: e.deadline,
    effort: e.effort,
    costFloor: e.costFloor,
    risk: e.risk,
    officialUrl: e.officialUrl,
  }));
  return {
    count: summary.length,
    totalTracked: SNAPSHOT.count,
    generatedAt: SNAPSHOT.generatedAt,
    entries: summary,
  };
}

function toolGetAirdrop(args = {}) {
  const slug = String(args.slug || '').trim();
  if (!slug) throw new Error('slug is required');
  const entry = SNAPSHOT.entries.find((e) => e.slug === slug);
  if (!entry) throw new Error(`no airdrop found with slug "${slug}". Use list_active_airdrops to discover valid slugs.`);
  return entry;
}

// ── wallet check (server-side RPC fanout) ──

const EVM_CHAINS = [
  { key: 'ethereum', rpc: 'https://ethereum-rpc.publicnode.com', label: 'Ethereum', needles: ['ethereum'] },
  { key: 'base',     rpc: 'https://base-rpc.publicnode.com',     label: 'Base',     needles: ['base'] },
  { key: 'linea',    rpc: 'https://linea-rpc.publicnode.com',    label: 'Linea',    needles: ['linea'] },
  { key: 'arbitrum', rpc: 'https://arbitrum-one-rpc.publicnode.com', label: 'Arbitrum', needles: ['arbitrum'] },
  { key: 'polygon',  rpc: 'https://polygon-bor-rpc.publicnode.com',  label: 'Polygon',  needles: ['polygon'] },
  { key: 'bsc',      rpc: 'https://bsc-rpc.publicnode.com',      label: 'BSC',      needles: ['bsc', 'binance'] },
];
const SOLANA = { key: 'solana', rpc: 'https://solana-rpc.publicnode.com', label: 'Solana', needles: ['solana'] };

function classifyAddress(raw) {
  const addr = String(raw || '').trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return { kind: 'evm', addr: addr.toLowerCase() };
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return { kind: 'solana', addr };
  return { kind: 'invalid', addr };
}

async function rpcCall(url, body, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'rpc error');
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

async function checkEvmChain(chain, addr) {
  try {
    const hex = await rpcCall(chain.rpc, { jsonrpc: '2.0', id: 1, method: 'eth_getTransactionCount', params: [addr, 'latest'] });
    const count = parseInt(hex, 16);
    return { key: chain.key, label: chain.label, hasActivity: count > 0, txCount: count, error: null };
  } catch (e) {
    return { key: chain.key, label: chain.label, hasActivity: false, txCount: null, error: e.message };
  }
}

async function checkSolana(addr) {
  try {
    const sigs = await rpcCall(SOLANA.rpc, { jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [addr, { limit: 1 }] });
    return { key: SOLANA.key, label: SOLANA.label, hasActivity: Array.isArray(sigs) && sigs.length > 0, error: null };
  } catch (e) {
    return { key: SOLANA.key, label: SOLANA.label, hasActivity: false, error: e.message };
  }
}

async function toolCheckWallet(args = {}) {
  const format = classifyAddress(args.addr);
  if (format.kind === 'invalid') {
    throw new Error(`"${args.addr}" is not a valid EVM (0x… 40 hex) or Solana (base58 32–44 chars) address.`);
  }

  let chainResults;
  if (format.kind === 'evm') {
    chainResults = await Promise.all(EVM_CHAINS.map((c) => checkEvmChain(c, format.addr)));
  } else {
    chainResults = [await checkSolana(format.addr)];
  }

  const activeKeys = new Set(chainResults.filter((r) => r.hasActivity).map((r) => r.key));
  const allChains = [...EVM_CHAINS, SOLANA];
  const matchedAirdrops = SNAPSHOT.entries
    .filter((e) => {
      const chainText = (e.chain || '').toLowerCase();
      return allChains.some((c) => activeKeys.has(c.key) && c.needles.some((n) => chainText.includes(n)));
    })
    .map((e) => ({
      slug: e.slug,
      project: e.project,
      chain: e.chain,
      blurb: e.blurb,
      deadline: e.deadline,
      risk: e.risk,
      officialUrl: e.officialUrl,
    }));

  return {
    address: format.addr,
    addressType: format.kind,
    activeOn: chainResults.filter((r) => r.hasActivity).map((r) => ({ key: r.key, label: r.label })),
    rpcErrors: chainResults.filter((r) => r.error).map((r) => ({ key: r.key, error: r.error })),
    matchedAirdropCount: matchedAirdrops.length,
    matchedAirdrops,
    disclaimer:
      'This is a presence check, not eligibility. Most airdrops have additional on-chain criteria (bridged volume, ' +
      'specific dApps used, points earned). Click through each entry for the real rules.',
  };
}

// ── eligibility (per-rule on-chain verdict) ──
// Mirror of /tools/eligibility's evaluator. Server-side variant: batched
// JSON-RPC POSTs (one per chain) + Solana per-mint calls. Each rule resolves
// to { status: pass | partial | fail | unavailable, detail }.

const EVM_RPCS = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  base:     'https://base-rpc.publicnode.com',
  linea:    'https://linea-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  polygon:  'https://polygon-bor-rpc.publicnode.com',
  bsc:      'https://bsc-rpc.publicnode.com',
};
const SOL_RPC_URL = 'https://solana-rpc.publicnode.com';
const CHAIN_LABELS = {
  ethereum: 'Ethereum', base: 'Base', linea: 'Linea',
  arbitrum: 'Arbitrum', polygon: 'Polygon', bsc: 'BSC', solana: 'Solana',
};

const EVM_RX = /^0x[a-fA-F0-9]{40}$/;
const SOL_RX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
    officialUrl: e.officialUrl,
    verdictDetail: verdict?.detail,
  };
}

async function toolCheckEligibility(args = {}) {
  const rawEvm = (args.evm == null ? '' : String(args.evm)).trim();
  const rawSol = (args.sol == null ? '' : String(args.sol)).trim();
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
      manual.push({ slug: e.slug, project: e.project, chain: e.chain, deadline: e.deadline, officialUrl: e.officialUrl, reason });
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
    disclaimer:
      'Each verdict is a loose on-chain proxy, not authoritative eligibility. Most airdrops gate on additional ' +
      'contract-level criteria (bridged volume, specific dApps, in-app points). Follow each entry\'s officialUrl for the real rules.',
  };
}

const TOOL_FNS = {
  list_active_airdrops: toolListAirdrops,
  get_airdrop: toolGetAirdrop,
  check_wallet: toolCheckWallet,
  check_eligibility: toolCheckEligibility,
};

// ─── JSON-RPC dispatch ──────────────────────────────────────────────────────

function jsonError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}
function jsonOk(id, result) {
  return { jsonrpc: '2.0', id, result };
}

async function dispatch(msg) {
  if (!msg || msg.jsonrpc !== '2.0') {
    return jsonError(msg?.id ?? null, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }
  const { method, params, id } = msg;

  // Notifications (no response expected)
  if (id === undefined) {
    return null;
  }

  try {
    switch (method) {
      case 'initialize':
        return jsonOk(id, {
          protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
          instructions:
            'web3-discover is a curated airdrop directory. Call list_active_airdrops to browse, get_airdrop for ' +
            'details, check_wallet for chain-presence matching, check_eligibility for per-rule on-chain verdicts ' +
            `(${Object.keys(ELIG_RULES).length} hand-verified rules). All data is read-only and refreshed weekly.`,
        });

      case 'ping':
        return jsonOk(id, {});

      case 'tools/list':
        return jsonOk(id, { tools: TOOLS });

      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments || {};
        const fn = TOOL_FNS[name];
        if (!fn) return jsonError(id, -32601, `Unknown tool: ${name}`);
        try {
          const result = await fn(args);
          return jsonOk(id, {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: false,
          });
        } catch (err) {
          return jsonOk(id, {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          });
        }
      }

      default:
        return jsonError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    return jsonError(id, -32603, `Internal error: ${err.message}`);
  }
}

// ─── HTTP handler ──────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS — public read-only API, allow any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-protocol-version');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    // Friendly status page for browsers / health checks
    res.setHeader('content-type', 'application/json');
    res.status(200).send(
      JSON.stringify(
        {
          server: SERVER_INFO,
          protocol: 'mcp/jsonrpc-2.0 over http',
          protocolVersion: PROTOCOL_VERSION,
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          dataSnapshot: { count: SNAPSHOT.count, generatedAt: SNAPSHOT.generatedAt },
          usage: {
            claudeDesktopConfig: {
              mcpServers: {
                'web3-discover': {
                  command: 'npx',
                  args: ['-y', 'mcp-remote', 'https://web3-discover.vercel.app/api/mcp'],
                },
              },
            },
            curlExample:
              "curl -X POST https://web3-discover.vercel.app/api/mcp -H 'content-type: application/json' " +
              "-d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
          },
          docs: 'https://web3-discover.vercel.app/llms.txt',
        },
        null,
        2,
      ),
    );
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  // Parse body (Vercel may pass it pre-parsed as object, or as string)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  } else if (body == null) {
    // Read raw stream
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf-8');
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }
  }

  if (!body) {
    res.status(400).json(jsonError(null, -32700, 'Parse error: body must be JSON'));
    return;
  }

  // JSON-RPC supports batch (array) and single (object)
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map(dispatch))).filter((r) => r !== null);
    res.setHeader('content-type', 'application/json');
    res.status(200).send(JSON.stringify(responses));
    return;
  }

  const response = await dispatch(body);
  res.setHeader('content-type', 'application/json');
  if (response === null) {
    // notification — no body, 202 Accepted
    res.status(202).end();
    return;
  }
  res.status(200).send(JSON.stringify(response));
}
