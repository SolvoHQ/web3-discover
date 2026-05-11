# dream — spec

## Problem

After N ticks, `product/thoughts/` is a flat pile of `<tick>-<slug>.md`
files. The agent only reads `log.md` tail (~50 lines = the most recent
thoughts), so deep institutional knowledge ages out. Patterns repeated
across many thoughts ("real-payee-identity gate blocks all affiliate KYC",
"Cloudflare Pages signup is a dead road", ...) never get consolidated.

We need a way for the agent to periodically *consolidate* its thought
stream into a layered hierarchy, **without ever losing information**.

## Hierarchy

```
product/thoughts/
  raw/<tick>-<slug>.md           # current flat files moved here, NEVER modified
  cluster/<theme>.md             # auto-grouped by theme, ZERO info loss
  principle/<rule>.md            # distilled re-usable rules, backlinks to cluster
  .dream-state.json              # internal: last-dreamed tick set, content sha index
  log.md                         # (unchanged: still product/log.md — agent's tail-read)
```

User's verbatim constraints:
- 分类按主题分,不要按 Ticket 分 — group by theme, not by tick
- 可以去重,但不能减少内容 — dedupe allowed, but never reduce content
- 通过不同层级让细节存在于对应层级,但细节一定保留 — layered, but ALL details preserved
- CoT 内容必须保留 — chain-of-thought belongs in `raw/`; cluster/principle reference but never truncate

## Layer responsibilities

### raw/ — source of truth, append-only

- Every original thought file. Filename and content are byte-identical to
  the pre-migration `product/thoughts/*.md`.
- Never modified after the move.
- Acts as the canonical reference for verbatim extracts in higher layers.

### cluster/<theme>.md — theme-grouped index + extracts

Theme name picked by the agent. Reasonable defaults the SKILL prompt
suggests (but does NOT enforce): `distribution-channels`,
`capability-boundaries`, `dead-roads`, `product-decisions`, `tool-gotchas`,
`monetization`, `editorial-spine`. Theme set is open: agent invents new
themes as patterns emerge.

File format (strict — enforced by `write_cluster()`):

```markdown
---
theme: <theme>
source_count: N
last_updated: <ISO ts>
---

# <theme>

<3-5 line theme summary written by the agent.>

## Entries

### <one-line entry headline, derived from source thought>
- source: raw/<file>.md
- extract:
> <VERBATIM extract from source. May be the entire thought body.
> NEVER truncated. If extracting only a section, the section is copied
> in full — no `[...]` ellipsis. Multiple extracts from the same source
> are allowed but each must be its own `### ...` block.>

### <next entry>
- source: raw/<file>.md
- extract:
> ...
```

**Information-preservation rule:** the SHA-256 of every extract block
must match a contiguous byte-range of its source raw file. The skill's
`verify_no_loss()` walks all cluster files and confirms this — any
mismatch raises.

A single raw thought may appear in **multiple** cluster files when it
touches multiple themes. That's the intended dedupe semantics: dedupe at
the *file* level (no copy of the raw file content elsewhere as a fresh
file), but allow the *same* extract to live in multiple themes. Each
cluster entry carries an explicit backlink to its single canonical raw
source.

### principle/<rule>.md — distilled re-usable rules

Format:

```markdown
---
rule: <one-sentence rule>
condition: <when this rule applies>
observed_count: N
last_updated: <ISO ts>
clusters:
  - cluster/<theme1>.md
  - cluster/<theme2>.md
---

# <rule>

## Statement
<the rule, restated.>

## When it applies
<conditions.>

## Evidence (observed in clusters)
- cluster/<theme1>.md (entries N1, N2, ...)
- cluster/<theme2>.md (entry N3)

