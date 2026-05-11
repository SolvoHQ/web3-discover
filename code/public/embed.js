/*!
 * web3-discover embed widget
 *
 * Drop into any blog/newsletter sidebar to render a fresh, curated list of
 * currently-active web3 airdrops. Data updates whenever the source
 * directory does (5-min Vercel edge cache). All CSS lives inside a Shadow
 * DOM so host stylesheets cannot bleed in.
 *
 * Usage:
 *   <script
 *     src="https://web3-discover.vercel.app/embed.js"
 *     data-limit="5"           // 1..15  (default 5)
 *     data-chain=""            // optional, e.g. "Solana", "Base", any chain string in source
 *     data-effort=""           // optional, "low" / "medium" / "high"
 *     data-risk=""             // optional, "verified" / "low" / "medium" / "high"
 *     data-theme="auto"        // "auto" | "light" | "dark"
 *     data-width=""            // optional max-width, e.g. "320px" or "100%"
 *     data-title="Fresh airdrops"
 *     async
 *   ></script>
 *
 * License: MIT — embed freely, attribution link in the footer is required by convention, not by code.
 */
(function () {
  'use strict';

  // Resolve our own script tag. document.currentScript is reliable during
  // synchronous execution; for async/defer we fall back to last <script>
  // whose src points at our origin.
  function getSelfScript() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.src && /\/embed\.js(\?|$)/.test(s.src)) return s;
    }
    return null;
  }

  var selfScript = getSelfScript();
  if (!selfScript) return; // can't anchor — silently bail

  // Derive origin from our own src so the widget keeps working on preview
  // deploys, custom domains, and local mirrors without a rebuild.
  var origin;
  try {
    origin = new URL(selfScript.src).origin;
  } catch (e) {
    origin = 'https://web3-discover.vercel.app';
  }

  function attr(name, fallback) {
    var v = selfScript.getAttribute('data-' + name);
    return (v === null || v === '') ? fallback : v;
  }

  var rawLimit = parseInt(attr('limit', '5'), 10);
  var limit = (isFinite(rawLimit) && rawLimit > 0) ? Math.min(rawLimit, 15) : 5;
  var chainFilter = (attr('chain', '') || '').trim().toLowerCase();
  var effortFilter = (attr('effort', '') || '').trim().toLowerCase();
  var riskFilter = (attr('risk', '') || '').trim().toLowerCase();
  var theme = (attr('theme', 'auto') || 'auto').toLowerCase();
  var width = attr('width', '');
  var title = attr('title', 'Fresh airdrops');

  // Create a host element and insert it right after our script tag. Shadow
  // DOM gives us bulletproof style isolation — no class collisions, no
  // host !important rules leaking in.
  var host = document.createElement('div');
  host.className = 'web3-discover-embed';
  host.style.all = 'initial';
  host.style.display = 'block';
  host.style.fontFamily = 'inherit';
  if (width) host.style.maxWidth = width;
  selfScript.parentNode.insertBefore(host, selfScript.nextSibling);

  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var DARK = 'dark', LIGHT = 'light';
  function resolveTheme() {
    if (theme === DARK || theme === LIGHT) return theme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return DARK;
    return LIGHT;
  }

  var resolved = resolveTheme();

  var styles = [
    ':host, .root { all: initial; }',
    '.root {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;',
    '  font-size: 14px;',
    '  line-height: 1.4;',
    '  color: ' + (resolved === DARK ? '#e8e8e8' : '#1a1a1a') + ';',
    '  background: ' + (resolved === DARK ? '#16181d' : '#ffffff') + ';',
    '  border: 1px solid ' + (resolved === DARK ? '#2a2e36' : '#e3e3e3') + ';',
    '  border-radius: 8px;',
    '  padding: 14px 14px 10px 14px;',
    '  box-sizing: border-box;',
    '  display: block;',
    '  max-width: 100%;',
    '}',
    '.head {',
    '  display: flex; align-items: baseline; justify-content: space-between;',
    '  gap: 8px; margin: 0 0 10px 0;',
    '}',
    '.title {',
    '  font-weight: 700; font-size: 14px;',
    '  color: ' + (resolved === DARK ? '#fafafa' : '#0f0f0f') + ';',
    '  letter-spacing: -0.01em;',
    '}',
    '.count {',
    '  font-size: 11px; font-variant-numeric: tabular-nums;',
    '  color: ' + (resolved === DARK ? '#888' : '#777') + ';',
    '}',
    'ul.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }',
    'li.row {',
    '  border-top: 1px solid ' + (resolved === DARK ? '#22252c' : '#f0f0f0') + ';',
    '  padding-top: 8px;',
    '}',
    'li.row:first-child { border-top: 0; padding-top: 0; }',
    'a.entry {',
    '  display: block; text-decoration: none; color: inherit;',
    '  border-radius: 4px; padding: 2px 0;',
    '}',
    'a.entry:hover .proj { text-decoration: underline; }',
    '.line1 {',
    '  display: flex; align-items: baseline; justify-content: space-between;',
    '  gap: 8px; margin-bottom: 2px;',
    '}',
    '.proj { font-weight: 600; font-size: 14px; color: ' + (resolved === DARK ? '#fff' : '#0a0a0a') + '; }',
    '.chain {',
    '  font-size: 11px; font-weight: 500; letter-spacing: 0.01em;',
    '  color: ' + (resolved === DARK ? '#a8b3c5' : '#666') + ';',
    '  flex-shrink: 0;',
    '}',
    '.line2 {',
    '  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;',
    '  font-size: 11px;',
    '  color: ' + (resolved === DARK ? '#9aa3b2' : '#5a5a5a') + ';',
    '}',
    '.badge {',
    '  display: inline-block; padding: 1px 6px; border-radius: 3px;',
    '  font-size: 10px; font-weight: 600; letter-spacing: 0.02em;',
    '  text-transform: uppercase;',
    '}',
    '.badge.r-verified { background: #d8f5e3; color: #0a6a3a; }',
    '.badge.r-low { background: #e8f2ff; color: #114a99; }',
    '.badge.r-medium { background: #fff3d6; color: #8a5a00; }',
    '.badge.r-high { background: #ffe1e1; color: #a01515; }',
    resolved === DARK ? '.badge.r-verified { background: #133b27; color: #79e3ad; }' : '',
    resolved === DARK ? '.badge.r-low { background: #15263d; color: #93c0ff; }' : '',
    resolved === DARK ? '.badge.r-medium { background: #3d2e0f; color: #f0c66b; }' : '',
    resolved === DARK ? '.badge.r-high { background: #3d1818; color: #f59191; }' : '',
    '.dot { color: ' + (resolved === DARK ? '#3a414d' : '#cfcfcf') + '; }',
    '.foot {',
    '  margin-top: 10px; padding-top: 8px;',
    '  border-top: 1px solid ' + (resolved === DARK ? '#22252c' : '#f0f0f0') + ';',
    '  font-size: 11px; text-align: right;',
    '  color: ' + (resolved === DARK ? '#7a8294' : '#888') + ';',
    '}',
    '.foot a { color: inherit; text-decoration: none; }',
    '.foot a:hover { text-decoration: underline; }',
    '.skel { animation: pulse 1.4s ease-in-out infinite; }',
    '.skel-row {',
    '  height: 36px; background: ' + (resolved === DARK ? '#22252c' : '#f3f3f3') + ';',
    '  border-radius: 4px; margin-bottom: 8px;',
    '}',
    '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }',
    '.err { padding: 6px 0; font-size: 12px; color: ' + (resolved === DARK ? '#f59191' : '#a01515') + '; }',
  ].join('\n');

  var root = document.createElement('div');
  root.className = 'root';
  var styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);
  shadow.appendChild(root);

  function escapeText(s) {
    return String(s == null ? '' : s);
  }

  function riskClass(r) {
    var v = String(r || '').toLowerCase();
    if (v === 'verified' || v === 'low' || v === 'medium' || v === 'high') return 'r-' + v;
    return 'r-low';
  }

  function shortDeadline(d) {
    if (!d) return 'ongoing';
    if (/^ongoing$/i.test(d)) return 'ongoing';
    var iso = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!iso) return d;
    var date = new Date(iso[0] + 'T00:00:00Z');
    if (isNaN(date.getTime())) return d;
    var now = new Date();
    var days = Math.round((date - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'closed';
    if (days === 0) return 'today';
    if (days === 1) return '1d';
    if (days < 30) return days + 'd';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function renderLoading() {
    root.innerHTML =
      '<div class="head"><span class="title"></span><span class="count"></span></div>' +
      '<div class="skel">' +
      Array(Math.min(limit, 4)).fill('<div class="skel-row"></div>').join('') +
      '</div>';
    root.querySelector('.title').textContent = title;
  }

  function renderError(msg) {
    root.innerHTML =
      '<div class="head"><span class="title"></span></div>' +
      '<div class="err"></div>' +
      '<div class="foot"><a href="' + origin + '?utm_source=embed&utm_medium=widget" target="_blank" rel="noopener">powered by web3-discover</a></div>';
    root.querySelector('.title').textContent = title;
    root.querySelector('.err').textContent = msg;
  }

  function passes(entry) {
    if (entry.status && entry.status !== 'active') return false;
    if (chainFilter && String(entry.chain || '').toLowerCase().indexOf(chainFilter) === -1) return false;
    if (effortFilter && String(entry.effort || '').toLowerCase().indexOf(effortFilter) === -1) return false;
    if (riskFilter && String(entry.risk || '').toLowerCase() !== riskFilter) return false;
    return true;
  }

  function render(data) {
    var all = (data && data.entries) || [];
    var filtered = all.filter(passes).slice(0, limit);

    if (filtered.length === 0) {
      renderError('No matching airdrops right now.');
      return;
    }

    // Build DOM via createElement (not innerHTML) so untrusted content from
    // the JSON cannot inject markup into the host page — even though it's
    // inside a Shadow root, defense-in-depth is cheap here.
    root.textContent = '';

    var head = document.createElement('div');
    head.className = 'head';
    var titleEl = document.createElement('span');
    titleEl.className = 'title';
    titleEl.textContent = title;
    var countEl = document.createElement('span');
    countEl.className = 'count';
    countEl.textContent = filtered.length + ' of ' + all.length;
    head.appendChild(titleEl);
    head.appendChild(countEl);
    root.appendChild(head);

    var ul = document.createElement('ul');
    ul.className = 'list';

    filtered.forEach(function (e) {
      var li = document.createElement('li');
      li.className = 'row';

      var a = document.createElement('a');
      a.className = 'entry';
      a.href = origin + '/airdrops/' + encodeURIComponent(e.slug) + '?utm_source=embed&utm_medium=widget';
      a.target = '_blank';
      a.rel = 'noopener';

      var line1 = document.createElement('div');
      line1.className = 'line1';
      var proj = document.createElement('span');
      proj.className = 'proj';
      proj.textContent = escapeText(e.project);
      var chain = document.createElement('span');
      chain.className = 'chain';
      chain.textContent = escapeText(e.chain);
      line1.appendChild(proj);
      line1.appendChild(chain);

      var line2 = document.createElement('div');
      line2.className = 'line2';
      var badge = document.createElement('span');
      badge.className = 'badge ' + riskClass(e.risk);
      badge.textContent = escapeText(e.risk || 'low');
      line2.appendChild(badge);

      var dot1 = document.createElement('span');
      dot1.className = 'dot';
      dot1.textContent = '·';
      line2.appendChild(dot1);

      var dl = document.createElement('span');
      dl.textContent = shortDeadline(e.deadline);
      line2.appendChild(dl);

      if (e.effort) {
        var dot2 = document.createElement('span');
        dot2.className = 'dot';
        dot2.textContent = '·';
        line2.appendChild(dot2);
        var ef = document.createElement('span');
        ef.textContent = escapeText(e.effort);
        line2.appendChild(ef);
      }

      a.appendChild(line1);
      a.appendChild(line2);
      li.appendChild(a);
      ul.appendChild(li);
    });

    root.appendChild(ul);

    var foot = document.createElement('div');
    foot.className = 'foot';
    var fa = document.createElement('a');
    fa.href = origin + '?utm_source=embed&utm_medium=widget';
    fa.target = '_blank';
    fa.rel = 'noopener';
    fa.textContent = 'powered by web3-discover';
    foot.appendChild(fa);
    root.appendChild(foot);
  }

  renderLoading();

  fetch(origin + '/api/airdrops.json', { credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(render)
    .catch(function (err) {
      renderError('Could not load airdrops.');
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[web3-discover embed] fetch failed:', err);
      }
    });
})();
