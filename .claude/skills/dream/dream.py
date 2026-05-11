"""dream — consolidate product/thoughts/ into a 3-tier hierarchy without
information loss.

Layers (under product/thoughts/):
    raw/<tick>-<slug>.md       canonical, immutable, byte-identical to the
                               pre-migration flat files
    cluster/<theme>.md         theme-grouped index + VERBATIM extracts +
                               backlinks to raw
    principle/<rule>.md        distilled re-usable rules + backlinks to
                               cluster

The Python API here is primitives the *agent* calls. Theme assignment
and principle distillation are semantic decisions the agent makes; this
module enforces the mechanical contract: idempotent migration, no-loss
verification, well-formed file layout, working backlinks.

See SPEC.md for design rationale, SKILL.md for agent-facing usage.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


THOUGHTS_REL_DIR = "product/thoughts"
RAW_SUBDIR = "raw"
CLUSTER_SUBDIR = "cluster"
PRINCIPLE_SUBDIR = "principle"
STATE_FILE = ".dream-state.json"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class RawThought:
    """A single thought file in raw/. Immutable post-migration."""
    filename: str           # basename only, e.g. "abc123-wedge-pivot.md"
    content: str            # full file bytes decoded as utf-8
    sha256: str             # hex digest of content.encode("utf-8")


@dataclass
class DreamPlan:
    """Returned from start_dream() — tells the agent what to consolidate."""
    mode: str                              # "migration" | "incremental"
    workspace_path: Path
    raw_to_consolidate: list[RawThought]   # new since last dream (or all in migration)
    existing_clusters: list[str]           # cluster filenames (basename)
    existing_principles: list[str]         # principle filenames (basename)
    summary: str                           # human-readable string


@dataclass
class ClusterEntry:
    """One verbatim extract from a raw thought, attached to a cluster."""
    headline: str           # one-line entry headline written by the agent
    source_raw: str         # filename in raw/ (basename, NOT full path)
    extract: str            # verbatim text from source_raw — MUST appear
                            # contiguously in the source's bytes


@dataclass
class PrincipleEvidence:
    """A principle's pointer back to specific entries in a cluster file."""
    cluster_file: str       # basename of cluster file, e.g. "dead-roads.md"
    entry_headlines: list[str]  # headlines of cluster entries supporting this rule


