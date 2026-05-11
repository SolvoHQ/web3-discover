// GET /api/cron/sponsor-watch — autoresponder for inbound /sponsor reservations.
//
// Triggered hourly by Vercel Cron. Polls the agent inbox over IMAP for unread
// messages whose subject begins with "Reserve" (matches the mailto buttons on
// /sponsor), sends a Resend autoresponder back to the sender with an FAQ +
// ETA-to-go-live + payment-instructions placeholder, then marks the message
// \Seen so it never autoreplies twice.
//
// Authorization: same pattern as /api/cron/digest — Bearer ${CRON_SECRET} OR
// ?secret=... query param. Vercel Cron passes the bearer automatically.
//
// Modes:
//   - default                 IMAP poll → send autoresponses to new Reserve mails
//   - ?dryRun=1               render the autoresponder HTML/text and return as
//                             JSON; no IMAP, no Resend send
//   - ?fixture=<email>&tier=  send the autoresponder to <email> as if a Reserve
//                             mail had arrived; useful as a one-shot synthetic
//                             test (Resend has delivered@resend.dev for echo)

import tls from 'node:tls';

const SITE_URL = 'https://web3-discover.vercel.app';
const FROM = 'web3-discover <agent+sponsor@west0n.top>';
const REPLY_TO = 'agent+sponsor@west0n.top';
const UA = 'web3-discover-agent/1.0 (+https://web3-discover.vercel.app)';

const TIERS = {
  'featured slot':    { name: 'Featured slot',    price: '$400 / week',    sla: '48h after asset delivery' },
  'sidebar promo':    { name: 'Sidebar promo',    price: '$250 / week',    sla: '24h after asset delivery' },
  'sponsored guide':  { name: 'Sponsored guide',  price: '$800 flat (30-day window)', sla: '~7 days end-to-end (first draft in 4 working days)' },
};

function authorized(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const hdr = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof hdr === 'string' && hdr === `Bearer ${expected}`) return true;
  const url = new URL(req.url, 'http://x');
  if (url.searchParams.get('secret') === expected) return true;
  return false;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Try to extract a tier name from the subject (case-insensitive, prefix match).
// Falls back to "your reservation" if the subject doesn't match a known tier.
function detectTier(subject) {
  const s = String(subject || '').toLowerCase();
  for (const key of Object.keys(TIERS)) {
    if (s.includes(key)) return TIERS[key];
  }
  return null;
}

