import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { listPublishedAirdrops } from '../lib/airdrops.ts';

export async function GET(context: APIContext) {
  const entries = await listPublishedAirdrops();
  const site = context.site?.toString().replace(/\/$/, '') ?? 'https://web3-discover.vercel.app';

  return rss({
    title: 'web3-discover — active airdrops',
    description:
      "The airdrop hunter's honest map. Hand-vetted, scam-filtered airdrops with action, effort, cost floor, and deadline on every entry.",
    site,
    items: entries.map((entry) => {
      const d = entry.data;
      const url = `${site}/airdrops/${entry.slug}`;
      const summary = [
        `<p><strong>${d.project}</strong> &mdash; ${d.chain}</p>`,
        `<p>${escapeHtml(d.blurb)}</p>`,
        `<ul>`,
        `<li><strong>Action:</strong> ${escapeHtml(d.action)}</li>`,
        `<li><strong>Effort:</strong> ${escapeHtml(d.effort)}</li>`,
        `<li><strong>Cost floor:</strong> ${escapeHtml(d.costFloor)}</li>`,
        `<li><strong>Deadline:</strong> ${escapeHtml(d.deadline)}</li>`,
        `<li><strong>Risk:</strong> ${d.risk}</li>`,
        `<li><strong>Official:</strong> <a href="${d.officialUrl}">${d.officialUrl}</a></li>`,
        `</ul>`,
        `<p><a href="${url}">Full guide on web3-discover &rarr;</a></p>`,
      ].join('');
      return {
        title: `${d.project} (${d.chain}) — airdrop guide`,
        link: url,
        pubDate: new Date(d.addedOn),
        description: d.blurb,
        content: summary,
        categories: [d.chain, `risk:${d.risk}`],
      };
    }),
    customData: `<language>en-us</language>`,
    stylesheet: false,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
