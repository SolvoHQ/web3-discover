// GET /api/cron/digest — weekly digest broadcast to the Resend audience.
//
// Scheduled by Vercel Cron (vercel.json crons) every Wed 14:00 UTC. Vercel
// injects Authorization: Bearer ${CRON_SECRET} on scheduled invocations.
//
// Manual invocations are gated by the same secret, either as the bearer
// token or as ?secret=... in the query string (for quick curl checks).
//
// Modes:
//   - default              create + send broadcast immediately (production cron path)
//   - ?dryRun=1            render HTML/text and return as JSON; no Resend call
//   - ?draft=1             create the broadcast but do NOT send (Resend returns id)
//
// Content (deterministic, derived from api/_airdrops.json):
//   - "Last verified" lane: top 5 entries by lastChecked DESC, then deadline ASC
//   - "Next deadlines" lane: 5 nearest upcoming dates merged from top-level
//     entry.deadline + entry.events[] (the same dates the .ics feed emits)
//
// Audience iteration + unsubscribe-list scrubbing is handled by Resend
// Broadcasts — we never iterate contacts ourselves.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = JSON.parse(readFileSync(resolve(__dirname, '../_airdrops.json'), 'utf-8'));

const SITE_URL = 'https://web3-discover.vercel.app';
const FROM = 'web3-discover <agent@west0n.top>';
const REPLY_TO = 'agent@west0n.top';
const UA = 'web3-discover-agent/1.0 (+https://web3-discover.vercel.app)';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isDated(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '');
}

function topRecentlyChecked(n = 5) {
  const sorted = [...SNAPSHOT.entries].sort((a, b) => {
    const la = isDated(a.lastChecked) ? a.lastChecked : '0000-00-00';
    const lb = isDated(b.lastChecked) ? b.lastChecked : '0000-00-00';
    if (la !== lb) return lb.localeCompare(la); // most-recent first
    const da = isDated(a.deadline) ? a.deadline : '9999-12-31';
    const db = isDated(b.deadline) ? b.deadline : '9999-12-31';
    return da.localeCompare(db);
  });
  return sorted.slice(0, n);
}

