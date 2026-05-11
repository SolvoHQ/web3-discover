// POST /api/subscribe — captures an email into the Resend audience
// (RESEND_AUDIENCE_ID) and fires a welcome email featuring the 3
// deadline-soonest airdrops from the snapshot. Free list only.
//
// Storage choice: Resend Audiences (no DB; vendor handles dedup; unsubscribed
// flag is first-class). See product/thoughts/<this-tick>-newsletter-signup-shipped.md.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHmac } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = JSON.parse(readFileSync(resolve(__dirname, '_airdrops.json'), 'utf-8'));

const SITE_URL = 'https://web3-discover.vercel.app';
const FROM = 'web3-discover <agent@west0n.top>';
const REPLY_TO = 'agent@west0n.top';
const UA = 'web3-discover-agent/1.0 (+https://web3-discover.vercel.app)';

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) && s.length < 254;
}

function unsubToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET || '';
  return createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 16);
}

function pickTopDeadlines(n = 3) {
  // Snapshot is pre-sorted by deadline ascending (then project). Prefer
  // entries with a real YYYY-MM-DD deadline >= today; fall back to ongoing
  // if fewer than n dated entries are available.
  const today = new Date().toISOString().slice(0, 10);
  const dated = SNAPSHOT.entries.filter((e) =>
    /^\d{4}-\d{2}-\d{2}$/.test(e.deadline || '') && e.deadline >= today,
  );
  const ongoing = SNAPSHOT.entries.filter((e) => !/^\d{4}-\d{2}-\d{2}$/.test(e.deadline || ''));
  return [...dated, ...ongoing].slice(0, n);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function welcomeHtml(email, picks, unsubUrl) {
  const rows = picks
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
              deadline: <strong>${escapeHtml(e.deadline)}</strong>
              · effort: ${escapeHtml(e.effort || '—')}
              · risk: <span style="color:${e.risk === 'verified' ? '#2e8a3f' : '#a8741a'};">${escapeHtml(e.risk)}</span>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f5ef;font-family:Georgia,serif;color:#222;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fdfbf6;border:1px solid #d9d4c4;">
    <tr><td style="padding:24px 28px 8px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#c8531a;">web3-discover</div>
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:6px 0 0;font-weight:700;">You're in.</h1>
      <p style="margin:10px 0 0;font-size:15px;line-height:1.55;">
        Thanks for subscribing. You'll get the next freshness sweep — vetted, scam-filtered, no hype.
        Here are the 3 airdrops closest to a deadline right now:
      </p>
    </td></tr>
    <tr><td style="padding:0 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${rows}
      </table>
    </td></tr>
    <tr><td style="padding:18px 28px 22px;">
      <p style="margin:0 0 12px;font-size:14px;line-height:1.55;">
        Want all deadlines in your calendar?
        <a href="${SITE_URL}/tools/calendar" style="color:#c8531a;">Subscribe the iCal feed</a> —
        works in Google Calendar, Apple Calendar, Outlook.
      </p>
      <p style="margin:0;font-size:13px;color:#555;">
        Browse the full directory: <a href="${SITE_URL}/airdrops" style="color:#c8531a;">${SITE_URL}/airdrops</a>
      </p>
    </td></tr>
    <tr><td style="padding:14px 28px 22px;border-top:1px solid #e7e2d2;">
      <p style="margin:0;font-size:11px;color:#888;font-family:ui-monospace,monospace;">
        Sent to ${escapeHtml(email)}. <a href="${unsubUrl}" style="color:#888;">Unsubscribe</a> in one click.
        Listings are informational, not financial advice.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function welcomeText(email, picks, unsubUrl) {
  const lines = picks.map(
    (e) =>
      `• ${e.project} (${e.chain}) — deadline ${e.deadline}, effort ${e.effort || '—'}, risk ${e.risk}\n  ${SITE_URL}/airdrops/${e.slug}`,
  );
  return [
    `You're in.`,
    ``,
    `Thanks for subscribing to web3-discover. The 3 airdrops closest to a deadline right now:`,
    ``,
    ...lines,
    ``,
    `Full directory: ${SITE_URL}/airdrops`,
    `Calendar feed:  ${SITE_URL}/tools/calendar`,
    ``,
    `Sent to ${email}. Unsubscribe in one click: ${unsubUrl}`,
  ].join('\n');
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { /* fall through */ }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  // form-urlencoded fallback
  const out = {};
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed; POST email' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    res.status(500).json({ ok: false, error: 'server misconfigured' });
    return;
  }

  let body;
  try { body = await parseBody(req); } catch { body = {}; }
  const email = (body.email || '').toString().trim().toLowerCase();
  const chainPref = (body.chain || '').toString().trim().slice(0, 64) || null;

  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, error: 'invalid email' });
    return;
  }

  // 1. Add to Resend audience (idempotent — duplicate returns 200 in our trials).
  const contactRes = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'user-agent': UA,
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        first_name: chainPref ? `pref:${chainPref}` : undefined,
      }),
    },
  );
  if (!contactRes.ok) {
    const text = await contactRes.text();
    res.status(502).json({ ok: false, error: 'audience write failed', detail: text.slice(0, 200) });
    return;
  }

  // 2. Build welcome email.
  const picks = pickTopDeadlines(3);
  const unsubUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
  const html = welcomeHtml(email, picks, unsubUrl);
  const text = welcomeText(email, picks, unsubUrl);

  // 3. Send via Resend.
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      reply_to: REPLY_TO,
      subject: "You're in — 3 airdrops closest to a deadline",
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    res.status(502).json({ ok: false, error: 'send failed', detail: errText.slice(0, 200) });
    return;
  }
  const sendJson = await sendRes.json().catch(() => ({}));

  res.status(200).json({
    ok: true,
    email,
    welcomeMessageId: sendJson.id || null,
    deadlinesPreviewed: picks.length,
  });
}
