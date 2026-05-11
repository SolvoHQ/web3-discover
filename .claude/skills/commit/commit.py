"""Solvo commit ritual: enforces product-impact + note + tick-id in message.

Per V4 doc 5.5 — every workspace mutation goes through this skill so the
message carries the agent's reading of what changed and how it shifts the
product. V4.1 adds a `tick-id` trailer so commits can be correlated with
heartbeat ticks after the fact.
"""
import os
import subprocess
from pathlib import Path
from typing import Literal


ProductImpact = Literal["none", "refines-shape", "shifts-direction"]

# Owner GitHub identity. All Solvo agents commit as the project owner
# so the work shows up on their contribution graph; per-workspace
# attribution rides in the Co-authored-by trailer below. cli.py also
# reads these constants when emitting GIT_AUTHOR_*/GIT_COMMITTER_* env
# vars to the container, so any nested git init the agent does inherits
# the same identity automatically.
OPERATOR_NAME = "west0nG"
OPERATOR_EMAIL = "westonguo@outlook.com"


def commit(
    title: str,
    body: str,
    product_impact: ProductImpact,
    note: str,
    workspace_path: Path,
) -> None:
    if product_impact not in ("none", "refines-shape", "shifts-direction"):
        raise ValueError(
            "product_impact must be one of "
            "none/refines-shape/shifts-direction; got "
            f"{product_impact!r}"
        )
    tick_id = os.environ.get("SOLVO_TICK_ID", "n/a")
    # Resolve before .name so a relative path like "." or a trailing-
    # slash path doesn't collapse the slug to empty (which silently
    # produces a `Co-authored-by: solvo- <…>` trailer with no agent ID).
    workspace_slug = Path(workspace_path).resolve().name
    if not workspace_slug:
        raise ValueError(
            f"workspace_path resolved to empty slug: {workspace_path!r}"
        )
    message = (
        f"{title}\n\n{body}\n\n"
        f"---\n"
        f"product-impact: {product_impact}\n"
        f"note: {note}\n"
        f"tick-id: {tick_id}\n"
        f"\n"
        f"Co-authored-by: solvo-{workspace_slug} <agent@west0n.top>\n"
    )
    subprocess.run(
        ["git", "-C", str(workspace_path), "config", "user.name", OPERATOR_NAME],
        check=True,
    )
    subprocess.run(
        ["git", "-C", str(workspace_path), "config", "user.email", OPERATOR_EMAIL],
        check=True,
    )
    subprocess.run(
        ["git", "-C", str(workspace_path), "add", "."],
        check=True,
    )
    subprocess.run(
        ["git", "-C", str(workspace_path), "commit", "-m", message],
        check=True,
    )
