// GET /api/eligibility.json?evm=0x…&sol=… — server-side wallet→verdict.
//
// Thin HTTP proxy over the shared evaluator at api/_eligibility-eval.mjs (also
// powering the MCP check_eligibility tool and the /v/<hash> share renderer).
// Same rules, same RPC fanout, same buckets the browser tool at
// /tools/eligibility computes — but reachable from any non-browser client
// (CLI, curl, scripts) without doing on-host RPC.
//
// Inputs:
//   evm  — 0x…40-hex EVM address
//   sol  — base58 32–44 char Solana address
//   addr — convenience alias, auto-detected (EVM or SOL)
// At least one of {evm, sol, addr} required. Both EVM and SOL may be supplied.
//
// Response (200):
//   { inputs, rulesEvaluated, totalTracked, counts, eligible[], partial[],
//     manual[], unavailable[], skip[] }
// Each bucket entry: { slug, project, chain, risk, deadline, effort, costFloor,
//   blurb, officialUrl, verdictDetail }
//
// 400 — missing or malformed inputs. 405 — non-GET.
//
// Per-wallet response is dynamic (RPC reads change as wallets transact), but
// the snapshot+rules dimension is static. We set a short edge cache so callers
// hammering the same wallet don't re-fan-out RPCs every call.

import { evaluateWallet, EVM_RX, SOL_RX } from './_eligibility-eval.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const url = new URL(req.url, 'http://x');
  let evm = (url.searchParams.get('evm') || '').trim();
  let sol = (url.searchParams.get('sol') || '').trim();
  const addr = (url.searchParams.get('addr') || '').trim();
  if (!evm && !sol && addr) {
    if (EVM_RX.test(addr)) evm = addr;
    else if (SOL_RX.test(addr)) sol = addr;
  }

  if (!evm && !sol) {
    res.status(400).json({
      error: 'missing address',
      hint: 'pass ?evm=0x… and/or ?sol=<base58>, or ?addr=<auto-detected>',
    });
    return;
  }
  if (evm && !EVM_RX.test(evm)) {
    res.status(400).json({ error: 'malformed evm address (expected 0x + 40 hex)' });
    return;
  }
  if (sol && !SOL_RX.test(sol)) {
    res.status(400).json({ error: 'malformed solana address (expected base58 32–44 chars)' });
    return;
  }

  try {
    const verdict = await evaluateWallet({ evm, sol });
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=60, s-maxage=60');
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      source: 'https://web3-discover.vercel.app',
      ...verdict,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'evaluation failed' });
  }
}
