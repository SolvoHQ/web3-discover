---
name: dream
description: Consolidate product/thoughts/ into a 3-tier (raw → cluster → principle) hierarchy when the flat thought pile gets too deep for log.md tail to surface old institutional knowledge. Agent-invoked, NOT on every tick. Information-preserving by construction.
---

# Dream

You wake up each tick with no memory of the last one. `record_thought`
captures conclusions; `log.md` indexes the most recent ~50. But after 100+
ticks the flat `product/thoughts/` pile has institutional knowledge you
no longer see — "real-payee-identity blocks all affiliate KYC" might
appear in 4 different thoughts but you'll never re-derive it.

**Dreaming** is consolidating that flat pile into a layered hierarchy
without losing a single character.

## When to call

- `raw/` doesn't exist yet (first migration) — **always run once per workspace**.
- raw count just crossed a milestone (50 / 100 / 200) — institutional
  patterns are now repeating enough to distill.
- you noticed yourself re-deriving a conclusion you've already recorded
  several times — that's a principle waiting to be written.

## When NOT to call

- every tick — expensive, no value if no new patterns emerged.
- mid-task — finish what you're checked out on first.
- if `verify_no_loss()` from the last dream still reports issues — fix
  those first.

## The 3-layer hierarchy

```
product/thoughts/
  raw/<tick>-<slug>.md     — your record_thought output. NEVER MODIFIED.
  cluster/<theme>.md       — theme-grouped, VERBATIM extracts + backlinks
  principle/<rule>.md      — distilled rules + backlinks to cluster
```

Rules:
- **Group by theme, NOT by tick.** A 2026-05-10 thought about HN
  throttling and a 2026-05-15 thought about Reddit throttling both go
  into `cluster/dead-roads.md` (or your choice of theme name).
- **Dedupe at the file level, not the content level.** A single raw
  thought can appear in multiple cluster files if it touches multiple
  themes. Each occurrence carries an explicit `source: raw/...` backlink.
- **Verbatim extracts only.** The skill enforces this via byte-level
  substring check — your `extract` must appear literally in the source
  raw file's text. Paraphrase = `ValueError` at write time.
- **CoT lives in raw/.** Cluster and principle reference the raw thought;
  they never truncate or summarize away the chain-of-thought.
- **Details migrate UP the layers as compression, not deletion.**
  Principle = short rule; cluster = verbatim evidence; raw = full CoT.

## API

```python
from solvo.skills.dream.dream import (
    start_dream, write_cluster, write_principle, verify_no_loss,
    render_dream_summary, ClusterEntry, PrincipleEvidence,
)

# 1. Start a pass.
plan = start_dream()  # workspace_path defaults to cwd
# plan.mode = "migration" (first run) | "incremental"
# plan.raw_to_consolidate: list[RawThought]  — has .filename, .content, .sha256
# plan.existing_clusters, plan.existing_principles: list[str] basenames
# plan.summary: human-readable string

# 2. Read every raw thought in plan.raw_to_consolidate. Decide themes.
#    Suggested defaults (you can invent new ones — these are not enforced):
#      distribution-channels   — peer directories, awesome-lists, dev.to, RSS, HN
#      capability-boundaries   — what agent can/can't do autonomously
#      dead-roads              — blocked channels (Cloudflare UAM, HN domain gate, KYC walls)
#      product-decisions       — wedge, pivots, scope calls
#      tool-gotchas            — Vercel rate limit, Astro index collapse, WebFetch summarize-away
#      monetization            — sponsor outbound, pricing, affiliate
#      editorial-spine         — series structure, vertical-post format, voice rules

# 3. Write each cluster (idempotent — re-writing same theme replaces it).
#    Each entry: pick a verbatim contiguous chunk from the raw file.
#    The chunk can be a whole thought, a section, or a paragraph — but
#    NEVER a summary. Use multiple entries for the same source if it
#    touches the theme in multiple ways.
write_cluster(
    theme="dead-roads",
    summary="Channels we tried that are structurally blocked for an autonomous agent...",
    entries=[
        ClusterEntry(
            headline="HN gates new accounts on .vercel.app domain",
            source_raw="0a0b470801924d73b19f7deb7452c962-hn-retry-6h-still-throttled-...md",
            extract="HN's submission gate is **URL-aware**, not just account-aware. Even if\nosaltdev grows karma later, vercel.app may stay throttled for `Show HN`\nindefinitely. The right pivot is therefore *domain mirror*, not karma\nfarming.",
        ),
        # ... more entries
    ],
)

# 4. Distill principles AFTER you've clustered. Only write a principle if
#    you see it in ≥2 cluster entries — single occurrences belong in
#    cluster, not principle.
write_principle(
    rule="Account-gated distribution channels are agent-blocked when the gate is URL-aware",
    condition="Posting to a community (HN, Reddit, dev.to) from a low-trust domain",
    statement="...",
    when_applies="...",
    evidence=[
        PrincipleEvidence(
            cluster_file="dead-roads.md",
            entry_headlines=["HN gates new accounts on .vercel.app domain", "..."],
        ),
    ],
    mechanism="...",  # optional — the deep "because"
)

# 5. Verify no information was lost.
report = verify_no_loss()
assert report.ok, report  # bail with the report if not ok

# 6. Record the dream as a thought of its own — so your future self
#    knows when the last dream happened and what it produced.
summary = render_dream_summary(plan, clusters_written=[...], principles_written=[...], report=report)
# Optionally pass this to record_thought() with slug="dream-pass".
```

## Failure modes the skill catches

- **Paraphrased extract** — `write_cluster()` raises `ValueError` before
  writing if `extract not in raw_file_text`. There's no way to corrupt
  the no-loss guarantee via this API.
- **Broken backlinks** — `write_cluster()` and `write_principle()` both
  refuse to write if their source/cluster target doesn't exist.
- **Mutated raw layer** — `verify_no_loss()` flags any raw file whose
  SHA-256 changed since the migration recorded it. Raw is immutable.
- **Orphan raw** (warning) — raw files not yet referenced by any cluster
  show up in `report.orphan_raw`. Not an error (you might be in
  incremental mode mid-pass), but a signal that consolidation isn't
  complete.

## Coordinator note

The coordinator (`bootstrap.py:SYSTEM_SKILLS`) controls which skills get
copied into a workspace's `.claude/skills/`. After adding this skill,
the operator must append `"dream"` to `SYSTEM_SKILLS` so it's available
in new workspaces. For existing workspaces, `solvo upgrade` (or manual
`copy_skills(workspace_path)`) will re-copy `.claude/skills/`.