@dataclass
class VerifyReport:
    """Output of verify_no_loss()."""
    missing_extracts: list[tuple[str, str]] = field(default_factory=list)
    # ^ (cluster_file_basename, first 40 chars of extract preview)
    orphan_raw: list[str] = field(default_factory=list)
    broken_cluster_backlinks: list[tuple[str, str]] = field(default_factory=list)
    # ^ (cluster_file_basename, missing_raw_target)
    broken_principle_backlinks: list[tuple[str, str]] = field(default_factory=list)
    # ^ (principle_file_basename, missing_cluster_target)
    raw_sha_mismatch: list[str] = field(default_factory=list)
    # ^ raw filenames whose current sha doesn't match .dream-state.json

    @property
    def ok(self) -> bool:
        return not (
            self.missing_extracts
            or self.broken_cluster_backlinks
            or self.broken_principle_backlinks
            or self.raw_sha_mismatch
        )
        # orphan_raw is a WARNING, not a hard failure — agent may legitimately
        # have new raw thoughts that haven't been clustered yet.


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def start_dream(workspace_path: Optional[Path] = None) -> DreamPlan:
    """Initialize or resume a dream pass.

    If `product/thoughts/raw/` doesn't exist, migrate all flat files into
    it (preserving git history when present), then return a plan with
    every raw file. If `raw/` already exists, return only files added
    since the last recorded dream.

    Idempotent — calling twice in a row with no new thoughts yields an
    incremental plan with empty `raw_to_consolidate`.
    """
    workspace_path = _resolve_workspace(workspace_path)
    thoughts_dir = workspace_path / THOUGHTS_REL_DIR
    raw_dir = thoughts_dir / RAW_SUBDIR
    cluster_dir = thoughts_dir / CLUSTER_SUBDIR
    principle_dir = thoughts_dir / PRINCIPLE_SUBDIR

    if not raw_dir.exists():
        mode = "migration"
        _migrate_flat_to_raw(thoughts_dir, raw_dir)
    else:
        mode = "incremental"

    cluster_dir.mkdir(exist_ok=True)
    principle_dir.mkdir(exist_ok=True)

    state = _load_state(thoughts_dir)
    current_raw = _list_raw_files(raw_dir)
    current_sha = {fn: _sha256_of_file(raw_dir / fn) for fn in current_raw}

    if mode == "migration":
        new_files = current_raw
    else:
        # Incremental: anything in raw/ not yet in state.raw_sha is new.
        known = set(state.get("raw_sha", {}).keys())
        new_files = sorted(set(current_raw) - known)

    raw_to_consolidate: list[RawThought] = []
    for fn in new_files:
        path = raw_dir / fn
        content = path.read_text(encoding="utf-8")
        raw_to_consolidate.append(
            RawThought(filename=fn, content=content, sha256=current_sha[fn])
        )

    # Update state with the current raw inventory. (Migration: writes
    # everything for the first time. Incremental: adds new files,
    # preserves existing entries — raw is immutable so old SHAs should
    # still match.)
    state["raw_sha"] = current_sha
    state["last_dream_ts"] = datetime.now(timezone.utc).isoformat(
        timespec="seconds"
    )
    _save_state(thoughts_dir, state)

    existing_clusters = sorted(
        p.name for p in cluster_dir.glob("*.md")
    )
    existing_principles = sorted(
        p.name for p in principle_dir.glob("*.md")
    )

    summary = _format_plan_summary(
        mode, new_files, current_raw, existing_clusters, existing_principles
    )

    return DreamPlan(
        mode=mode,
        workspace_path=workspace_path,
        raw_to_consolidate=raw_to_consolidate,
        existing_clusters=existing_clusters,
        existing_principles=existing_principles,
        summary=summary,
    )


def write_cluster(
    theme: str,
    summary: str,
    entries: list[ClusterEntry],
    workspace_path: Optional[Path] = None,
) -> str:
    """Write (or rewrite) a cluster file.

    Theme is a kebab-case identifier; becomes the filename. Re-writing an
    existing theme replaces the file's content — the agent passes the
    full desired entry list each call. This keeps the API stateless.

    Each entry's extract MUST appear contiguously in its source raw file.
    Raises ValueError if any extract is not verbatim. Empty entries are
    allowed (e.g. when refining a cluster to drop a misattributed entry)
    but must not violate the verbatim check for the entries that remain.

    Returns the workspace-relative path of the cluster file.
    """
    workspace_path = _resolve_workspace(workspace_path)
    _validate_kebab(theme, label="theme")
    thoughts_dir = workspace_path / THOUGHTS_REL_DIR
    raw_dir = thoughts_dir / RAW_SUBDIR
    cluster_dir = thoughts_dir / CLUSTER_SUBDIR
    if not raw_dir.exists():
        raise RuntimeError(
            "raw/ does not exist — call start_dream() first to migrate."
        )
    cluster_dir.mkdir(exist_ok=True)

    # Verbatim check before write — fail loudly instead of writing a
    # broken cluster file.
    for entry in entries:
        src = raw_dir / entry.source_raw
        if not src.exists():
            raise ValueError(
                f"entry '{entry.headline}': source_raw "
                f"'{entry.source_raw}' does not exist in raw/"
            )
        raw_text = src.read_text(encoding="utf-8")
        if entry.extract not in raw_text:
            raise ValueError(
                f"entry '{entry.headline}': extract is not a verbatim "
                f"substring of raw/{entry.source_raw}. Information-"
                f"preservation rule violated — agent paraphrased instead "
                f"of copying."
            )

    body = _render_cluster(theme, summary, entries)
    out_path = cluster_dir / f"{theme}.md"
    out_path.write_text(body, encoding="utf-8")

    return str(out_path.relative_to(workspace_path))


