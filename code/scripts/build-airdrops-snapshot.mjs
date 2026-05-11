// Snapshot src/content/airdrops/*.md → api/_airdrops.json so the MCP serverless
// function can serve the directory without bundling markdown loaders. Runs as
// prebuild. Re-run safely; output is deterministic.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/airdrops');
const OUT_FILE = path.join(ROOT, 'api/_airdrops.json');

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: text.trim() };
  const yaml = match[1];
  const body = match[2].trim();
  const data = {};
  const lines = yaml.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || /^\s*#/.test(line)) continue;
    // events: array block — consume the indented list that follows.
    if (/^events:\s*$/.test(line)) {
      const events = [];
      let cur = null;
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        i++;
        const sub = lines[i];
        const dash = sub.match(/^\s+-\s+([a-zA-Z]+):\s*(.*)$/);
        if (dash) {
          if (cur) events.push(cur);
          cur = {};
          cur[dash[1]] = stripQuotes(dash[2]);
          continue;
        }
        const kv = sub.match(/^\s+([a-zA-Z]+):\s*(.*)$/);
        if (kv && cur) cur[kv[1]] = stripQuotes(kv[2]);
      }
      if (cur) events.push(cur);
      if (events.length) data.events = events;
      continue;
    }
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    data[key] = stripQuotes(m[2].trim());
  }
  return { data, body };
}

function stripQuotes(v) {
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
const entries = files
  .map((f) => {
    const text = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
    const { data, body } = parseFrontmatter(text);
    return {
      slug: f.replace(/\.md$/, ''),
      project: data.project,
      chain: data.chain,
      blurb: data.blurb,
      action: data.action,
      effort: data.effort,
      costFloor: data.costFloor,
      deadline: data.deadline,
      risk: data.risk,
      officialUrl: data.officialUrl,
      twitter: data.twitter || null,
      addedOn: data.addedOn,
      lastChecked: data.lastChecked || data.addedOn,
      status: data.status || 'active',
      events: Array.isArray(data.events) ? data.events : [],
      notes: body,
    };
  })
  .filter((e) => e.risk !== 'suspect' && e.status !== 'ended')
  .sort((a, b) => {
    const da = /^\d{4}-\d{2}-\d{2}$/.test(a.deadline || '') ? a.deadline : '9999-12-31';
    const db = /^\d{4}-\d{2}-\d{2}$/.test(b.deadline || '') ? b.deadline : '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    return (a.project || '').localeCompare(b.project || '');
  });

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(
  OUT_FILE,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), count: entries.length, entries },
    null,
    2,
  ) + '\n',
);
console.log(`wrote ${path.relative(ROOT, OUT_FILE)} — ${entries.length} entries`);

// Mirror eligibility-rules.json into api/ so the MCP serverless function bundle
// includes it. Vercel by default only ships files under api/; relative imports
// from ../src don't survive the bundle.
const ELIG_SRC = path.join(ROOT, 'src/data/eligibility-rules.json');
const ELIG_DST = path.join(ROOT, 'api/_eligibility-rules.json');
fs.copyFileSync(ELIG_SRC, ELIG_DST);
const eligRules = JSON.parse(fs.readFileSync(ELIG_SRC, 'utf-8'));
console.log(
  `wrote ${path.relative(ROOT, ELIG_DST)} — ` +
    `${Object.keys(eligRules.rules).length} rules + ` +
    `${Object.keys(eligRules.noRuleReason).length} no-rule reasons`,
);