## Mechanism (optional)
<why the rule holds — the deep "because" not just "what".>
```

Principle files do NOT contain verbatim extracts; they reference cluster
files instead. Cluster files contain the verbatim extracts. This is the
"detail lives at the appropriate layer" structure — principle is the
shortest readable summary; cluster is the verbatim evidence; raw is the
full chain-of-thought.

## Operating modes

### Migration mode (first run)

Trigger: `product/thoughts/raw/` does not exist.

Steps:
1. Create `raw/`, `cluster/`, `principle/`.
2. For every `product/thoughts/*.md` (excluding subdirs and `.gitkeep`):
   move to `raw/<basename>.md` using `git mv` if in a git repo (preserve
   history), else `shutil.move`.
3. Build SHA index: `{raw_filename: sha256}` -> `.dream-state.json`.
4. Return a `DreamPlan` describing every raw file + extracted text the
   agent should now read and cluster.

The agent then issues a sequence of `write_cluster()` and
`write_principle()` calls to populate the higher layers based on its
reading of the raw files.

### Incremental mode

Trigger: `raw/` already exists.

Steps:
1. Diff `raw/` against `.dream-state.json`'s recorded set → `new_raw`
   files added since last dream.
2. Return a `DreamPlan` listing only `new_raw`. Existing clusters/
   principles are not re-evaluated unless the agent explicitly chooses
   to (extend cluster vs create new cluster is the agent's call).

### Idempotency

Running `start_dream()` twice in a row on a clean state yields an empty
`DreamPlan` (no new raw files since last dream). All `write_*` helpers
are upsert-by-filename (re-writing the same theme refines content, never
appends duplicate entries). `verify_no_loss()` is read-only.

## Python API

```python
from solvo.skills.dream.dream import (
    start_dream,           # returns DreamPlan
    write_cluster,         # write a cluster file with extracts
    write_principle,       # write a principle file
    verify_no_loss,        # SHA check across raw / cluster
    DreamPlan,
)

plan = start_dream(workspace_path=Path("..."))
# plan.mode == "migration" | "incremental"
# plan.raw_to_consolidate: list[RawThought]
#   each RawThought: filename, content, sha256
# plan.existing_clusters: list[str]
# plan.existing_principles: list[str]
# plan.summary: human-readable string for the agent

# Agent then calls in any order:
write_cluster(
    theme="dead-roads",
    summary="Distribution channels we tried and recorded as structurally blocked.",
    entries=[
        ClusterEntry(
            headline="HN throttles new accounts on .vercel.app domain",
            source_raw="0a0b470801924d73b19f7deb7452c962-hn-retry-6h-still-throttled-...md",
            extract="...verbatim text from the source thought...",
        ),
        ...
    ],
    workspace_path=...,
)

write_principle(
    rule="HN submission gates are URL-aware, not just account-aware",
    condition="New account + low-trust domain (e.g. *.vercel.app)",
    clusters=["cluster/dead-roads.md", "cluster/distribution-channels.md"],
    statement="...",
    when_applies="...",
    evidence=[("cluster/dead-roads.md", ["HN throttles new accounts on ..."])],
    mechanism="...",
    workspace_path=...,
)

# At the end (or anytime), verify no information was lost:
report = verify_no_loss(workspace_path=...)
# report.missing_extracts: list[(cluster_file, extract_sha)]
# report.orphan_raw: list[raw_file]  # in raw/ but not in any cluster
# report.broken_backlinks: list[(cluster_file, missing_raw_target)]
# report.ok: bool
```

## Information-preservation guarantee

`verify_no_loss()` checks:
1. Every cluster `extract:` block's bytes appear contiguously in its
   `source:` raw file. (Verbatim extract, not paraphrase.)
2. Every raw file in `raw/` is referenced by at least one cluster file's
   `source:`. (No orphaned raw — would mean the agent forgot to cluster
   it.)
3. Every cluster file's `source:` points to an existing `raw/...` file.
   (No broken backlinks.)
4. Every principle's `clusters:` frontmatter list points to existing
   cluster files. (No broken principle backlinks.)
5. SHA-256 of each raw file matches `.dream-state.json` (raw layer is
   immutable since migration).

Validation is byte-level: extracts are matched via `extract.encode() in
raw_bytes`. This is **stricter** than allowing whitespace normalization
because it makes the no-loss claim mechanically verifiable.

## What the skill does NOT do

- **Does NOT pick theme names.** Agent chooses. Skill prompt suggests
  defaults but enforces nothing.
- **Does NOT distill principles automatically.** Agent reads clusters and
  decides which rules are repeated enough to deserve principle files.
- **Does NOT modify or delete raw files** after migration. Raw is
  immutable.
- **Does NOT run on every tick.** Agent decides when context-heavy ticks
  warrant a dream — typically when raw count crosses N (50 / 100 / 200)
  or after a long uninterrupted execution sprint.
- **Does NOT touch `product/log.md`.** log.md remains the per-tick chronological
  index. The hierarchy is parallel, not a replacement.

## Heartbeat integration (optional)

A future heartbeat extension MAY emit a `dream_threshold_crossed` warning
event when `len(raw/) % 50 == 0 and raw_count > previous_count`. The
agent's prompt mentions this as a hint. This skill itself stays
agent-invoked; the heartbeat only signals.

## Test plan

1. Migration on /tmp copy of os-alt's 109-thought corpus:
   - All flat files moved to `raw/`, content byte-identical (SHA check).
   - `.dream-state.json` correctly enumerates all raw files.
   - `start_dream()` re-run on the migrated tree returns
     `mode="incremental"` with empty plan (idempotent).

2. Cluster write happy-path:
   - `write_cluster()` writes a well-formed file.
   - `verify_no_loss()` passes when extracts are verbatim.
   - `verify_no_loss()` reports `missing_extracts` when an extract was
     hand-edited to no longer match the raw source.

3. Backlink integrity:
   - Cluster pointing to nonexistent raw triggers `broken_backlinks`.
   - Principle pointing to nonexistent cluster triggers
     `broken_backlinks` (principle layer).

4. Re-write of an existing cluster (same theme) replaces content;
   does not append duplicate entries.

5. SHA-sum end-to-end: after migration, compute SHA of each raw file;
   after a full dream pass, walk every cluster's `extract:` block and
   confirm its SHA appears as a substring SHA in the raw file's content.
   (Each extract should `.encode() in raw_bytes`.)

## Out of scope

- Compression / archival of old raw thoughts.
- Cross-workspace shared knowledge (per user's workspace-isolation rule).
- Auto-pruning of stale clusters (the agent decides; raw is forever).
