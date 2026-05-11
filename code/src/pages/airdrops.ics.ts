import type { APIContext } from 'astro';
import { listPublishedAirdrops } from '../lib/airdrops.ts';
import { renderCalendar, toIcsDateTime, type IcsEvent } from '../lib/ics.ts';

export async function GET(context: APIContext) {
  const entries = await listPublishedAirdrops();
  const site = context.site?.toString().replace(/\/$/, '') ?? 'https://web3-discover.vercel.app';
  const events: IcsEvent[] = [];

  for (const entry of entries) {
    const d = entry.data;
    const url = `${site}/airdrops/${entry.slug}`;
    const harvested = d.events ?? [];
    harvested.forEach((ev, idx) => {
      const date = isoDateOnly(ev.date);
      if (!isFutureish(date)) return; // skip past-only milestones; today qualifies
      const start = toIcsDateTime(date, '235900');
      const end = toIcsDateTime(date, '235959');
      const description = [
        d.blurb,
        '',
        `Action: ${d.action}`,
        `Effort: ${d.effort}  •  Cost floor: ${d.costFloor}  •  Risk: ${d.risk}`,
        '',
        `Official: ${d.officialUrl}`,
        `Full guide: ${url}`,
      ].join('\n');
      events.push({
        uid: `${entry.slug}-event-${idx}@web3-discover.vercel.app`,
        start,
        end,
        summary: `${d.project} — ${ev.label}`,
        description,
        url,
        location: d.officialUrl,
      });
    });
  }

  // One global recurring reminder so subscribers get value even between dated
  // milestones. Anchored to next Sunday 09:00 UTC.
  const anchor = nextSundayAt9UTC();
  events.push({
    uid: 'weekly-review@web3-discover.vercel.app',
    start: anchor.start,
    end: anchor.end,
    summary: 'Web3 Discover — weekly airdrop review',
    description: [
      'Quick weekly check on the directory:',
      '• Any newly-added airdrops or guides this week?',
      '• Any deadlines coming up in the next 14 days?',
      '• Tools: wallet-check, token-holdings, swap.',
      '',
      `Open: ${site}/airdrops`,
    ].join('\n'),
    url: `${site}/airdrops`,
    location: `${site}/airdrops`,
    rrule: 'FREQ=WEEKLY;BYDAY=SU',
  });

  const body = renderCalendar({
    prodId: '-//web3-discover//airdrops//EN',
    name: 'Web3 Discover — Airdrop Deadlines',
    description:
      'Date-bound airdrop milestones (TGE, snapshot, unlock, season-end) from web3-discover. Updated as new entries are added.',
    events,
  });

  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function isoDateOnly(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

function isFutureish(yyyymmdd: string): boolean {
  // Keep today (UTC) and any future date. Past-only dates are pruned so the
  // feed stays clean as time moves forward without manual content edits.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return yyyymmdd >= today;
}

function nextSundayAt9UTC(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const daysUntilSun = (7 - day) % 7 || 7;
  const sun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSun, 9, 0, 0));
  const pad = (n: number) => n.toString().padStart(2, '0');
  const stamp = (h: number) =>
    `${sun.getUTCFullYear()}${pad(sun.getUTCMonth() + 1)}${pad(sun.getUTCDate())}T${pad(h)}0000Z`;
  return { start: stamp(9), end: stamp(10) };
}