def write_principle(
    rule: str,
    condition: str,
    statement: str,
    when_applies: str,
    evidence: list[PrincipleEvidence],
    workspace_path: Optional[Path] = None,
    mechanism: str = "",
    rule_slug: Optional[str] = None,
) -> str:
    """Write (or rewrite) a principle file.

    `rule_slug` is the filename (kebab-case). If not provided, it's
    derived from `rule`. `evidence` lists clusters this principle was
    distilled from, plus the specific entry headlines within each
    cluster as backlinks.

    Returns the workspace-relative path of the principle file.
    """
    workspace_path = _resolve_workspace(workspace_path)
    thoughts_dir = workspace_path / THOUGHTS_REL_DIR
    cluster_dir = thoughts_dir / CLUSTER_SUBDIR
    principle_dir = thoughts_dir / PRINCIPLE_SUBDIR
    if not cluster_dir.exists():
        raise RuntimeError(
            "cluster/ does not exist — write_cluster() must run first "
            "before distilling principles."
        )
    principle_dir.mkdir(exist_ok=True)

    if rule_slug is None:
        rule_slug = _slugify(rule)
    _validate_kebab(rule_slug, label="rule_slug")

    # Backlink check: every evidence.cluster_file must exist.
    for ev in evidence:
        path = cluster_dir / ev.cluster_file
        if not path.exists():
            raise ValueError(
                f"principle '{rule}': evidence references "
                f"cluster/{ev.cluster_file} which does not exist."
            )

    observed_count = sum(len(ev.entry_headlines) for ev in evidence)
    body = _render_principle(
        rule=rule,
        condition=condition,
        statement=statement,
        when_applies=when_applies,
        mechanism=mechanism,
        evidence=evidence,
        observed_count=observed_count,
    )
    out_path = principle_dir / f"{rule_slug}.md"
    out_path.write_text(body, encoding="utf-8")
    return str(out_path.relative_to(workspace_path))


def verify_no_loss(workspace_path: Optional[Path] = None) -> VerifyReport:
    """Walk the full hierarchy and confirm no information was lost.

    Checks:
      1. Every cluster extract is a verbatim substring of its source raw file.
      2. Every cluster source_raw points to an existing raw/ file.
      3. Every principle's cluster references exist.
      4. Every raw file's current SHA matches .dream-state.json (raw is
         immutable).
      5. (Warning) Raw files not referenced by any cluster are flagged
         as `orphan_raw` — does NOT fail `ok`, but the agent should
         know about them.
    """
    workspace_path = _resolve_workspace(workspace_path)
    thoughts_dir = workspace_path / THOUGHTS_REL_DIR
    raw_dir = thoughts_dir / RAW_SUBDIR
    cluster_dir = thoughts_dir / CLUSTER_SUBDIR
    principle_dir = thoughts_dir / PRINCIPLE_SUBDIR

    report = VerifyReport()

    if not raw_dir.exists():
        # Nothing migrated yet — vacuously OK.
        return report

    # 4. SHA check on raw layer.
    state = _load_state(thoughts_dir)
    recorded_sha = state.get("raw_sha", {})
    for fn in _list_raw_files(raw_dir):
        actual = _sha256_of_file(raw_dir / fn)
        recorded = recorded_sha.get(fn)
        if recorded is not None and recorded != actual:
            report.raw_sha_mismatch.append(fn)

    raw_files_referenced: set[str] = set()
    if cluster_dir.exists():
        for cluster_file in sorted(cluster_dir.glob("*.md")):
            entries = _parse_cluster_entries(cluster_file.read_text(encoding="utf-8"))
            for entry in entries:
                src = raw_dir / entry["source_raw"]
                if not src.exists():
                    report.broken_cluster_backlinks.append(
                        (cluster_file.name, entry["source_raw"])
                    )
                    continue
                raw_files_referenced.add(entry["source_raw"])
                raw_text = src.read_text(encoding="utf-8")
                if entry["extract"] not in raw_text:
                    preview = entry["extract"][:40].replace("\n", " ")
                    report.missing_extracts.append((cluster_file.name, preview))

    # 5. Orphan raw — warning only.
    all_raw = set(_list_raw_files(raw_dir))
    report.orphan_raw = sorted(all_raw - raw_files_referenced)

    # 3. Principle backlinks.
    if principle_dir.exists() and cluster_dir.exists():
        existing_clusters = {p.name for p in cluster_dir.glob("*.md")}
        for principle_file in sorted(principle_dir.glob("*.md")):
            for cluster_ref in _parse_principle_cluster_refs(
                principle_file.read_text(encoding="utf-8")
            ):
                if cluster_ref not in existing_clusters:
                    report.broken_principle_backlinks.append(
                        (principle_file.name, cluster_ref)
                    )

    return report


