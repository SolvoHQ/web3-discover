"""architecture_audit — pre-ship architecture / data-flow / edge-case critique.

Adapted from gstack's `plan-eng-review`. Substance kept: architecture
review, error & rescue mapping, data-flow tracing (happy / nil / empty
/ error), test coverage check, confidence-calibrated findings.

Substance stripped: AskUserQuestion per finding, the codex outside-
voice loop, the prerequisite-skill offer machinery, the team-mode /
vendoring detection bash preamble.

Invocation context (autonomous): the agent calls this DURING a
checked-out Boundary tick, AFTER the design step but BEFORE the
implementation diff is large enough to be expensive to throw away —
i.e. when you have a plan in head + maybe a stub or two, NOT when you
have a finished PR. The output is a structured finding list the agent
itself acts on in the same tick.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


THOUGHTS_REL_DIR = "product/thoughts"
SLUG = "architecture_audit-critique"

SEVERITIES = ("P0", "P1", "P2", "P3")

# Five review axes. Compressed from gstack's longer list — Solvo
# Boundaries usually touch < 10 files, so the long-form "11 sections"
# becomes noise. Each axis rate-then-fix.
AXES = (
    {
        "key": "architecture",
        "name": "Architecture & data flow",
        "prompt": "Draw the dependency graph for what this Boundary adds. For each "
                  "new data flow, trace four paths: happy / nil / empty / error. "
                  "What's the coupling delta? What breaks first under 10x load? "
                  "What's the rollback procedure if this ships and immediately "
                  "breaks production?",
    },
    {
        "key": "error_rescue",
        "name": "Error & rescue map",
        "prompt": "For every new method/codepath that can fail, name the specific "
                  "exception class, whether it is rescued, the rescue action, and "
                  "what the user sees. Catch-all `except Exception` is always a "
                  "smell. Swallowing errors without re-raise or user-visible "
                  "feedback is a P0 gap.",
    },
    {
        "key": "edge_cases",
        "name": "Edge cases & interactions",
        "prompt": "For each new user-visible interaction or background job, "
                  "enumerate edge cases — double submit, stale state, network "
                  "timeout mid-action, zero results, 10k results, queue backed up "
                  "two hours, job runs twice, partial completion. Which are "
                  "handled, which are gaps?",
    },
    {
        "key": "test_coverage",
        "name": "Test coverage",
        "prompt": "List every new codepath, async job, integration, and rescue "
                  "branch. For each: does a test exist or is it specced in the "
                  "Boundary? What's the test a hostile QA engineer would write? "
                  "What's the test that would make you confident shipping at 2am "
                  "on a Friday?",
    },
    {
        "key": "scope_minimality",
        "name": "Scope minimality",
        "prompt": "What is the minimum set of changes that achieves the stated "
                  "Boundary outcome? Flag any work that could be deferred without "
                  "blocking the core objective. If the Boundary touches more than "
                  "8 files or introduces more than 2 new classes/services, treat "
                  "that as a smell and propose a reduction.",
    },
)


@dataclass
class ArchitectureAuditFinding:
    axis_key: str
    severity: str           # P0..P3
    confidence: int         # 1..10 (gstack's calibration scale)
    title: str              # one-line finding (file:line if applicable)
    detail: str             # short paragraph
    fix: str                # concrete action OR "" if just flag


@dataclass
class ArchitectureAuditCritique:
    target_path: Optional[str]
    boundary_id: Optional[str]
    findings: list[dict]            # rich list, one per axis (rated)
    issues: list[dict]              # cross-axis flat list of ArchitectureAuditFinding-shape dicts
    overall_score: int              # 0..10
    ship_readiness: str             # "ship" | "fix-first" | "rework"
    next_actions: list[str]
    thought_path: str
    markdown: str


def record_architecture_audit(
    target_path: Optional[str],
    boundary_id: Optional[str],
    findings: list[dict],
    issues: list[dict],
    overall_score: int,
    ship_readiness: str,
    next_actions: Optional[list[str]] = None,
    workspace_path: Optional[Path] = None,
) -> ArchitectureAuditCritique:
    """Persist a populated architecture audit.

    `findings` is one dict per AXES key:

        {
            "key": "architecture" | ... ,
            "rating": <int 0..10>,
            "finding": "<short paragraph>",
            "gap_to_10": "<what would make this a 10>",
        }

    `issues` is the flat list of concrete problems found — each:

        {
            "axis_key": "<one of AXES keys>",
            "severity": "P0" | "P1" | "P2" | "P3",
            "confidence": <int 1..10>,
            "title": "<one-line, file:line if applicable>",
            "detail": "<paragraph>",
            "fix": "<concrete action or ''>",
        }

    Confidence calibration follows the gstack scale: 9-10 = verified by
    reading code; 7-8 = high-confidence pattern match; 5-6 = medium,
    verify; 3-4 = low (suppress unless P0); 1-2 = speculation.
    """
    if workspace_path is None:
        workspace_path = Path.cwd()
    workspace_path = Path(workspace_path)

    if ship_readiness not in ("ship", "fix-first", "rework"):
        raise ValueError(
            f"Invalid ship_readiness {ship_readiness!r}; expected ship/fix-first/rework"
        )
    if not 0 <= overall_score <= 10:
        raise ValueError(f"overall_score must be 0..10, got {overall_score}")
    for issue in issues:
        sev = issue.get("severity")
        if sev not in SEVERITIES:
            raise ValueError(f"Invalid severity {sev!r} in issue; expected one of {SEVERITIES}")
        conf = issue.get("confidence", 0)
        if not 1 <= conf <= 10:
            raise ValueError(f"Invalid confidence {conf!r} in issue; expected 1..10")

    next_actions = next_actions or []
    md = _render_markdown(
        target_path=target_path,
        boundary_id=boundary_id,
        findings=findings,
        issues=issues,
        overall_score=overall_score,
        ship_readiness=ship_readiness,
        next_actions=next_actions,
    )
    thought_path = _write_thought(md, workspace_path)
    return ArchitectureAuditCritique(
        target_path=target_path,
        boundary_id=boundary_id,
        findings=findings,
        issues=issues,
        overall_score=overall_score,
        ship_readiness=ship_readiness,
        next_actions=next_actions,
        thought_path=thought_path,
        markdown=md,
    )


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _write_thought(markdown: str, workspace_path: Path) -> str:
    tick_id = os.environ.get("SOLVO_TICK_ID", "unknown")
    thoughts_dir = workspace_path / THOUGHTS_REL_DIR
    thoughts_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{tick_id}-{SLUG}.md"
    path = thoughts_dir / filename
    path.write_text(markdown, encoding="utf-8")
    return f"{THOUGHTS_REL_DIR}/{filename}"


def _render_markdown(
    target_path: Optional[str],
    boundary_id: Optional[str],
    findings: list[dict],
    issues: list[dict],
    overall_score: int,
    ship_readiness: str,
    next_actions: list[str],
) -> str:
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tick = os.environ.get("SOLVO_TICK_ID", "unknown")
    by_key = {f["key"]: f for f in findings}

    lines = [
        "# Architecture audit critique",
        "",
        f"- tick: `{tick}`",
        f"- written: `{ts}`",
        f"- target: `{target_path or '(no artifact path supplied)'}`",
        f"- boundary: `{boundary_id or '(not specified)'}`",
        f"- overall_score: **{overall_score}/10**",
        f"- ship_readiness: **{ship_readiness}**",
        "",
        "## Axes",
        "",
    ]
    for axis in AXES:
        f = by_key.get(axis["key"])
        lines.append(f"### {axis['name']}")
        lines.append("")
        lines.append(f"**Q.** {axis['prompt']}")
        lines.append("")
        if f is None:
            lines.append("_Not reviewed this pass — gap._")
            lines.append("")
            continue
        rating = f.get("rating", "?")
        lines.append(f"**Finding ({rating}/10).** {f.get('finding', '').strip()}")
        lines.append("")
        gap = f.get("gap_to_10", "").strip()
        if gap:
            lines.append(f"**What would make this a 10.** {gap}")
            lines.append("")

    if issues:
        lines.append("## Concrete issues")
        lines.append("")
        # Sort by severity then descending confidence.
        sev_rank = {s: i for i, s in enumerate(SEVERITIES)}
        sorted_issues = sorted(
            issues,
            key=lambda x: (sev_rank.get(x.get("severity", "P3"), 99), -x.get("confidence", 0)),
        )
        for i, issue in enumerate(sorted_issues, 1):
            sev = issue["severity"]
            conf = issue["confidence"]
            ax = issue.get("axis_key", "")
            title = issue.get("title", "").strip()
            detail = issue.get("detail", "").strip()
            fix = issue.get("fix", "").strip()
            lines.append(f"### {i}. [{sev}] (confidence: {conf}/10) {title}")
            lines.append("")
            lines.append(f"_Axis_: `{ax}`")
            lines.append("")
            if detail:
                lines.append(detail)
                lines.append("")
            if fix:
                lines.append(f"**Fix.** {fix}")
                lines.append("")
    else:
        lines.append("## Concrete issues")
        lines.append("")
        lines.append("_None found this pass._")
        lines.append("")

    lines.append("## Next actions")
    lines.append("")
    if next_actions:
        for a in next_actions:
            lines.append(f"- {a}")
    else:
        lines.append("_(none)_")
    lines.append("")
    return "\n".join(lines)
