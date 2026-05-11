// MCP server over HTTP (Streamable HTTP transport, JSON-RPC 2.0).
// Spec: https://spec.modelcontextprotocol.io/
//
// Exposed at https://web3-discover.vercel.app/api/mcp.
// Three tools:
//   list_active_airdrops(chain?, status?, sort_by?, limit?)
//   get_airdrop(slug)
//   check_wallet(addr)
//
// No auth, read-only. Idempotent. Returns JSON (not SSE).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, '_airdrops.json');
const SNAPSHOT = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));

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

const TOOL_FNS = {
  list_active_airdrops: toolListAirdrops,
  get_airdrop: toolGetAirdrop,
  check_wallet: toolCheckWallet,
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
            'details, check_wallet to match an address against the directory. All data is read-only and refreshed weekly.',
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
