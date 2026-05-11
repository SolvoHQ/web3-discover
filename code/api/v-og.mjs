// /v/<hash>/og.png — server-rendered Open Graph image for shareable verdict URLs.
//
// Counts (eligible / total rules) are passed via URL query params (?e=<n>&t=<n>) so
// this function can run in the Edge runtime — re-running the eligibility eval here
// would require node:fs, which Edge doesn't expose. The page handler at /api/v.mjs
// always renders this URL with authoritative counts it computed itself, so the OG
// image stays in sync with the page that drives the share.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const EVM_RX = /^0x[a-fA-F0-9]{40}$/;
const SOL_RX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function shortAddr(a) {
  if (!a) return '';
  return a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-6) : a;
}

function parseHash(raw) {
  if (!raw) return null;
  const decoded = decodeURIComponent(String(raw).trim());
  const parts = decoded.split('~').map((p) => p.trim()).filter(Boolean);
  let evm = '', sol = '';
  for (const p of parts) {
    if (!evm && EVM_RX.test(p)) evm = p;
    else if (!sol && SOL_RX.test(p)) sol = p;
  }
  if (!evm && !sol) return null;
  return { evm, sol };
}

// Plain element tree (satori accepts this shape — no React/JSX needed).
function el(type, props, ...children) {
  const flat = children.flat().filter((c) => c !== false && c != null);
  const kids = flat.length === 0 ? undefined : flat.length === 1 ? flat[0] : flat;
  return {
    type,
    props: kids === undefined ? props : { ...props, children: kids },
    key: null,
  };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const rawHash = url.searchParams.get('h') || '';
  const parsed = parseHash(rawHash);
  const eligible = parseInt(url.searchParams.get('e') || '0', 10) || 0;
  const total = parseInt(url.searchParams.get('t') || '0', 10) || 0;

  const evm = parsed?.evm || '';
  const sol = parsed?.sol || '';
  const labelAddr = evm ? shortAddr(evm) : shortAddr(sol);
  const inputLabel = evm && sol ? 'EVM + Solana' : evm ? 'EVM wallet' : sol ? 'Solana wallet' : 'wallet';

  const eligibleStr = String(eligible);
  const totalLabel = total > 0 ? ' of ' + total : '';

  const tree = el('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: '#fdfbf6',
      padding: '70px 80px',
      fontFamily: 'serif',
      color: '#222',
      position: 'relative',
    },
  },
    el('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: 30,
      },
    },
      el('div', {
        style: {
          fontSize: 26,
          fontWeight: 700,
          color: '#c8531a',
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      }, 'web3-discover · shared verdict'),
    ),

    el('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        marginTop: 10,
      },
    },
      el('div', {
        style: {
          fontSize: 38,
          color: '#555',
          marginBottom: 18,
        },
      }, inputLabel),
      el('div', {
        style: {
          fontSize: 64,
          fontWeight: 700,
          fontFamily: 'monospace',
          color: '#222',
          letterSpacing: 1,
          marginBottom: 28,
        },
      }, labelAddr || '0x…'),
    ),

    el('div', {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        marginTop: 18,
      },
    },
      el('div', {
        style: {
          fontSize: 56,
          color: '#555',
          marginRight: 18,
        },
      }, '→'),
      el('div', {
        style: {
          fontSize: 120,
          fontWeight: 700,
          color: '#2e8540',
          lineHeight: 1,
          letterSpacing: -2,
        },
      }, eligibleStr),
      el('div', {
        style: {
          fontSize: 44,
          color: '#222',
          marginLeft: 22,
          lineHeight: 1.1,
        },
      }, 'airdrops eligible' + totalLabel),
    ),

    el('div', {
      style: {
        display: 'flex',
        marginTop: 'auto',
        paddingTop: 30,
        borderTop: '2px solid #d9d4c4',
        fontSize: 30,
        color: '#555',
      },
    },
      el('div', { style: { display: 'flex' } },
        el('span', { style: { fontFamily: 'monospace' } }, 'web3-discover.vercel.app/tools/eligibility'),
      ),
      el('div', { style: { display: 'flex', marginLeft: 'auto', color: '#c8531a', fontWeight: 700 } },
        'Check your wallet →',
      ),
    ),
  );

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    headers: {
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