function nextDeadlines(n = 5) {
  const t = today();
  // Collapse (slug, date) to one row, preferring a descriptive event label over
  // the generic top-level "deadline" so one project doesn't take two slots on
  // the same day. Then sort and trim.
  const byKey = new Map();
  for (const e of SNAPSHOT.entries) {
    const push = (date, label) => {
      if (!isDated(date) || date < t) return;
      const k = `${e.slug}|${date}`;
      const cur = byKey.get(k);
      const isGeneric = !label || label === 'deadline';
      if (!cur || (cur.generic && !isGeneric)) {
        byKey.set(k, {
          slug: e.slug, project: e.project, chain: e.chain,
          date, label: label || 'deadline', generic: isGeneric,
        });
      }
    };
    push(e.deadline, 'deadline');
    for (const ev of e.events || []) push(ev.date, ev.label);
  }
  const rows = [...byKey.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.project.localeCompare(b.project);
  });
  return rows.slice(0, n).map(({ generic: _g, ...rest }) => rest);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDay(yyyymmdd) {
  if (!isDated(yyyymmdd)) return yyyymmdd || '—';
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d} ${y}`;
}

function digestSubject(recents, deadlines) {
  const stamp = today();
  const lead = deadlines[0];
  if (lead) {
    return `Web3 Discover — ${recents.length} freshly verified, next deadline ${lead.project} (${fmtDay(lead.date)})`;
  }
  return `Web3 Discover — weekly digest (${stamp})`;
}

function renderHtml({ recents, deadlines, generatedAt }) {
  const recentRows = recents
    .map((e) => {
      const url = `${SITE_URL}/airdrops/${escapeHtml(e.slug)}`;
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e7e2d2;">
            <div style="font-family:Georgia,serif;font-size:17px;font-weight:600;margin-bottom:4px;">
              <a href="${url}" style="color:#c8531a;text-decoration:none;">${escapeHtml(e.project)}</a>
              <span style="font-family:ui-monospace,monospace;font-size:12px;color:#666;font-weight:400;"> · ${escapeHtml(e.chain)}</span>
            </div>
            <div style="font-family:Georgia,serif;font-size:14px;color:#333;margin-bottom:6px;">${escapeHtml(e.blurb)}</div>
            <div style="font-family:ui-monospace,monospace;font-size:12px;color:#555;">
              last verified <strong>${escapeHtml(e.lastChecked || '—')}</strong>
              · deadline ${escapeHtml(e.deadline || '—')}
              · effort ${escapeHtml(e.effort || '—')}
              · risk <span style="color:${e.risk === 'verified' ? '#2e8a3f' : '#a8741a'};">${escapeHtml(e.risk)}</span>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  const deadlineRows = deadlines.length
    ? deadlines
        .map((r) => {
          const url = `${SITE_URL}/airdrops/${escapeHtml(r.slug)}`;
          return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e7e2d2;font-family:ui-monospace,monospace;font-size:13px;color:#222;">
            <span style="display:inline-block;min-width:96px;color:#c8531a;font-weight:600;">${escapeHtml(fmtDay(r.date))}</span>
            <a href="${url}" style="color:#222;text-decoration:none;font-weight:600;">${escapeHtml(r.project)}</a>
            <span style="color:#666;"> · ${escapeHtml(r.chain)}</span>
            <div style="font-family:Georgia,serif;font-size:13px;color:#555;margin:3px 0 0 96px;">${escapeHtml(r.label)}</div>
          </td>
        </tr>`;
        })
        .join('')
    : `<tr><td style="padding:10px 0;color:#666;font-family:Georgia,serif;">No dated milestones in the window — directory is in ongoing-points mode this week.</td></tr>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f5ef;font-family:Georgia,serif;color:#222;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fdfbf6;border:1px solid #d9d4c4;">
    <tr><td style="padding:24px 28px 8px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#c8531a;">web3-discover · weekly digest</div>
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:6px 0 0;font-weight:700;">${escapeHtml(SNAPSHOT.count)} airdrops tracked. ${escapeHtml(deadlines.length)} dated milestones in the queue.</h1>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#555;">
        We re-checked every listing this week and dropped anything that ended or smelled off. Below: what we just verified, then the next dates worth knowing.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px 4px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:4px;">Recently verified</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${recentRows}</table>
    </td></tr>
    <tr><td style="padding:18px 28px 4px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:4px;">Next 5 dated milestones</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${deadlineRows}</table>
    </td></tr>
    <tr><td style="padding:18px 28px 22px;">
      <p style="margin:0 0 12px;font-size:14px;line-height:1.55;">
        Want every dated milestone in your calendar?
        <a href="${SITE_URL}/tools/calendar" style="color:#c8531a;">Subscribe the iCal feed</a> —
        works in Google Calendar, Apple Calendar, Outlook.
      </p>
      <p style="margin:0;font-size:13px;color:#555;">
        Full directory: <a href="${SITE_URL}/airdrops" style="color:#c8531a;">${SITE_URL}/airdrops</a>
        · Generated ${escapeHtml(generatedAt)}
      </p>
    </td></tr>
    <tr><td style="padding:14px 28px 22px;border-top:1px solid #e7e2d2;">
      <p style="margin:0;font-size:11px;color:#888;font-family:ui-monospace,monospace;">
        You receive this because you subscribed at ${SITE_URL}/subscribe.
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888;">Unsubscribe in one click</a>.
        Listings are informational, not financial advice.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function renderText({ recents, deadlines, generatedAt }) {
  const lines = [];
  lines.push(`Web3 Discover — weekly digest`);
  lines.push(`${SNAPSHOT.count} airdrops tracked. ${deadlines.length} dated milestones in the queue.`);
  lines.push('');
  lines.push(`Recently verified:`);
  for (const e of recents) {
    lines.push(`• ${e.project} (${e.chain}) — last verified ${e.lastChecked || '—'}, deadline ${e.deadline || '—'}, effort ${e.effort || '—'}, risk ${e.risk}`);
    lines.push(`  ${SITE_URL}/airdrops/${e.slug}`);
  }
  lines.push('');
  lines.push(`Next 5 dated milestones:`);
  if (!deadlines.length) {
    lines.push(`(none — directory is in ongoing-points mode this week.)`);
  } else {
    for (const r of deadlines) {
      lines.push(`• ${fmtDay(r.date)} — ${r.project} (${r.chain}) — ${r.label}`);
      lines.push(`  ${SITE_URL}/airdrops/${r.slug}`);
    }
  }
  lines.push('');
  lines.push(`Full directory: ${SITE_URL}/airdrops`);
  lines.push(`Calendar feed:  ${SITE_URL}/tools/calendar`);
  lines.push(`Generated ${generatedAt}`);
  lines.push('');
  lines.push(`Unsubscribe in one click: {{{RESEND_UNSUBSCRIBE_URL}}}`);
  return lines.join('\n');
}

function authorized(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const hdr = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof hdr === 'string' && hdr === `Bearer ${expected}`) return true;
  const url = new URL(req.url, 'http://x');
  if (url.searchParams.get('secret') === expected) return true;
  return false;
}

async function createBroadcast({ apiKey, audienceId, subject, html, text }) {
  const res = await fetch('https://api.resend.com/broadcasts', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: JSON.stringify({
      audience_id: audienceId,
      from: FROM,
      reply_to: REPLY_TO,
      subject,
      html,
      text,
      name: `weekly-digest-${today()}`,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`createBroadcast ${res.status}: ${body.slice(0, 300)}`);
  }
  return JSON.parse(body);
}

async function sendBroadcast({ apiKey, id }) {
  const res = await fetch(`https://api.resend.com/broadcasts/${id}/send`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: JSON.stringify({}),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`sendBroadcast ${res.status}: ${body.slice(0, 300)}`);
  }
  return body ? JSON.parse(body) : {};
}

