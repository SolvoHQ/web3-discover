import type { APIContext } from 'astro';
import { listPublishedAirdrops, type AirdropEntry } from '../../lib/airdrops.ts';

export async function getStaticPaths() {
  const entries = await listPublishedAirdrops();
  return entries.map((entry) => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

interface Props {
  entry: AirdropEntry;
}

// "Arbitrum One + Nova + Orbit" -> "Arbitrum One"; "Solana / Polygon" -> "Solana".
// Multi-chain listings get one chain name so the badge stays single-line.
function primaryChain(raw: string): string {
  const head = raw.split(/[+/,]|\s—\s|\s-\s/)[0]?.trim() ?? raw;
  return head || raw;
}

// Approx pixel width of `s` rendered at 11px Verdana — close enough for shield
// layout; not measuring per-glyph because the dependency cost isn't worth it.
function approxWidth(s: string): number {
  let w = 0;
  for (const c of s) {
    if (/[ijl.,:|!]/.test(c)) w += 3.4;
    else if (/[A-Z0-9]/.test(c)) w += 7.6;
    else if (c === ' ') w += 3.6;
    else w += 6.2;
  }
  return w;
}

export function GET(context: APIContext) {
  const { entry } = context.props as Props;
  const d = entry.data;
  const chain = primaryChain(d.chain);
  const risk = d.risk;

  const leftText = 'tracked on web3-discover';
  const rightText = `${chain} · ${risk}`;

  const PAD = 12;
  const leftW = Math.round(approxWidth(leftText) + PAD * 2);
  const rightW = Math.round(approxWidth(rightText) + PAD * 2);
  const totalW = leftW + rightW;

  // Right-side colour is risk-coded: verified=brand orange, unverified=amber, suspect=red.
  const rightFill = risk === 'verified' ? '#c8531a' : risk === 'unverified' ? '#a8741a' : '#a8201a';

  const aria = `tracked on web3-discover — ${chain} — ${risk}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" viewBox="0 0 ${totalW} 20" role="img" aria-label="${aria}">
<title>${aria}</title>
<linearGradient id="g" x2="0" y2="100%">
<stop offset="0" stop-color="#fff" stop-opacity=".08"/>
<stop offset="1" stop-color="#000" stop-opacity=".15"/>
</linearGradient>
<clipPath id="c"><rect width="${totalW}" height="20" rx="3"/></clipPath>
<g clip-path="url(#c)">
<rect width="${leftW}" height="20" fill="#14130f"/>
<rect x="${leftW}" width="${rightW}" height="20" fill="${rightFill}"/>
<rect width="${totalW}" height="20" fill="url(#g)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${leftW / 2}" y="14">${escapeXml(leftText)}</text>
<text x="${leftW + rightW / 2}" y="14">${escapeXml(rightText)}</text>
</g>
</svg>`;

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