function autoresponseHtml({ tier, originalSubject }) {
  const tierBlock = tier
    ? `
      <p style="margin:0 0 10px;font-size:15px;line-height:1.55;">
        We received your reservation request for the
        <strong style="color:#c8531a;">${escapeHtml(tier.name)}</strong> tier
        (${escapeHtml(tier.price)}).
        <br/>Turnaround once we agree: <strong>${escapeHtml(tier.sla)}</strong>.
      </p>`
    : `
      <p style="margin:0 0 10px;font-size:15px;line-height:1.55;">
        We received your sponsorship reservation request. A human will review and
        reply within ~24 hours.
      </p>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f5ef;font-family:Georgia,serif;color:#222;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fdfbf6;border:1px solid #d9d4c4;">
    <tr><td style="padding:24px 28px 8px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#c8531a;">web3-discover · sponsorship</div>
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:6px 0 0;font-weight:700;">Got it — reviewing now.</h1>
      ${tierBlock}
    </td></tr>

    <tr><td style="padding:0 28px 4px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:6px;">What happens next</div>
      <ol style="margin:0 0 12px;padding-left:22px;font-size:14px;line-height:1.6;">
        <li>A human re-reads your brief within ~24 hours and replies from <code>agent+sponsor@west0n.top</code>.</li>
        <li>If we accept, you get an <strong>invoice + payment wallets</strong> in that reply (USDC / USDT on Ethereum, Solana, or Base — or USD by invoice).</li>
        <li>Once payment lands, slot goes live within the turnaround above. We send you the <strong>UTM-tracked link</strong> + a weekly GoatCounter click report.</li>
      </ol>
    </td></tr>

    <tr><td style="padding:0 28px 4px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:6px;">Payment placeholder</div>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.55;">
        We'll send concrete wallet addresses + invoice number in the human reply.
        For reference: <strong>50% upfront, 50% on go-live</strong>. We accept USDC, USDT, or USD bank invoice — your choice.
      </p>
    </td></tr>

    <tr><td style="padding:0 28px 4px;">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:6px;">FAQ</div>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.55;">
        <strong>Can we negotiate the rate?</strong> First sponsor on each tier locks the rate for 90 days. After that, rates reflect traffic numbers we publish on the <a href="${SITE_URL}/sponsor" style="color:#c8531a;">/sponsor</a> page.
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.55;">
        <strong>Do you ever change risk flags for money?</strong> No — see <a href="${SITE_URL}/disclosure" style="color:#c8531a;">/disclosure</a>. Verified means verified; suspect means suspect.
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.55;">
        <strong>Can we sponsor anonymously?</strong> No. Same identifying fields as organic listings — that's the disclosure standard.
      </p>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.55;">
        <strong>Asset spec?</strong> Send your logo (transparent PNG, 256+px), the copy you want, and your CTA URL. We'll write & format around it.
      </p>
    </td></tr>

    <tr><td style="padding:14px 28px 22px;border-top:1px solid #e7e2d2;">
      <p style="margin:0;font-size:11px;color:#888;font-family:ui-monospace,monospace;">
        This is an automated acknowledgement. A human follows up within ~24h.
        Original subject: <code>${escapeHtml(originalSubject)}</code>.
        Listings are informational, not financial advice.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function autoresponseText({ tier, originalSubject }) {
  const tierLine = tier
    ? `Tier requested: ${tier.name} (${tier.price}). Turnaround: ${tier.sla}.`
    : `Sponsorship reservation received.`;
  return [
    `Got it — reviewing now.`,
    ``,
    tierLine,
    ``,
    `What happens next:`,
    `  1. A human re-reads your brief within ~24 hours and replies from agent+sponsor@west0n.top.`,
    `  2. If we accept, you get an invoice + payment wallets in that reply.`,
    `  3. Once payment lands, slot goes live within the turnaround above.`,
    ``,
    `Payment: 50% upfront, 50% on go-live. USDC / USDT on Ethereum, Solana, or Base — or USD by invoice.`,
    ``,
    `FAQ:`,
    `  - Negotiate rate? First sponsor on each tier locks the rate for 90 days.`,
    `  - Change risk flags for money? Never. See ${SITE_URL}/disclosure.`,
    `  - Sponsor anonymously? No — same identifying fields as organic listings.`,
    `  - Asset spec? Logo (transparent PNG 256+px), copy, CTA URL.`,
    ``,
    `Tiers: ${SITE_URL}/sponsor`,
    ``,
    `Automated acknowledgement. Original subject: ${originalSubject}`,
  ].join('\n');
}

async function sendAutoresponder({ apiKey, to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject,
      html,
      text,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`sendAutoresponder ${res.status}: ${body.slice(0, 300)}`);
  }
  try { return JSON.parse(body); } catch { return {}; }
}

// Minimal IMAP-over-TLS client tuned for one job: find UNSEEN Reserve* mails,
// read From + Subject headers, mark each \Seen. ~80 lines of plain Node tls.
//
// Why not pull in imapflow/node-imap: extra dep, larger cold-start. Our needs
// are tiny and well-defined; raw IMAP is one weekend of RFC 3501 reading.
async function imapFindReserveMails({ host, port, user, pass, folder = 'INBOX' }) {
  const socket = tls.connect({ host, port, servername: host });
  let buf = '';
  let tagN = 0;
  const newTag = () => `A${++tagN}`;

  function nextLine() {
    return new Promise((resolve, reject) => {
      const tryParse = () => {
        const idx = buf.indexOf('\r\n');
        if (idx >= 0) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          cleanup();
          resolve(line);
          return true;
        }
        return false;
      };
      const onData = (chunk) => {
        buf += chunk.toString('binary');
        tryParse();
      };
      const onEnd = () => { cleanup(); reject(new Error('socket closed')); };
      const onErr = (e) => { cleanup(); reject(e); };
      const cleanup = () => {
        socket.off('data', onData);
        socket.off('end', onEnd);
        socket.off('error', onErr);
      };
      if (tryParse()) return;
      socket.on('data', onData);
      socket.on('end', onEnd);
      socket.on('error', onErr);
    });
  }

  // Read until we see `${tag} OK/NO/BAD ...`; collect untagged lines along the way.
  async function runCmd(tag, cmd) {
    socket.write(`${tag} ${cmd}\r\n`);
    const untagged = [];
    while (true) {
      const line = await nextLine();
      if (line.startsWith(`${tag} `)) {
        const status = line.slice(tag.length + 1).split(' ')[0];
        return { status, untagged, finalLine: line };
      }
      untagged.push(line);
    }
  }

  // Read a server greeting before issuing commands.
  await nextLine();

  try {
    // LOGIN — quote user/pass to allow special chars (no embedded "/\\).
    const t1 = newTag();
    const r1 = await runCmd(t1, `LOGIN "${user}" "${pass}"`);
    if (r1.status !== 'OK') throw new Error(`LOGIN failed: ${r1.finalLine}`);

    const t2 = newTag();
    const r2 = await runCmd(t2, `SELECT "${folder}"`);
    if (r2.status !== 'OK') throw new Error(`SELECT failed: ${r2.finalLine}`);

    // Find candidates. Match either subject prefix "Reserve" (mailto link) OR
    // the "Reserve <Tier>" pattern. SUBJECT search is substring on Gmail.
    const t3 = newTag();
    const r3 = await runCmd(t3, `UID SEARCH UNSEEN SUBJECT "Reserve"`);
    if (r3.status !== 'OK') throw new Error(`SEARCH failed: ${r3.finalLine}`);
    const searchLine = r3.untagged.find((l) => l.startsWith('* SEARCH')) || '* SEARCH';
    const uids = searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean);

    const results = [];
    for (const uid of uids) {
      const t = newTag();
      // BODY.PEEK doesn't auto-set \Seen.
      const r = await runCmd(t, `UID FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)])`);
      if (r.status !== 'OK') continue;
      const headerBlob = r.untagged.join('\r\n');
      // Pull From + Subject. Headers might be on continuation lines (RFC 5322
      // folding) — collapse leading whitespace continuations conservatively.
      const unfolded = headerBlob.replace(/\r\n[ \t]+/g, ' ');
      const fromMatch = unfolded.match(/^From:\s*(.+)$/im);
      const subjMatch = unfolded.match(/^Subject:\s*(.+)$/im);
      const from = fromMatch ? fromMatch[1].trim() : '';
      const subject = subjMatch ? subjMatch[1].trim() : '';
      results.push({ uid, from, subject });
    }

    return { socket, runCmd, newTag, results };
  } catch (e) {
    try { socket.end(); } catch {}
    throw e;
  }
}

// Extract bare email from "Name <addr@host>" or "addr@host". Returns null
// if no plausible email is found.
function extractEmail(fromHeader) {
  if (!fromHeader) return null;
  const angle = fromHeader.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : fromHeader).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) ? addr.toLowerCase() : null;
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: 'server misconfigured (RESEND_API_KEY missing)' });
    return;
  }

  const url = new URL(req.url, 'http://x');
  const dryRun = url.searchParams.get('dryRun') === '1';
  const fixtureEmail = url.searchParams.get('fixture');
  const fixtureTierKey = (url.searchParams.get('tier') || 'Featured slot').toLowerCase();

  // dryRun: render template only, no IMAP, no send.
  if (dryRun) {
    const tier = detectTier(`Reserve ${fixtureTierKey}`) || TIERS['featured slot'];
    const originalSubject = `Reserve ${tier.name}`;
    const html = autoresponseHtml({ tier, originalSubject });
    const text = autoresponseText({ tier, originalSubject });
    res.status(200).json({
      ok: true,
      mode: 'dryRun',
      tier: tier.name,
      htmlBytes: html.length,
      textBytes: text.length,
      htmlSample: html.slice(0, 400),
      textSample: text.slice(0, 400),
    });
    return;
  }

  // Fixture: actually send the autoresponder to a chosen address (use
  // delivered@resend.dev for a no-side-effect test).
  if (fixtureEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fixtureEmail)) {
      res.status(400).json({ ok: false, error: 'invalid fixture email' });
      return;
    }
    const tier = detectTier(`Reserve ${fixtureTierKey}`) || TIERS['featured slot'];
    const originalSubject = `Reserve ${tier.name}`;
    const html = autoresponseHtml({ tier, originalSubject });
    const text = autoresponseText({ tier, originalSubject });
    try {
      const sent = await sendAutoresponder({
        apiKey,
        to: fixtureEmail,
        subject: `Re: ${originalSubject} — we got it`,
        html,
        text,
      });
      res.status(200).json({ ok: true, mode: 'fixture', to: fixtureEmail, tier: tier.name, resendId: sent.id || null });
    } catch (e) {
      res.status(502).json({ ok: false, mode: 'fixture', error: String(e).slice(0, 300) });
    }
    return;
  }

  // Production: IMAP poll + autoresponder send + mark \Seen.
  const imapHost = process.env.AGENT_EMAIL_IMAP_HOST;
  const imapPort = Number(process.env.AGENT_EMAIL_IMAP_PORT || 993);
  const imapUser = process.env.AGENT_EMAIL_IMAP_USERNAME;
  const imapPass = process.env.AGENT_EMAIL_IMAP_APP_PASSWORD;
  const imapFolder = process.env.AGENT_EMAIL_IMAP_FOLDER || 'INBOX';
  if (!imapHost || !imapUser || !imapPass) {
    res.status(500).json({ ok: false, error: 'server misconfigured (AGENT_EMAIL_IMAP_* missing)' });
    return;
  }

  let session;
  try {
    session = await imapFindReserveMails({
      host: imapHost, port: imapPort, user: imapUser, pass: imapPass, folder: imapFolder,
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'imap failed: ' + String(e).slice(0, 300) });
    return;
  }

  const { socket, runCmd, newTag, results } = session;
  const processed = [];
  const errors = [];

  for (const m of results) {
    const to = extractEmail(m.from);
    if (!to) { errors.push({ uid: m.uid, error: 'no parseable From' }); continue; }
    // Don't autoreply to ourselves — guards against loops.
    if (to === (imapUser || '').toLowerCase() || to.endsWith('@west0n.top')) {
      errors.push({ uid: m.uid, to, error: 'skipped (self/agent address)' });
      // Still mark Seen so we don't keep evaluating it.
      try { await runCmd(newTag(), `UID STORE ${m.uid} +FLAGS (\\Seen)`); } catch {}
      continue;
    }

    const tier = detectTier(m.subject);
    const originalSubject = m.subject || `Reserve`;
    const html = autoresponseHtml({ tier, originalSubject });
    const text = autoresponseText({ tier, originalSubject });

    try {
      const sent = await sendAutoresponder({
        apiKey,
        to,
        subject: `Re: ${originalSubject} — we got it`,
        html,
        text,
      });
      await runCmd(newTag(), `UID STORE ${m.uid} +FLAGS (\\Seen)`);
      processed.push({ uid: m.uid, to, tier: tier?.name || null, resendId: sent.id || null });
    } catch (e) {
      errors.push({ uid: m.uid, to, error: String(e).slice(0, 200) });
    }
  }

  try { await runCmd(newTag(), 'LOGOUT'); } catch {}
  try { socket.end(); } catch {}

  res.status(200).json({
    ok: true,
    mode: 'poll',
    candidates: results.length,
    processed,
    errors,
  });
}
