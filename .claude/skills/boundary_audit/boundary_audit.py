"""boundary_audit — premise-challenging, mode-aware Boundary critique.

Adapted from gstack's `plan-ceo-review`. Source skill operates in four
modes (SCOPE EXPANSION / SELECTIVE EXPANSION / HOLD SCOPE / SCOPE
REDUCTION) and asks the human which one applies. Here, the agent picks
its own mode using heuristics documented in SKILL.md, then runs the
rate-then-fix pattern across a fixed set of axes.

The substance kept: premise challenge, existing-code-leverage, dream-
state delta, the 0-10-then-what-makes-it-a-10 pattern, the inversion
reflex applied to each axis.

The substance stripped: AskUserQuestion per finding, the codex outside-
voice loop, the 11-section prescriptive expansion of every plan, the
~/.gstack persistence layer.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


THOUGHTS_REL_DIR = "product/thoughts"
SLUG = "boundary_audit-critique"

MODES = ("expansion", "selective", "hold", "reduction")

# The six review axes. Compressed from gstack's 11-section list — Solvo
# Boundaries are smaller than gstack plans, so the long-form structure
# becomes noise. Each axis still gets rate-then-fix.
AXES = (
    {
        "key": "premise",
        "name": "Premise challenge",
        "prompt": "Is this the right problem to solve? Could a different framing "
                  "yield a dramatically simpler or higher-impact path? What would "
                  "happen if we did nothing — real pain or hypothetical?",
    },
    {
        "key": "existing_leverage",
        "name": "Existing-code leverage",
        "prompt": "Map each sub-problem of this Boundary to existing code or "
                  "existing thoughts. What is being rebuilt that already exists? "
                  "If something is being rebuilt, why is rebuilding better than "
                  "refactoring or capturing outputs from an existing flow?",
    },
    {
        "key": "scope_shape",
        "name": "Scope shape",
        "prompt": "Is the Boundary the right size? Too big (suggest REDUCTION), "
                  "right (HOLD), or under-leveraging the moment (EXPANSION)? "
                  "Name the one thing inside scope that contributes the most "
                  "value and one thing that could be cut without changing the "
                  "outcome.",
    },
    {
        "key": "trajectory",
        "name": "Trajectory fit",
        "prompt": "Does this move the workspace toward its 12-month ideal end-"
                  "state, or sideways? Sketch CURRENT → THIS BOUNDARY → 12-MONTH "
                  "IDEAL. If the Boundary doesn't sit on that line, why ship it?",
    },
    {
        "key": "inversion",
        "name": "Inversion",
        "prompt": "What would make this fail? Name the top three ways this "
                  "Boundary could ship and still be a waste — and whether the "
                  "Boundary as written acknowledges those failure modes.",
    },
    {
        "key": "reversibility",
        "name": "Reversibility",
        "prompt": "If we ship this and it's wrong, what's the rollback cost? "
                  "One-way door (data migrations, public commitments, distribution "
                  "burn) needs more rigor than a two-way door (a content page, a "
                  "config tweak). Rate the reversibility 1=one-way, 5=trivial.",
    },
)


@dataclass
class BoundaryAuditCritique:
    target_path: Optional[str]
    mode: str                       # one of MODES
    mode_rationale: str             # one sentence — why this mode
    findings: list[dict]            # one per axis
    overall_score: int              # 0..10
    decision: str                   # "proceed" | "revise" | "reframe" | "kill"
    accepted_expansions: list[str]  # only when mode in (expansion, selective)
    deferred_to_todos: list[str]    # carried over to TODOs/Boundary backlog
    next_actions: list[str]         # concrete agent moves
    thought_path: str
    markdown: str


def pick_mode(
    boundary_size: str,
    has_users: bool,
    is_pivot: bool,
    is_hotfix: bool,
) -> str:
    """Autonomous mode selection heuristic. Returns one of MODES.

    The gstack version asks the human. Here we infer from observable
    state. Override at the call site if you have evidence the heuristic
    misses (and record_thought the override).

    Args:
        boundary_size: "small" | "medium" | "large" — agent's own estimate.
        has_users: is there any traffic / user signal yet?
        is_pivot: is this Boundary a course-change, not an iteration?
        is_hotfix: is this a fix for something that broke?
    """
    if is_hotfix:
        return "hold"
    if boundary_size == "large":
        return "reduction"
    if is_pivot and not has_users:
        # Pivoting pre-traffic = stay tight; don't dream-expand on a
        # premise that hasn't been validated.
        return "hold"
    if is_pivot and has_users:
        return "selective"
    # Default for fresh, validated direction with users in sight.
    return "selective"


def record_boundary_audit(
    target_path: Optional[str],
    mode: str,
    mode_rationale: str,
    findings: list[dict],
    overall_score: int,
    decision: str,
    accepted_expansions: Optional[list[str]] = None,
    deferred_to_todos: Optional[list[str]] = None,
    next_actions: Optional[list[str]] = None,
    workspace_path: Optional[Path] = None,
) -> BoundaryAuditCritique:
    """Persist a populated boundary audit critique.

    `findings` is a list of dicts, one per AXES key the agent answered:

        {
            "key": "premise" | "existing_leverage" | "scope_shape" |
                   "trajectory" | "inversion" | "reversibility",
            "rating": <int 0..10>,
            "finding": "<the agent's actual finding for this axis>",
            "gap_to_10": "<what would make this axis a 10>",
            "fix": "<concrete edit to make to the Boundary, or '' if no fix>",
        }
    """
    if workspace_path is None:
        workspace_path = Path.cwd()
    workspace_path = Path(workspace_path)
    if mode not in MODES:
        raise ValueError(f"Invalid mode {mode!r}; expected one of {MODES}")
    if decision not in ("proceed", "revise", "reframe", "kill"):
        raise ValueError(
            f"Invalid decision {decision!r}; expected proceed/revise/reframe/kill"
        )
    if not 0 <= overall_score <= 10:
        raise ValueError(f"overall_score must be 0..10, got {overall_score}")
    accepted_expansions = accepted_expansions or []
    deferred_to_todos = deferred_to_todos or []
    next_actions = next_actions or []

    md = _render_markdown(
        target_path=target_path,
        mode=mode,
        mode_rationale=mode_rationale,
        findings=findings,
        overall_score=overall_score,
        decision=decision,
        accepted_expansions=accepted_expansions,
        deferred_to_todos=deferred_to_todos,
        next_actions=next_actions,
    )
    thought_path = _write_thought(md, workspace_path)
    return BoundaryAuditCritique(
        target_path=target_path,
        mode=mode,
        mode_rationale=mode_rationale,
        findings=findings,
        overall_score=overall_score,
        decision=decision,
        accepted_expansions=accepted_expansions,
        deferred_to_todos=deferred_to_todos,
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
    mode: str,
    mode_rationale: str,
    findings: list[dict],
    overall_score: int,
    decision: str,
    accepted_expansions: list[str],
    deferred_to_todos: list[str],
    next_actions: list[str],
) -> str:
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tick = os.environ.get("SOLVO_TICK_ID", "unknown")
    by_key = {f["key"]: f for f in findings}

    lines = [
        "# Boundary audit critique",
        "",
        f"- tick: `{tick}`",
        f"- written: `{ts}`",
        f"- target: `{target_path or '(no artifact path supplied)'}`",
        f"- mode: **{mode}**  — {mode_rationale.strip()}",
        f"- overall_score: **{overall_score}/10**",
        f"- decision: **{decision}**",
        "",
        "## Axes",
        "",
    ]
    for axis in AXES:
        key = axis["key"]
        f = by_key.get(key)
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
        fix = f.get("fix", "").strip()
        if fix:
            lines.append(f"**Fix to make.** {fix}")
            lines.append("")

    if accepted_expansions:
        lines.append("## Accepted expansions")
        lines.append("")
        for x in accepted_expansions:
            lines.append(f"- {x}")
        lines.append("")
    if deferred_to_todos:
        lines.append("## Deferred to TODOs / Boundary backlog")
        lines.append("")
        for x in deferred_to_todos:
            lines.append(f"- {x}")
        lines.append("")
    lines.append("## Next actions")
    lines.append("")
    if next_actions:
        for x in next_actions:
            lines.append(f"- {x}")
    else:
        lines.append("_(none)_")
    lines.append("")
    return "\n".join(lines)
