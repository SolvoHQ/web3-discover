// /v/<hash> — public, shareable, server-rendered eligibility verdict page.
//
// Hash format: <evm> | <sol> | <evm>~<sol>
//   - EVM detected by /^0x[0-9a-fA-F]{40}$/
//   - Solana detected by /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
//   - Both → separated by `~`
//
// The hash is deterministic: same wallet(s) → same URL → same verdict, edge-cacheable.
// No DB. Verdict is re-derived per visit from publicnode RPCs, then cached at the
// Vercel CDN for 24h (stale-while-revalidate 7d) so subsequent visitors hit cache.

import { evaluateWallet, EVM_RX, SOL_RX } from './_eligibility-eval.mjs';

const SITE_URL = process.env.SITE_URL || 'https://web3-discover.vercel.app';

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function shortAddr(a) {
  if (!a) return '';
  return a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-6) : a;
}

function parseHash(raw) {
  if (!raw) return null;
  const decoded = decodeURIComponent(String(raw).trim());
  const parts = decoded.split('~').map((p) => p.trim()).filter(Boolean);
  let evm = '';
  let sol = '';
  for (const p of parts) {
    if (!evm && EVM_RX.test(p)) evm = p;
    else if (!sol && SOL_RX.test(p)) sol = p;
  }
  if (!evm && !sol) return null;
  return { evm, sol };
}

function canonHash({ evm, sol }) {
  return [evm, sol].filter(Boolean).join('~');
}

function renderCard(entry, bucket) {
  const utm = '?utm_source=share&utm_medium=v-page&utm_campaign=' + encodeURIComponent(bucket);
  const internal = '/airdrops/' + encodeURIComponent(entry.slug) + utm;
  const officialClass = bucket === 'eligible' ? 'el-card-action' : 'el-card-action-soft';
  const actionLabel = bucket === 'eligible' ? 'Act → ' : 'Official site → ';
  return (
    '<article class="el-card el-card-' + bucket + '">' +
      '<header class="el-card-head">' +
        '<a href="' + internal + '" class="el-card-project">' + escHtml(entry.project) + '</a>' +
        '<span class="tag risk-' + escHtml(entry.risk) + '">' + escHtml(entry.risk) + '</span>' +
      '</header>' +
      '<p class="el-card-meta">' +
        escHtml(entry.chain) + ' · effort ' + escHtml(entry.effort) +
        ' · cost ' + escHtml(entry.costFloor) +
        ' · deadline <span class="mono">' + escHtml(entry.deadline) + '</span>' +
      '</p>' +
      (entry.verdictDetail
        ? '<p class="el-card-verdict">' + escHtml(entry.verdictDetail) + '</p>'
        : '') +
      '<div class="el-card-actions">' +
        '<a class="' + officialClass + '" href="' + escHtml(entry.officialUrl) + '" rel="nofollow noopener" target="_blank">' +
          actionLabel +
        '</a>' +
        '<a class="el-card-readmore" href="' + internal + '">Read on web3-discover →</a>' +
      '</div>' +
    '</article>'
  );
}

function renderManualRow(entry) {
  const reasonLabel =
    entry.reason === 'own-l1-no-cors-rpc' ? 'own L1/L2 — RPC not browser-reachable' :
    entry.reason === 'off-chain-criteria' ? 'off-chain criteria (KYC / points / X)' :
    entry.reason === 'multi-chain-too-loose' ? 'multi-chain — too loose to auto-evaluate' :
    'no machine-checkable rule';
  const internal = '/airdrops/' + encodeURIComponent(entry.slug) + '?utm_source=share&utm_medium=v-page&utm_campaign=manual';
  return (
    '<li class="el-manual-item">' +
      '<a href="' + internal + '">' + escHtml(entry.project) + '</a>' +
      ' <span class="el-manual-chain mono">' + escHtml(entry.chain) + '</span>' +
      ' <span class="el-manual-reason">' + escHtml(reasonLabel) + '</span>' +
    '</li>'
  );
}

