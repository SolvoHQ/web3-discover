"""observe_external skill — see SKILL.md.

Agent-invoked, multi-source external-state probe. Single entry point
`observe()`. Returns markdown. Each source independently failable.
"""
from solvo.skills.observe_external.probe import (
    ALL_SOURCES,
    observe,
    observe_github,
    observe_gmail,
    observe_goatcounter,
    observe_railway,
    observe_vercel,
)

__all__ = [
    "ALL_SOURCES",
    "observe",
    "observe_github",
    "observe_gmail",
    "observe_goatcounter",
    "observe_railway",
    "observe_vercel",
]