def render_dream_summary(
    plan: DreamPlan,
    clusters_written: list[str],
    principles_written: list[str],
    report: VerifyReport,
) -> str:
    """Render the structured summary the agent returns from a dream pass.

    Skill's standard output format — meant to land in a thought file or
    the agent's complete_problem summary.
    """
    lines = [
        f"# Dream pass — {plan.mode} mode",
        "",
        f"- raw files in scope: {len(plan.raw_to_consolidate)}",
        f"- pre-existing clusters: {len(plan.existing_clusters)}",
        f"- pre-existing principles: {len(plan.existing_principles)}",
        f"- clusters written/refined: {len(clusters_written)}",
        f"- principles written/refined: {len(principles_written)}",
        "",
        "## Verification",
        f"- ok: {report.ok}",
        f"- extracts that aren't verbatim: {len(report.missing_extracts)}",
        f"- broken cluster backlinks: {len(report.broken_cluster_backlinks)}",
        f"- broken principle backlinks: {len(report.broken_principle_backlinks)}",
        f"- raw SHA mismatches (raw layer should be immutable): "
        f"{len(report.raw_sha_mismatch)}",
        f"- orphan raw (not yet clustered, warning): {len(report.orphan_raw)}",
    ]
    if clusters_written:
        lines.append("")
        lines.append("## Clusters written")
        for c in clusters_written:
            lines.append(f"- {c}")
    if principles_written:
        lines.append("")
        lines.append("## Principles written")
        for p in principles_written:
            lines.append(f"- {p}")
    if report.missing_extracts:
        lines.append("")
        lines.append("## ⚠ Non-verbatim extracts (INFORMATION LOSS)")
        for cf, preview in report.missing_extracts:
            lines.append(f"- {cf}: {preview!r}")
    if report.broken_cluster_backlinks:
        lines.append("")
        lines.append("## ⚠ Broken cluster → raw backlinks")
        for cf, target in report.broken_cluster_backlinks:
            lines.append(f"- {cf} → raw/{target}")
    if report.broken_principle_backlinks:
        lines.append("")
        lines.append("## ⚠ Broken principle → cluster backlinks")
        for pf, target in report.broken_principle_backlinks:
            lines.append(f"- {pf} → cluster/{target}")
    if report.raw_sha_mismatch:
        lines.append("")
        lines.append("## ⚠ Raw layer mutated (should be immutable)")
        for fn in report.raw_sha_mismatch:
            lines.append(f"- raw/{fn}")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------


def _resolve_workspace(workspace_path: Optional[Path]) -> Path:
    if workspace_path is None:
        workspace_path = Path.cwd()
    return Path(workspace_path).resolve()


