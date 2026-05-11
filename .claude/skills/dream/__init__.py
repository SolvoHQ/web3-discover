"""dream skill — consolidate product/thoughts/ into a 3-tier hierarchy
(raw → cluster → principle) with zero information loss. See SKILL.md.
"""
from solvo.skills.dream.dream import (
    start_dream,
    write_cluster,
    write_principle,
    verify_no_loss,
    render_dream_summary,
    DreamPlan,
    RawThought,
    ClusterEntry,
    PrincipleEvidence,
    VerifyReport,
    THOUGHTS_REL_DIR,
    RAW_SUBDIR,
    CLUSTER_SUBDIR,
    PRINCIPLE_SUBDIR,
    STATE_FILE,
)

__all__ = [
    "start_dream",
    "write_cluster",
    "write_principle",
    "verify_no_loss",
    "render_dream_summary",
    "DreamPlan",
    "RawThought",
    "ClusterEntry",
    "PrincipleEvidence",
    "VerifyReport",
    "THOUGHTS_REL_DIR",
    "RAW_SUBDIR",
    "CLUSTER_SUBDIR",
    "PRINCIPLE_SUBDIR",
    "STATE_FILE",
]
