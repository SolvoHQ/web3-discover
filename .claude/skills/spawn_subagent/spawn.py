"""spawn_subagent skill — start a Claude Code sub-agent process and return
its output.

V4.1: 1 auto-retry on non-zero exit, retry prompt includes stderr tail.
V4.2: tags role="sub" so trace system writes per-spawn log files;
emits `subprocess_retry` event when the retry branch fires.
"""
import os
from pathlib import Path

from solvo.spawn import build_subprocess_env, claude_subprocess
from solvo.trace import open_trace_for_agent_side


RETRY_SUFFIX_TEMPLATE = (
    "\n\n## Previous attempt failed\n\n"
    "The subprocess exited non-zero. Stderr tail:\n\n"
    "```\n{stderr_tail}\n```\n\n"
    "Try again. Be defensive about the failure above — if it's a missing "
    "tool or permission issue, report that clearly in your output rather "
    "than fighting it."
)


def spawn_subagent(
    task_description: str,
    skills: list[str],
    workspace_path: Path,
    parent_agent_id: str,
) -> str:
    workspace_path = Path(workspace_path)
    template_path = workspace_path / "prompts" / "sub_agent.md"
    template = template_path.read_text()
    skill_list = "\n".join(f"- {s}" for s in skills) if skills else "(none)"
    prompt = template.format(
        task_description=task_description,
        skill_list=skill_list,
        parent_agent_id=parent_agent_id,
    )

    # Propagate per-tick state (SOLVO_TICK_ID + SOLVO_TRACE_DIR are set in
    # this process's env by the parent heartbeat → main-agent chain) so
    # the sub-agent's claude subprocess tees into the same trace run.
    # Everything else is filtered by the explicit allowlist.
    env = build_subprocess_env(
        tick_id=os.environ.get("SOLVO_TICK_ID", ""),
        trace_dir=os.environ.get("SOLVO_TRACE_DIR", ""),
        workspace_path=workspace_path,
        role="sub",
    )

    try:
        return claude_subprocess(
            prompt, cwd=workspace_path, env=env, role="sub"
        )
    except RuntimeError as first_error:
        stderr_tail = str(first_error)[-1000:]

        tracer = open_trace_for_agent_side()
        tick_id = os.environ.get("SOLVO_TICK_ID")
        if tracer is not None and tick_id:
            tracer.emit(
                "subprocess_retry",
                tick_id=tick_id,
                role="sub",
                parent_agent_id=parent_agent_id,
            )

        retry_prompt = prompt + RETRY_SUFFIX_TEMPLATE.format(
            stderr_tail=stderr_tail
        )
        return claude_subprocess(
            retry_prompt, cwd=workspace_path, env=env, role="sub"
        )