def _migrate_flat_to_raw(thoughts_dir: Path, raw_dir: Path) -> None:
    """Move every product/thoughts/*.md (top-level, excluding .gitkeep)
    into product/thoughts/raw/. Uses `git mv` when the workspace is a
    git repo so history is preserved; falls back to shutil.move otherwise.
    """
    raw_dir.mkdir(parents=True, exist_ok=True)
    git_root = _git_root(thoughts_dir)
    for path in sorted(thoughts_dir.glob("*.md")):
        if path.name == "log.md":
            # log.md lives directly in product/, not in thoughts/, but
            # guard anyway in case of legacy layout.
            continue
        dest = raw_dir / path.name
        if dest.exists():
            # Already migrated — leave both alone, raw is canonical.
            # Remove the duplicate flat file to keep migration idempotent.
            if path.read_bytes() == dest.read_bytes():
                path.unlink()
            else:
                raise RuntimeError(
                    f"migration conflict: both {path} and {dest} exist "
                    f"with different content"
                )
            continue
        if git_root is not None:
            try:
                subprocess.run(
                    ["git", "-C", str(git_root), "mv",
                     str(path.relative_to(git_root)),
                     str(dest.relative_to(git_root))],
                    check=True, capture_output=True,
                )
                continue
            except subprocess.CalledProcessError:
                # Fall through to shutil.move — file may be untracked.
                pass
        shutil.move(str(path), str(dest))