async function getBroadcast({ apiKey, id }) {
  const res = await fetch(`https://api.resend.com/broadcasts/${id}`, {
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'user-agent': UA,
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`getBroadcast ${res.status}: ${body.slice(0, 300)}`);
  }
  return JSON.parse(body);
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    res.status(500).json({ ok: false, error: 'server misconfigured' });
    return;
  }

  const url = new URL(req.url, 'http://x');
  const dryRun = url.searchParams.get('dryRun') === '1';
  const draftOnly = url.searchParams.get('draft') === '1';
  const statusId = url.searchParams.get('status');

  if (statusId) {
    try {
      const b = await getBroadcast({ apiKey, id: statusId });
      res.status(200).json({ ok: true, mode: 'status', broadcastId: statusId, status: b.status, sent_at: b.sent_at, scheduled_at: b.scheduled_at });
    } catch (e) {
      res.status(502).json({ ok: false, error: String(e).slice(0, 300) });
    }
    return;
  }

  const recents = topRecentlyChecked(5);
  const deadlines = nextDeadlines(5);
  const generatedAt = new Date().toISOString();
  const subject = digestSubject(recents, deadlines);
  const html = renderHtml({ recents, deadlines, generatedAt });
  const text = renderText({ recents, deadlines, generatedAt });

  if (dryRun) {
    res.status(200).json({
      ok: true,
      mode: 'dryRun',
      subject,
      recents: recents.map((e) => ({ slug: e.slug, lastChecked: e.lastChecked, deadline: e.deadline })),
      deadlines,
      htmlBytes: html.length,
      textBytes: text.length,
      htmlSample: html.slice(0, 400),
    });
    return;
  }

  try {
    const created = await createBroadcast({ apiKey, audienceId, subject, html, text });
    if (draftOnly) {
      res.status(200).json({ ok: true, mode: 'draft', broadcastId: created.id, subject });
      return;
    }
    await sendBroadcast({ apiKey, id: created.id });
    // Best-effort status read — broadcast moves draft → queued → sending → sent.
    let final = null;
    try {
      final = await getBroadcast({ apiKey, id: created.id });
    } catch (e) {
      // Non-fatal — send was accepted.
      final = { id: created.id, status: 'unknown', getError: String(e).slice(0, 120) };
    }
    res.status(200).json({
      ok: true,
      mode: 'send',
      broadcastId: created.id,
      subject,
      status: final?.status || 'queued',
      sentAt: final?.sent_at || null,
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e).slice(0, 300) });
  }
}
