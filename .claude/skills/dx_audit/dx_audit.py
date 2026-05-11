"""dx_audit — DX critique with persona + competitor framing.

Adapted from gstack's `plan-devex-review`. Substance kept: developer
persona framing, competitive benchmarking, magical-moment design, the
0-10-then-what-makes-it-a-10 rubric, TTHW tiering.

Substance stripped: AskUserQuestion per friction point, the codex
outside-voice loop, the per-pass dx-hall-of-fame.md reader (compressed
into the SKILL.md prose), the gstack DX-trend / state machinery.

Invocation context (autonomous): the agent calls this BEFORE shipping
any DX-facing artifact — an API, a CLI, an SDK, an embed widget, a
docs page that will be the first thing a developer sees, a public
landing page meant to convert. Not for internal-only artifacts.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


THOUGHTS_REL_DIR = "product/thoughts"
SLUG = "dx_audit-critique"

# Three modes from the gstack skill, autonomous selection.
MODES = ("expansion", "polish", "triage")

# TTHW tiers (Time To Hello World).
TTHW_TIERS = (
    {"name": "Champion", "max_minutes": 2,   "note": "Stripe/Vercel territory; 3-4x adoption multiplier."},
    {"name": "Competitive", "max_minutes": 5, "note": "Baseline for modern dev tools."},
    {"name": "Needs Work", "max_minutes": 10, "note": "Significant drop-off; competitors will out-onboard you."},
    {"name": "Red Flag", "max_minutes": 999, "note": "50-70% abandon within first attempt."},
)

# Six passes — compressed from the gstack 8-pass list. Drops "Community
# & Ecosystem" (downstream of having any users at all — premature for
# Solvo-scale workspaces) and "DX Measurement" (becomes a Solvo
# observe_external concern, not a per-Boundary review concern).
PASSES = (
    {
        "key": "getting_started",
        "name": "Getting Started — zero friction at T0",
        "prompt": "Can the target developer go from 'never heard of this' to "
                  "'it worked' in one terminal session, under the chosen TTHW "
                  "tier, without leaving the terminal? Where's the magical "
                  "moment delivered? How many steps before they see real "
                  "output?",
    },
    {
        "key": "api_design",
        "name": "API / CLI / SDK design — usable + useful",
        "prompt": "Is the interface guessable without docs? Sensible defaults "
                  "for every parameter? Consistent grammar across the surface? "
                  "Does the simplest call give a useful result? Does the "
                  "interface match how the chosen persona thinks about the "
                  "problem?",
    },
    {
        "key": "error_messages",
        "name": "Error messages & debugging — fight uncertainty",
        "prompt": "When the dev hits an error, do they see: what happened, "
                  "why, how to fix it, where to learn more, the actual values "
                  "that caused it? Tier 1 (conversational, Elm-style), Tier 2 "
                  "(annotated source, Rust-style), or Tier 3 (structured + "
                  "doc_url, Stripe-style)?",
    },
    {
        "key": "docs",
        "name": "Documentation & learning — findable + learn-by-doing",
        "prompt": "Can the persona find what they need in < 2 minutes? Are "
                  "code examples copy-paste complete? Do they show real "
                  "context (not toy hello-world)? Is there a clear split "
                  "between tutorial and reference?",
    },
    {
        "key": "upgrade_path",
        "name": "Upgrade & migration — credible",
        "prompt": "Can devs upgrade without fear? What breaks on a minor "
                  "bump? Are deprecations actionable ('use newMethod()'), "
                  "with a migration guide, ideally a codemod? Is the "
                  "versioning policy stated?",
    },
    {
        "key": "tooling_fit",
        "name": "Tooling & environment fit — valuable + accessible",
        "prompt": "Does this integrate with the persona's existing stack? "
                  "Editor / language server / autocomplete? CI mode "
                  "(non-interactive, exit codes)? TypeScript types if JS? "
                  "Cross-platform (mac/linux/windows; amd64/arm64)? "
                  "Containerizable? Dry-run mode?",
    },
)


@dataclass
class DxAuditCritique:
    target_path: Optional[str]
    mode: str
    persona: dict                   # who / context / tolerance / expects
    tthw_actual_minutes: int        # the agent's honest current estimate
    tthw_target_tier: str           # "Champion" | "Competitive" | "Needs Work"
    magical_moment: str             # the moment that converts "trying" → "this is real"
    competitor_benchmark: list[dict]  # rows: tool / tthw_min / notable / source
    findings: list[dict]            # one per PASSES key
    issues: list[dict]              # cross-pass concrete fix list
    overall_score: int              # 0..10
    ship_readiness: str             # "ship" | "polish-first" | "rebuild-onboarding"
    next_actions: list[str]
    thought_path: str
    markdown: str


def pick_mode(
    is_first_external_artifact: bool,
    is_hotfix: bool,
    competitor_present: bool,
) -> str:
    """Autonomous mode selection.

    Args:
        is_first_external_artifact: is this the first DX-facing thing
            the workspace ships? (Greenfield — push for advantage.)
        is_hotfix: shipping in a hurry to fix something broken.
        competitor_present: is there an established competitor whose DX
            you'd need to leapfrog to win attention?
    """
    if is_hotfix:
        return "triage"
    if is_first_external_artifact and competitor_present:
        return "expansion"
    return "polish"


def tier_for_tthw(actual_minutes: int) -> str:
    for tier in TTHW_TIERS:
        if actual_minutes <= tier["max_minutes"]:
            return tier["name"]
    return TTHW_TIERS[-1]["name"]


def record_dx_audit(
    target_path: Optional[str],
    mode: str,
    persona: dict,
    tthw_actual_minutes: int,
    tthw_target_tier: str,
    magical_moment: str,
    competitor_benchmark: list[dict],
    findings: list[dict],
    issues: list[dict],
    overall_score: int,
    ship_readiness: str,
    next_actions: Optional[list[str]] = None,
    workspace_path: Optional[Path] = None,
) -> DxAuditCritique:
    """Persist a populated DX audit critique.

    `persona` shape:
        {"who": "...", "context": "...", "tolerance": "...", "expects": "..."}

    `competitor_benchmark` rows:
        {"tool": "...", "tthw_minutes": <int>, "notable": "...", "source": "..."}

    `findings` is one dict per PASSES key:
        {"key": "getting_started" | ..., "rating": <0..10>,
         "finding": "...", "gap_to_10": "..."}

    `issues`:
        {"pass_key": "...", "severity": "P0"|"P1"|"P2"|"P3",
         "title": "...", "detail": "...", "fix": "..."}
    """
    if workspace_path is None:
        workspace_path = Path.cwd()
    workspace_path = Path(workspace_path)
    if mode not in MODES:
        raise ValueError(f"Invalid mode {mode!r}; expected one of {MODES}")
    if ship_readiness not in ("ship", "polish-first", "rebuild-onboarding"):
        raise ValueError(
            f"Invalid ship_readiness {ship_readiness!r}; expected "
            "ship/polish-first/rebuild-onboarding"
        )
    if not 0 <= overall_score <= 10:
        raise ValueError(f"overall_score must be 0..10, got {overall_score}")
    next_actions = next_actions or []
    md = _render_markdown(
        target_path=target_path,
        mode=mode,
        persona=persona,
        tthw_actual_minutes=tthw_actual_minutes,
        tthw_target_tier=tthw_target_tier,
        magical_moment=magical_moment,
        competitor_benchmark=competitor_benchmark,
        findings=findings,
        issues=issues,
        overall_score=overall_score,
        ship_readiness=ship_readiness,
        next_actions=next_actions,
    )
    thought_path = _write_thought(md, workspace_path)
    return DxAuditCritique(
        target_path=target_path,
        mode=mode,
        persona=persona,
        tthw_actual_minutes=tthw_actual_minutes,
        tthw_target_tier=tthw_target_tier,
        magical_moment=magical_moment,
        competitor_benchmark=competitor_benchmark,
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
    mode: str,
    persona: dict,
    tthw_actual_minutes: int,
    tthw_target_tier: str,
    magical_moment: str,
    competitor_benchmark: list[dict],
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
        "# DX audit critique",
        "",
        f"- tick: `{tick}`",
        f"- written: `{ts}`",
        f"- target: `{target_path or '(no artifact path supplied)'}`",
        f"- mode: **{mode}**",
        f"- overall_score: **{overall_score}/10**",
        f"- ship_readiness: **{ship_readiness}**",
        "",
        "## Target developer persona",
        "",
        f"- **Who.** {persona.get('who', '').strip()}",
        f"- **Context.** {persona.get('context', '').strip()}",
        f"- **Tolerance.** {persona.get('tolerance', '').strip()}",
        f"- **Expects.** {persona.get('expects', '').strip()}",
        "",
        "## TTHW",
        "",
        f"- Current estimate: **{tthw_actual_minutes} min** "
        f"({tier_for_tthw(tthw_actual_minutes)})",
        f"- Target tier: **{tthw_target_tier}**",
        "",
        "## Magical moment",
        "",
        magical_moment.strip() or "_(not designed yet)_",
        "",
        "## Competitive benchmark",
        "",
    ]
    if competitor_benchmark:
        lines.append("| Tool | TTHW (min) | Notable DX choice | Source |")
        lines.append("|------|------------|--------------------|--------|")
        for row in competitor_benchmark:
            lines.append(
                f"| {row.get('tool', '')} | {row.get('tthw_minutes', '?')} | "
                f"{row.get('notable', '')} | {row.get('source', '')} |"
            )
        lines.append("")
    else:
        lines.append("_No benchmark gathered this pass — gap._")
        lines.append("")

    lines.append("## Passes")
    lines.append("")
    for p in PASSES:
        f = by_key.get(p["key"])
        lines.append(f"### {p['name']}")
        lines.append("")
        lines.append(f"**Q.** {p['prompt']}")
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

    lines.append("## Concrete issues")
    lines.append("")
    if issues:
        sev_rank = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
        sorted_issues = sorted(issues, key=lambda x: sev_rank.get(x.get("severity", "P3"), 99))
        for i, issue in enumerate(sorted_issues, 1):
            sev = issue["severity"]
            pk = issue.get("pass_key", "")
            title = issue.get("title", "").strip()
            detail = issue.get("detail", "").strip()
            fix = issue.get("fix", "").strip()
            lines.append(f"### {i}. [{sev}] {title}")
            lines.append("")
            lines.append(f"_Pass_: `{pk}`")
            lines.append("")
            if detail:
                lines.append(detail)
                lines.append("")
            if fix:
                lines.append(f"**Fix.** {fix}")
                lines.append("")
    else:
        lines.append("_None this pass._")
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
