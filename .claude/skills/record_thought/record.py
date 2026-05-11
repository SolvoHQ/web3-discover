"""Record a thought: writes product/thoughts/<tick>-<slug>.md (full body)
+ appends one index line to product/log.md.

API is deliberately minimal — three fields. No internal template; the
`body` argument is free-form markdown the agent organizes itself.
Principle is documented in SKILL.md, not enforced in code.
"""
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


LOG_REL_PATH = "product/log.md"
THOUGHTS_REL_DIR = "product/thoughts"

LOG_HEADER = (
    "# Thought log\n\n"
    "Append-only index of thoughts. Each line: timestamp / tick / "
    "slug / summary / pointer. Drill into the pointer file for the "
    "full thought.\n"
)


def record_thought(
    slug: str,
    summary: str,
    body: str,
    workspace_path: Optional[Path] = None,
) -> str:
    """Persist one thought. Returns the workspace-relative path of the
    new thought file (e.g. "product/thoughts/abc-wedge-pivot.md").

    Args:
        slug: kebab-case identifier — becomes filename slug, used by
              future grep / log lookups.
        summary: one-line index entry. Appended to product/log.md.
        body: full markdown content. Agent organizes structure freely.
              No template imposed — see SKILL.md for principles.
        workspace_path: defaults to cwd; overridable for tests.

    Note: same `(tick_id, slug)` pair overwrites; agent should choose
          distinct slugs per call within a tick.
    """
    if workspace_path is None:
        workspace_path = Path.cwd()
    workspace_path = Path(workspace_path)
    # Sentinel must be path-safe — used in filename construction below.
    tick_id = os.environ.get("SOLVO_TICK_ID", "unknown")
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")

    # Validate slug matches [a-z0-9][a-z0-9-]*
    if not re.match(r'^[a-z0-9][a-z0-9-]*$', slug):
        raise ValueError(
            f"Invalid slug '{slug}': must match [a-z0-9][a-z0-9-]* "
            "(start with alphanumeric, contain only lowercase alphanumeric or hyphens)"
        )

    thoughts_dir = workspace_path / THOUGHTS_REL_DIR
    thoughts_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{tick_id}-{slug}.md"
    thought_path = thoughts_dir / filename
    thought_path.write_text(body, encoding="utf-8")

    log_path = workspace_path / LOG_REL_PATH
    log_path.parent.mkdir(parents=True, exist_ok=True)
    if not log_path.exists():
        log_path.write_text(LOG_HEADER, encoding="utf-8")
    rel_thought = f"{THOUGHTS_REL_DIR}/{filename}"
    line = f"- {ts} | tick:{tick_id} | {slug} :: {summary} → {rel_thought}\n"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(line)

    return rel_thought