def _git_root(start: Path) -> Optional[Path]:
    try:
        result = subprocess.run(
            ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
            check=True, capture_output=True, text=True,
        )
        return Path(result.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def _list_raw_files(raw_dir: Path) -> list[str]:
    """Sorted list of .md basenames inside raw/, excluding .gitkeep."""
    return sorted(
        p.name for p in raw_dir.glob("*.md")
        if p.is_file()
    )


def _sha256_of_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_state(thoughts_dir: Path) -> dict:
    state_path = thoughts_dir / STATE_FILE
    if not state_path.exists():
        return {}
    try:
        return json.loads(state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_state(thoughts_dir: Path, state: dict) -> None:
    state_path = thoughts_dir / STATE_FILE
    state_path.write_text(
        json.dumps(state, indent=2, sort_keys=True), encoding="utf-8"
    )


def _validate_kebab(s: str, label: str) -> None:
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", s):
        raise ValueError(
            f"Invalid {label} '{s}': must be kebab-case "
            "([a-z0-9][a-z0-9-]*)"
        )


def _slugify(rule: str) -> str:
    """Derive a kebab-case slug from a rule statement. Best-effort —
    agent can override via explicit rule_slug."""
    s = rule.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = s[:80] or "principle"
    if not s[0].isalnum():
        s = "p-" + s
    return s


def _render_cluster(theme: str, summary: str, entries: list[ClusterEntry]) -> str:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lines = [
        "---",
        f"theme: {theme}",
        f"source_count: {len(entries)}",
        f"last_updated: {now}",
        "---",
        "",
        f"# {theme}",
        "",
        summary.rstrip(),
        "",
        "## Entries",
        "",
    ]
    for entry in entries:
        lines.append(f"### {entry.headline}")
        lines.append(f"- source: raw/{entry.source_raw}")
        lines.append("- extract:")
        # Render extract as a markdown blockquote — every line prefixed
        # with "> ". The verbatim guarantee is on the *stripped* text
        # stored in the entry; the blockquote is presentation only and
        # _parse_cluster_entries reverses it.
        for raw_line in entry.extract.splitlines():
            lines.append(f"> {raw_line}" if raw_line else ">")
        lines.append("")
    return "\n".join(lines)


def _render_principle(
    rule: str,
    condition: str,
    statement: str,
    when_applies: str,
    mechanism: str,
    evidence: list[PrincipleEvidence],
    observed_count: int,
) -> str:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lines = [
        "---",
        f"rule: {rule}",
        f"condition: {condition}",
        f"observed_count: {observed_count}",
        f"last_updated: {now}",
        "clusters:",
    ]
    for ev in evidence:
        lines.append(f"  - cluster/{ev.cluster_file}")
    lines.extend([
        "---",
        "",
        f"# {rule}",
        "",
        "## Statement",
        statement.rstrip(),
        "",
        "## When it applies",
        when_applies.rstrip(),
        "",
        "## Evidence (observed in clusters)",
    ])
    for ev in evidence:
        if ev.entry_headlines:
            entries_str = "; ".join(f'"{h}"' for h in ev.entry_headlines)
            lines.append(f"- cluster/{ev.cluster_file} — {entries_str}")
        else:
            lines.append(f"- cluster/{ev.cluster_file}")
    if mechanism.strip():
        lines.extend(["", "## Mechanism", mechanism.rstrip()])
    return "\n".join(lines) + "\n"


# Cluster entries are written as `### headline\n- source: raw/<file>\n
# - extract:\n> ...\n> ...\n`. Parser walks the file and reconstructs
# the original extract text from the blockquote.
_CLUSTER_ENTRY_HEADER_RE = re.compile(r"^### (.+)$")
_CLUSTER_SOURCE_RE = re.compile(r"^- source: raw/(.+)$")


def _parse_cluster_entries(text: str) -> list[dict]:
    """Reverse of _render_cluster — returns list of dicts:
    {headline, source_raw, extract}. Extract is the verbatim text
    reconstructed from the blockquote (no '> ' prefix)."""
    entries: list[dict] = []
    current: Optional[dict] = None
    in_extract = False
    extract_lines: list[str] = []

    def flush():
        nonlocal current, extract_lines, in_extract
        if current is not None:
            current["extract"] = "\n".join(extract_lines).rstrip("\n")
            entries.append(current)
        current = None
        extract_lines = []
        in_extract = False

    for line in text.splitlines():
        m = _CLUSTER_ENTRY_HEADER_RE.match(line)
        if m:
            flush()
            current = {"headline": m.group(1).strip(), "source_raw": "", "extract": ""}
            in_extract = False
            extract_lines = []
            continue
        if current is None:
            continue
        ms = _CLUSTER_SOURCE_RE.match(line)
        if ms:
            current["source_raw"] = ms.group(1).strip()
            continue
        if line.rstrip() == "- extract:":
            in_extract = True
            continue
        if in_extract:
            # Strip leading "> " or ">" (empty quoted line).
            if line.startswith("> "):
                extract_lines.append(line[2:])
            elif line == ">":
                extract_lines.append("")
            elif line.startswith(">"):
                extract_lines.append(line[1:])
            else:
                # Non-blockquote line ends the extract. Trailing blank
                # lines / next ### will flush via the loop.
                in_extract = False
    flush()
    return entries


_PRINCIPLE_CLUSTER_REF_RE = re.compile(r"^\s*-\s+cluster/(\S+\.md)")


def _parse_principle_cluster_refs(text: str) -> list[str]:
    """Extract `cluster/<file>.md` references from a principle file's
    frontmatter clusters: list AND from the 'Evidence' body section."""
    refs: list[str] = []
    in_frontmatter = False
    in_clusters_list = False
    for line in text.splitlines():
        if line.strip() == "---":
            in_frontmatter = not in_frontmatter
            in_clusters_list = False
            continue
        if in_frontmatter:
            if line.startswith("clusters:"):
                in_clusters_list = True
                continue
            if in_clusters_list:
                m = _PRINCIPLE_CLUSTER_REF_RE.match(line)
                if m:
                    refs.append(m.group(1))
                elif line and not line.startswith(" "):
                    # Top-level frontmatter key — end of clusters: block
                    in_clusters_list = False
        else:
            m = _PRINCIPLE_CLUSTER_REF_RE.match(line)
            if m:
                refs.append(m.group(1))
    # Dedupe preserving order.
    seen: set[str] = set()
    out: list[str] = []
    for r in refs:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def _format_plan_summary(
    mode: str,
    new_files: list[str],
    all_raw: list[str],
    existing_clusters: list[str],
    existing_principles: list[str],
) -> str:
    if mode == "migration":
        head = (
            f"Migrated {len(all_raw)} flat thought files to raw/. "
            f"None yet clustered."
        )
    else:
        head = (
            f"Incremental dream: {len(new_files)} new raw thoughts since "
            f"last dream (of {len(all_raw)} total in raw/)."
        )
    parts = [
        head,
        f"Existing clusters: {len(existing_clusters)} "
        f"({', '.join(existing_clusters) if existing_clusters else 'none'})",
        f"Existing principles: {len(existing_principles)} "
        f"({', '.join(existing_principles) if existing_principles else 'none'})",
    ]
    return "\n".join(parts)