function renderSkipRow(entry) {
  const internal = '/airdrops/' + encodeURIComponent(entry.slug) + '?utm_source=share&utm_medium=v-page&utm_campaign=skip';
  return (
    '<li class="el-manual-item">' +
      '<a href="' + internal + '">' + escHtml(entry.project) + '</a>' +
      ' <span class="el-manual-chain mono">' + escHtml(entry.chain) + '</span>' +
      ' <span class="el-manual-reason">' + escHtml(entry.verdictDetail || '') + '</span>' +
    '</li>'
  );
}

function renderHtml({ verdict, evm, sol, hash, canonUrl, ogImageUrl }) {
  const labelAddr = evm ? shortAddr(evm) : shortAddr(sol);
  const pageTitle = labelAddr + ' → ' + verdict.counts.eligible + ' airdrops eligible · web3-discover';
  const pageDesc = `Wallet ${shortAddr(evm || sol)} qualifies for ${verdict.counts.eligible} of ${verdict.rulesEvaluated} airdrops auto-checked across ${verdict.totalTracked} curated entries. Check your own wallet at /tools/eligibility.`;
  const inputLine = [];
  if (evm) inputLine.push('<strong>EVM</strong> <code>' + escHtml(shortAddr(evm)) + '</code>');
  if (sol) inputLine.push('<strong>SOL</strong> <code>' + escHtml(shortAddr(sol)) + '</code>');

  let cardsHtml = '';
  if (verdict.eligible.length > 0) {
    cardsHtml += '<section class="el-bucket-block"><h2 class="el-bucket-head">✅ Act on these — ' + verdict.eligible.length + '</h2>';
    cardsHtml += '<div class="el-grid">';
    for (const e of verdict.eligible) cardsHtml += renderCard(e, 'eligible');
    cardsHtml += '</div></section>';
  }
  if (verdict.partial.length > 0) {
    cardsHtml += '<section class="el-bucket-block"><h2 class="el-bucket-head">🟡 Keep farming — ' + verdict.partial.length + '</h2>';
    cardsHtml += '<p class="el-bucket-note">Started but below the heuristic threshold. Worth more cycles before TGE.</p>';
    cardsHtml += '<div class="el-grid">';
    for (const e of verdict.partial) cardsHtml += renderCard(e, 'partial');
    cardsHtml += '</div></section>';
  }
  if (verdict.manual.length > 0) {
    cardsHtml += '<section class="el-bucket-block"><h2 class="el-bucket-head">🔍 Manual check — ' + verdict.manual.length + '</h2>';
    cardsHtml += '<p class="el-bucket-note">Own L1/L2 (no browser-reachable RPC) or off-chain criteria. Review each manually.</p>';
    cardsHtml += '<ul class="el-manual-list">';
    for (const e of verdict.manual) cardsHtml += renderManualRow(e);
    cardsHtml += '</ul></section>';
  }
  if (verdict.skip.length > 0) {
    cardsHtml += '<details class="el-bucket-collapsed"><summary class="el-bucket-head">⏭ Not relevant — ' + verdict.skip.length + ' (click to expand)</summary>';
    cardsHtml += '<p class="el-bucket-note">Rules failed. Likely safe to skip for this wallet.</p>';
    cardsHtml += '<ul class="el-manual-list">';
    for (const e of verdict.skip) cardsHtml += renderSkipRow(e);
    cardsHtml += '</ul></details>';
  }
  if (verdict.unavailable.length > 0) {
    cardsHtml += '<p class="el-errored">' + verdict.unavailable.length + ' rule' + (verdict.unavailable.length === 1 ? '' : 's') + ' could not be evaluated (RPC error or rate limit). The verdict here uses a cached evaluation — reload to retry.</p>';
  }

  const shareText = labelAddr + ' qualifies for ' + verdict.counts.eligible + ' of ' + verdict.rulesEvaluated + ' airdrops via web3-discover.';
  const twitterIntent = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(canonUrl);
  const telegramIntent = 'https://t.me/share/url?url=' + encodeURIComponent(canonUrl) + '&text=' + encodeURIComponent(shareText);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escHtml(pageTitle)}</title>
<meta name="description" content="${escHtml(pageDesc)}" />
<link rel="canonical" href="${escHtml(canonUrl)}" />

