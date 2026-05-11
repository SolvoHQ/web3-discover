// GET /api/unsubscribe?email=<addr>&t=<token>
// One-click unsubscribe. Token is HMAC-SHA256(email, UNSUBSCRIBE_SECRET)[:16].
// Without the token a malicious actor could iterate any address list, so the
// HMAC gate is the minimum bar; the surface is otherwise read-only / public.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SITE_URL = 'https://web3-discover.vercel.app';
const UA = 'web3-discover-agent/1.0 (+https://web3-discover.vercel.app)';

function expectedToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET || '';
  return createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 16);
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

function pageHtml(state, email) {
  const safeEmail = String(email || '').replace(/[<>"]/g, '');
  const heading = state === 'ok'
    ? 'Unsubscribed.'
    : state === 'bad-token'
      ? 'Invalid unsubscribe link.'
      : 'Unsubscribe failed.';
  const body = state === 'ok'
    ? `<p><code>${safeEmail}</code> is now unsubscribed. You won't receive further emails from web3-discover.</p>
       <p>Changed your mind? <a href="${SITE_URL}/subscribe">Resubscribe</a>.</p>`
    : state === 'bad-token'
      ? `<p>The token in this URL doesn't match. The link may have been mangled in transit.</p>
         <p>Email <a href="mailto:agent@west0n.top">agent@west0n.top</a> and we'll remove you manually.</p>`
      : `<p>Something went wrong on our end. Email <a href="mailto:agent@west0n.top">agent@west0n.top</a> and we'll remove you manually.</p>`;
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" />
  <title>Unsubscribe — web3-discover</title>
  <meta name="robots" content="noindex,follow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: Georgia, serif; max-width: 540px; margin: 6vh auto; padding: 0 1.25rem; color: #222; background: #f7f5ef; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #c8531a; }
    code { font-family: ui-monospace, monospace; font-size: 0.95em; background: #eee; padding: 0 0.3em; border-radius: 3px; }
    p { line-height: 1.5; }
    a { color: #c8531a; }
  </style>
</head><body>
  <h1>${heading}</h1>
  ${body}
  <p style="margin-top:2rem;"><a href="${SITE_URL}/">← back to web3-discover</a></p>
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('content-type', 'text/html; charset=utf-8');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).send(pageHtml('error', ''));
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host || 'web3-discover.vercel.app'}`);
  const email = (url.searchParams.get('email') || '').toLowerCase().trim();
  const token = (url.searchParams.get('t') || '').trim();
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!email || !token || !apiKey || !audienceId) {
    res.status(400).send(pageHtml('bad-token', email));
    return;
  }
  if (!safeEqual(token, expectedToken(email))) {
    res.status(400).send(pageHtml('bad-token', email));
    return;
  }

  const patchRes = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'user-agent': UA,
      },
      body: JSON.stringify({ unsubscribed: true }),
    },
  );

  // Resend returns 200 even if the contact doesn't exist in the audience —
  // treat any 2xx as success for the user-facing flow.
  if (!patchRes.ok) {
    res.status(502).send(pageHtml('error', email));
    return;
  }
  res.status(200).send(pageHtml('ok', email));
}
