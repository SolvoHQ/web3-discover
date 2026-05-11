"""wedge_audit — YC-style forcing-question critique of a candidate direction.

Adapted from gstack's `office-hours` skill for an autonomous agent loop.
The substance (six forcing questions, specificity-only rule, status-quo-as-
competitor framing) is preserved; the human-interactive scaffolding
(AskUserQuestion, voice triggers, ~/.gstack state) is removed.

Trigger mechanics live in SKILL.md — this module is the persistence + shape
layer. The agent reads `FORCING_QUESTIONS`, composes answers in its own
reasoning step, then calls `record_wedge_audit(...)` to write the critique
to `product/thoughts/<tick>-wedge_audit-critique.md`.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


THOUGHTS_REL_DIR = "product/thoughts"
SLUG = "wedge_audit-critique"


# The six forcing questions. The agent uses these prompts on itself when
# composing the critique — there is no AskUserQuestion in the loop.
FORCING_QUESTIONS = (
    {
        "key": "demand_reality",
        "prompt": "What's the strongest evidence that someone actually wants this — "
                  "not 'is interested,' not 'signed up for a waitlist,' but would be "
                  "genuinely upset if it disappeared tomorrow?",
        "red_flags": (
            "People say it's interesting.",
            "We got N waitlist signups.",
            "VCs are excited about the space.",
            "Hypothetical: I think users would want...",
        ),
        "gold": "Specific behaviour. Someone paying. Someone expanding usage. "
                "Someone whose workflow breaks when this is gone.",
    },
    {
        "key": "status_quo",
        "prompt": "What are users doing right now to solve this problem — even "
                  "badly? What does that workaround cost them?",
        "red_flags": (
            "Nothing — there's no solution, that's why the opportunity is big.",
            "Vague 'they struggle with X' framings with no observed workaround.",
        ),
        "gold": "Hours spent. Dollars wasted. Tools duct-taped together. Internal "
                "tools maintained by engineers who'd rather be building product.",
    },
    {
        "key": "desperate_specificity",
        "prompt": "Name the actual human who needs this most. What's their title? "
                  "What gets them promoted? What gets them fired? What keeps them "
                  "up at night?",
        "red_flags": (
            "Category-level answers: 'Healthcare enterprises.', 'SMBs.', 'devs.'",
            "Composite personas with no real exemplar.",
        ),
        "gold": "A name. A role. A specific consequence they face if the problem "
                "isn't solved.",
    },
    {
        "key": "narrowest_wedge",
        "prompt": "What's the smallest possible version of this that someone would "
                  "pay real money for — this week, not after the platform is built?",
        "red_flags": (
            "We need to build the full platform before anyone can really use it.",
            "We could strip it down but then it wouldn't be differentiated.",
        ),
        "gold": "One feature. One workflow. Something the agent could ship in days, "
                "not months, that solves enough.",
    },
    {
        "key": "observation_surprise",
        "prompt": "Has anyone actually used this without our help? What did they do "
                  "that we didn't expect?",
        "red_flags": (
            "We sent out a survey.",
            "Demo calls all went well.",
            "Nothing surprising, it's going as expected.",
        ),
        "gold": "A specific surprise. A user doing something the product wasn't "
                "designed for. That's often the real product trying to emerge.",
    },
    {
        "key": "future_fit",
        "prompt": "If the world looks meaningfully different in 3 years — and it "
                  "will — does this product become more essential or less?",
        "red_flags": (
            "The market is growing 20% per year.",
            "AI keeps getting better so we keep getting better.",
        ),
        "gold": "A specific claim about how users' world changes and why that change "
                "makes this product more valuable — not a rising-tide argument every "
                "competitor can also make.",
    },
)


@dataclass
class WedgeAuditCritique:
    """Result of running wedge_audit on a candidate direction."""
    target_path: Optional[str]   # path to the artifact critiqued, if any
    one_line_pitch: str          # the agent's own summary of what is being judged
    verdict: str                 # "worth-building" | "wedge-unclear" | "kill" | "needs-evidence"
    overall_score: int           # 0..10 — pre-mortem confidence this is worth the agent's tick budget
    findings: list[dict]         # one per forcing question
    assignment: str              # single concrete next action the agent should take
    thought_path: str            # workspace-relative path of the written thought file
    markdown: str                # full critique markdown (same as written to disk)


def run_wedge_audit(
    one_line_pitch: str,
    context: str,
    target_path: Optional[str] = None,
    workspace_path: Optional[Path] = None,
) -> WedgeAuditCritique:
    """Run the forcing-question pass and write a critique thought file.

    This function does NOT itself make the judgment calls — that is the
    agent's job. The agent is expected to:

      1. Read this module's `FORCING_QUESTIONS` and the SKILL.md prose.
      2. Compose the answers, findings, verdict, and assignment in its own
         reasoning step.
      3. Pass the assembled critique to `record_wedge_audit(...)` to
         persist it.

    The two-step split lets the agent reason freely without having the
    Python wrapper try to second-guess the substance. See SKILL.md for the
    full pattern.

    Args:
        one_line_pitch: agent's one-line summary of the direction.
        context: free-form text the agent extracted from the candidate
                 artifact + any related thoughts.
        target_path: workspace-relative path of the artifact (optional).
        workspace_path: defaults to cwd.

    Returns:
        WedgeAuditCritique with `markdown` empty and `findings` empty —
        the agent populates these and calls `record_wedge_audit`.
    """
    if workspace_path is None:
        workspace_path = Path.cwd()
    return WedgeAuditCritique(
        target_path=target_path,
        one_line_pitch=one_line_pitch,
        verdict="needs-evidence",
        overall_score=0,
        findings=[],
        assignment="",
        thought_path="",
        markdown="",
    )


def record_wedge_audit(
    one_line_pitch: str,
    verdict: str,
    overall_score: int,
    findings: list[dict],
    assignment: str,
    target_path: Optional[str] = None,
    workspace_path: Optional[Path] = None,
) -> WedgeAuditCritique:
    """Persist a populated critique to product/thoughts/<tick>-<slug>.md.

    `findings` is a list of dicts, one per forcing question that was
    answered. Each dict should have:

        {
            "key": "demand_reality" | "status_quo" | ...,
            "answer": "<what the agent claims is true>",
            "evidence": "<concrete pointer or source — file, log, quote>",
            "rating": <int 0..10>,
            "gap_to_10": "<what would make this a 10>",
        }

    Returns the same WedgeAuditCritique with markdown + thought_path set.
    """
    if workspace_path is None:
        workspace_path = Path.cwd()
    workspace_path = Path(workspace_path)

    if verdict not in ("worth-building", "wedge-unclear", "kill", "needs-evidence"):
        raise ValueError(
            f"Invalid verdict {verdict!r}; must be one of "
            "worth-building / wedge-unclear / kill / needs-evidence"
        )
    if not 0 <= overall_score <= 10:
        raise ValueError(f"overall_score must be 0..10, got {overall_score}")

    md = _render_markdown(
        one_line_pitch=one_line_pitch,
        verdict=verdict,
        overall_score=overall_score,
        findings=findings,
        assignment=assignment,
        target_path=target_path,
    )

    thought_path = _write_thought(md, workspace_path)

    return WedgeAuditCritique(
        target_path=target_path,
        one_line_pitch=one_line_pitch,
        verdict=verdict,
        overall_score=overall_score,
        findings=findings,
        assignment=assignment,
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
    one_line_pitch: str,
    verdict: str,
    overall_score: int,
    findings: list[dict],
    assignment: str,
    target_path: Optional[str],
) -> str:
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tick = os.environ.get("SOLVO_TICK_ID", "unknown")

    by_key = {f["key"]: f for f in findings}

    lines = [
        "# Wedge audit critique",
        "",
        f"- tick: `{tick}`",
        f"- written: `{ts}`",
        f"- target: `{target_path or '(no artifact path supplied)'}`",
        f"- verdict: **{verdict}**",
        f"- overall_score: **{overall_score}/10**",
        "",
        "## One-line pitch",
        "",
        one_line_pitch.strip(),
        "",
        "## Forcing questions",
        "",
    ]

    for q in FORCING_QUESTIONS:
        key = q["key"]
        title = key.replace("_", " ").title()
        f = by_key.get(key)
        lines.append(f"### {title}")
        lines.append("")
        lines.append(f"**Q.** {q['prompt']}")
        lines.append("")
        if f is None:
            lines.append("_Not answered this pass — gap._")
            lines.append("")
            continue
        rating = f.get("rating", "?")
        lines.append(f"**Answer ({rating}/10).** {f.get('answer', '').strip()}")
        lines.append("")
        ev = f.get("evidence", "").strip()
        if ev:
            lines.append(f"**Evidence.** {ev}")
            lines.append("")
        gap = f.get("gap_to_10", "").strip()
        if gap:
            lines.append(f"**What would make this a 10.** {gap}")
            lines.append("")

    lines.append("## Assignment")
    lines.append("")
    lines.append(assignment.strip() or "_(no assignment)_")
    lines.append("")
    return "\n".join(lines)