<meta property="og:type" content="website" />
<meta property="og:title" content="${escHtml(pageTitle)}" />
<meta property="og:description" content="${escHtml(pageDesc)}" />
<meta property="og:image" content="${escHtml(ogImageUrl)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${escHtml(canonUrl)}" />
<meta property="og:site_name" content="web3-discover" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escHtml(pageTitle)}" />
<meta name="twitter:description" content="${escHtml(pageDesc)}" />
<meta name="twitter:image" content="${escHtml(ogImageUrl)}" />

<meta name="robots" content="noindex,follow" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="stylesheet" href="/style.css" />
<style>
  :root {
    --ink: #222;
    --ink-soft: #555;
    --paper: #fdfbf6;
    --rule: #d9d4c4;
    --accent: #c8531a;
    --warn: #a8741a;
    --font-serif: Georgia, 'Times New Roman', serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    line-height: 1.5;
  }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; }
  .siteheader {
    border-bottom: 1px solid var(--rule);
    background: #fff;
    padding: 0.75rem 0;
  }
  .siteheader-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .siteheader a.brand {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 1.15rem;
    color: var(--ink);
    text-decoration: none;
  }
  .siteheader nav a {
    color: var(--ink-soft);
    text-decoration: none;
    margin-left: 1rem;
    font-size: 0.9rem;
  }
  .siteheader nav a:hover { color: var(--accent); }
  .hero { padding: 2rem 0 1.5rem; border-bottom: 1px solid var(--rule); background: #fff; }
  .kicker {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 0.4rem;
  }
  .hero h1 {
    margin: 0 0 0.5rem;
    font-family: var(--font-serif);
    font-size: 1.85rem;
    line-height: 1.15;
  }
  .hero .lede { margin: 0; color: var(--ink-soft); font-size: 1rem; }
  .section { padding: 1.5rem 0 3rem; }
  .el-status {
    padding: 0.85rem 1rem;
    background: #fff;
    border: 1px solid var(--rule);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }
  .el-cta {
    margin: 1rem 0 1.5rem;
    padding: 1.1rem 1.2rem;
    background: #fff;
    border: 1px solid var(--rule);
    border-left: 4px solid var(--accent);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .el-cta-text { font-family: var(--font-serif); font-size: 1.1rem; }
  .el-cta-btn {
    padding: 0.6rem 1.1rem;
    background: var(--accent);
    color: #fff;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 600;
  }
  .el-cta-btn:hover { background: var(--warn); }
  .el-summary { margin-bottom: 1.25rem; }
  .el-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.85rem;
  }
  .el-summary-bucket {
    padding: 0.85rem 1rem;
    background: #fff;
    border: 1px solid var(--rule);
    border-radius: 4px;
    text-align: center;
  }
  .el-summary-eligible { border-left: 4px solid #2e8540; }
  .el-summary-partial { border-left: 4px solid var(--accent); }
  .el-summary-skip { border-left: 4px solid #999; }
  .el-summary-manual { border-left: 4px solid #4060a8; }
  .el-summary-num {
    font-family: var(--font-serif);
    font-size: 1.85rem;
    font-weight: 700;
    line-height: 1;
  }
  .el-summary-lbl {
    font-size: 0.82rem;
    color: var(--ink-soft);
    margin-top: 0.3rem;
  }
  .el-share {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .el-share-input {
    flex: 1 1 360px;
    min-width: 0;
    padding: 0.55rem 0.75rem;
    font-size: 0.86rem;
    font-family: var(--font-mono);
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: #fff;
    box-sizing: border-box;
  }
  .el-share-btn {
    padding: 0.55rem 0.95rem;
    font-size: 0.86rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    font-weight: 600;
  }
  .el-share-x { background: #000; }
  .el-share-tg { background: #2ca5e0; }
  .el-bucket-block { margin: 1.75rem 0 0; }
  .el-bucket-head {
    font-family: var(--font-serif);
    font-size: 1.3rem;
    margin: 0 0 0.5rem;
  }
  .el-bucket-note {
    margin: 0 0 0.85rem;
    font-size: 0.88rem;
    color: var(--ink-soft);
    font-style: italic;
  }
  .el-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.85rem;
  }
  .el-card {
    padding: 0.95rem 1rem;
    background: #fff;
    border: 1px solid var(--rule);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
  }
  .el-card-eligible { border-left: 4px solid #2e8540; }
  .el-card-partial { border-left: 4px solid var(--accent); background: #fffaf0; }
  .el-card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .el-card-project {
    font-weight: 700;
    font-size: 1.05rem;
    text-decoration: none;
    color: var(--ink);
  }
  .el-card-meta {
    margin: 0 0 0.5rem;
    font-size: 0.82rem;
    color: var(--ink-soft);
  }
  .el-card-verdict {
    margin: 0 0 0.7rem;
    padding: 0.5rem 0.65rem;
    background: rgba(46, 133, 64, 0.08);
    border-left: 2px solid #2e8540;
    font-size: 0.88rem;
    border-radius: 2px;
  }
  .el-card-partial .el-card-verdict {
    background: rgba(200, 83, 26, 0.08);
    border-left-color: var(--accent);
  }
  .el-card-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: auto;
  }
  .el-card-action, .el-card-action-soft, .el-card-readmore {
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    border-radius: 3px;
  }
  .el-card-action { background: var(--accent); color: #fff; }
  .el-card-action-soft { background: #fff; color: var(--accent); border: 1px solid var(--accent); }
  .el-card-readmore { color: var(--accent); }
  .el-manual-list { list-style: none; padding: 0; margin: 0; }
  .el-manual-item {
    padding: 0.55rem 0;
    border-bottom: 1px dashed var(--rule);
    font-size: 0.92rem;
  }
  .el-manual-item:last-child { border-bottom: none; }
  .el-manual-chain { margin-left: 0.4rem; font-size: 0.82rem; color: var(--ink-soft); }
  .el-manual-reason { margin-left: 0.4rem; font-size: 0.82rem; color: var(--ink-soft); font-style: italic; }
  .el-bucket-collapsed {
    margin: 1.75rem 0 0;
    padding: 0.85rem 1rem;
    background: #fff;
    border: 1px solid var(--rule);
    border-radius: 4px;
  }
  .el-bucket-collapsed summary { cursor: pointer; font-weight: 600; }
  .el-errored {
    margin-top: 1rem;
    padding: 0.7rem 0.9rem;
    background: rgba(200, 83, 26, 0.08);
    border-left: 3px solid var(--warn);
    font-size: 0.88rem;
    border-radius: 3px;
  }
  .tag {
    display: inline-block;
    padding: 0.15rem 0.45rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-radius: 2px;
    background: #eee;
    color: var(--ink-soft);
  }
  .tag.risk-verified { background: #d4edda; color: #155724; }
  .tag.risk-unverified { background: #fff3cd; color: #856404; }
  .mono { font-family: var(--font-mono); }
  .sitefoot {
    border-top: 1px solid var(--rule);
    padding: 1.5rem 0;
    color: var(--ink-soft);
    font-size: 0.85rem;
    background: #fff;
  }
  .sitefoot a { color: var(--accent); }
</style>
</head>
<body>
<header class="siteheader">
  <div class="container siteheader-inner">
    <a class="brand" href="/">web3-discover</a>
    <nav>
      <a href="/airdrops">Airdrops</a>
      <a href="/tools/eligibility">Check your wallet</a>
      <a href="/subscribe">Subscribe</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="container">
    <div class="kicker">Shared verdict · ${escHtml(verdict.rulesEvaluated)} on-chain rules</div>
    <h1>${escHtml(labelAddr)} qualifies for ${verdict.counts.eligible} airdrops</h1>
    <p class="lede">
      Auto-checked across <strong>${verdict.totalTracked}</strong> curated airdrops by
      web3-discover. ${verdict.counts.partial} more in "keep farming",
      ${verdict.counts.manual} need manual review (off-chain or RPC-gated),
      ${verdict.counts.skip} not relevant.
    </p>
  </div>
</section>

<section class="section">
  <div class="container">

    <div class="el-cta">
      <div class="el-cta-text">
        <strong>Want a verdict for your own wallet?</strong> Paste an EVM and/or Solana address — read-only, no signature, no signup.
      </div>
      <a class="el-cta-btn" href="/tools/eligibility?utm_source=share&utm_medium=v-page&utm_campaign=cta">Check YOUR wallet →</a>
    </div>

    <div class="el-status">
      Checked <strong>${verdict.rulesEvaluated}</strong> rules against <strong>${verdict.totalTracked}</strong> airdrops for ${inputLine.join(' + ')}.
    </div>

    <div class="el-summary">
      <div class="el-summary-grid">
        <div class="el-summary-bucket el-summary-eligible">
          <div class="el-summary-num">${verdict.counts.eligible}</div>
          <div class="el-summary-lbl">✅ Likely eligible</div>
        </div>
        <div class="el-summary-bucket el-summary-partial">
          <div class="el-summary-num">${verdict.counts.partial}</div>
          <div class="el-summary-lbl">🟡 Keep farming</div>
        </div>
        <div class="el-summary-bucket el-summary-skip">
          <div class="el-summary-num">${verdict.counts.skip}</div>
          <div class="el-summary-lbl">⏭ Not relevant</div>
        </div>
        <div class="el-summary-bucket el-summary-manual">
          <div class="el-summary-num">${verdict.counts.manual}</div>
          <div class="el-summary-lbl">🔍 Manual check</div>
        </div>
      </div>
      <div class="el-share">
        <input class="el-share-input mono" id="el-share-text" readonly value="${escHtml(canonUrl)}" />
        <a class="el-share-btn el-share-x" href="${escHtml(twitterIntent)}" target="_blank" rel="noopener">Share on X</a>
        <a class="el-share-btn el-share-tg" href="${escHtml(telegramIntent)}" target="_blank" rel="noopener">Share on Telegram</a>
      </div>
    </div>

    ${cardsHtml}

    <div class="el-cta" style="margin-top:2rem">
      <div class="el-cta-text">
        Different wallet? Different answer. Run the same check on yours →
      </div>
      <a class="el-cta-btn" href="/tools/eligibility?utm_source=share&utm_medium=v-page&utm_campaign=cta-bottom">Check YOUR wallet →</a>
    </div>

  </div>
</section>

<footer class="sitefoot">
  <div class="container">
    Verdict shared from <a href="/tools/eligibility">web3-discover · /tools/eligibility</a>.
    Loose on-chain proxies, not authoritative eligibility — always verify on the project page before acting.
  </div>
</footer>

<script defer src="//gc.zgo.at/count.js" data-goatcounter="https://web3discover.goatcounter.com/count"></script>
</body>
</html>`;
}

function renderError(status, message) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(message)}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:600px;margin:4rem auto;padding:0 1.25rem;color:#222;line-height:1.5}a{color:#c8531a}</style>
</head><body>
<h1>${escHtml(message)}</h1>
<p>This share link doesn't decode to a valid wallet. <a href="/tools/eligibility">Check your own wallet →</a></p>
</body></html>`;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const rawHash = url.searchParams.get('h') || '';
    const parsed = parseHash(rawHash);
    if (!parsed) {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(renderError(404, 'Invalid share link'));
      return;
    }

    const hash = canonHash(parsed);
    const canonUrl = SITE_URL + '/v/' + encodeURIComponent(hash);

    let verdict;
    try {
      verdict = await evaluateWallet({ evm: parsed.evm, sol: parsed.sol });
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(renderError(400, 'Could not evaluate: ' + err.message));
      return;
    }

    const ogImageUrl =
      SITE_URL + '/v/' + encodeURIComponent(hash) + '/og.png' +
      '?e=' + verdict.counts.eligible + '&t=' + verdict.rulesEvaluated;

    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    // Stable hash → cache aggressively. 24h fresh + 7d stale-while-revalidate at the edge.
    res.setHeader('cache-control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.end(renderHtml({
      verdict,
      evm: parsed.evm,
      sol: parsed.sol,
      hash,
      canonUrl,
      ogImageUrl,
    }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(renderError(500, 'Server error: ' + err.message));
  }
}
