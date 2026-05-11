"""Position-based problem queue (Solvo V4.1 Checkout).

Each active (pending or checked_out) problem has a unique `position` integer,
1 = top. Adding a problem at a position shifts every active task at or after
that position down by 1. No priority tiers; no same-priority ties.

Five operations exposed to agents:
- list_queue() -> list[Problem]: read-only view of active (pending+checked_out) in order
- get_next() -> Problem | None: take position-1, mark checked_out
- add(description, position, created_by) -> int: insert at position (None = append)
- complete(problem_id, summary, tick_id): mark done, stamp tick for soft guard
- reset_to_pending(problem_id, error_tail) -> str: recovery path for heartbeat

Internal callers only: reset_to_pending (heartbeat), _init_schema, _schema_version.
"""
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


SCHEMA_VERSION = 3
MAX_ATTEMPTS = 3

# `not_before` (V3): optional ISO 8601 UTC timestamp ("YYYY-MM-DD HH:MM Z" or
# similar). When set, get_next() skips the row until the wall clock has caught
# up. Stored verbatim as the agent supplied it; comparison is done with
# SQLite's datetime() which strips the trailing Z / +00:00 and treats the
# value as UTC, matching datetime('now').
SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS problems (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    description        TEXT NOT NULL,
    position           INTEGER NOT NULL,
    status             TEXT NOT NULL,
    created_by         TEXT,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_out_at     TIMESTAMP,
    completed_at       TIMESTAMP,
    completion_note    TEXT,
    attempt_count      INTEGER NOT NULL DEFAULT 0,
    last_error         TEXT,
    tick_completed_id  TEXT,
    not_before         TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_position
    ON problems(position)
    WHERE status IN ('pending', 'checked_out');

CREATE INDEX IF NOT EXISTS idx_status
    ON problems(status);
"""


class SchemaMismatchError(RuntimeError):
    """Raised when an existing DB file does not match SCHEMA_VERSION."""


class QueueBusyError(RuntimeError):
    """Raised when get_next() is called while another task is already checked_out."""


@dataclass
class Problem:
    id: int
    description: str
    position: int
    status: str
    created_by: Optional[str]
    created_at: Optional[str]
    checked_out_at: Optional[str]
    completed_at: Optional[str]
    completion_note: Optional[str]
    attempt_count: int
    last_error: Optional[str]
    tick_completed_id: Optional[str]
    not_before: Optional[str] = None


def _row_to_problem(row: sqlite3.Row) -> Problem:
    return Problem(
        id=row["id"],
        description=row["description"],
        position=row["position"],
        status=row["status"],
        created_by=row["created_by"],
        created_at=row["created_at"],
        checked_out_at=row["checked_out_at"],
        completed_at=row["completed_at"],
        completion_note=row["completion_note"],
        attempt_count=row["attempt_count"],
        last_error=row["last_error"],
        tick_completed_id=row["tick_completed_id"],
        not_before=row["not_before"] if "not_before" in row.keys() else None,
    )


class Checkout:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            # Detect legacy V1 schema (has 'priority' column) before creating anything.
            cur = conn.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name='problems'"
            ).fetchone()
            if cur is not None:
                cols = [r["name"] for r in conn.execute(
                    "PRAGMA table_info(problems)"
                ).fetchall()]
                if "priority" in cols and "position" not in cols:
                    raise SchemaMismatchError(
                        f"{self.db_path} uses the V1 schema (priority column). "
                        "V4.1 is a hard break — delete problems/ and re-run "
                        "`solvo init` to start fresh."
                    )

            conn.executescript(SCHEMA)
            stored = conn.execute(
                "SELECT value FROM meta WHERE key = 'schema_version'"
            ).fetchone()
            if stored is None:
                conn.execute(
                    "INSERT INTO meta(key, value) VALUES ('schema_version', ?)",
                    (str(SCHEMA_VERSION),),
                )
            else:
                current = int(stored["value"])
                if current == SCHEMA_VERSION:
                    pass
                elif current == 2 and SCHEMA_VERSION == 3:
                    # V2 -> V3 migration: add not_before column. The CREATE
                    # TABLE IF NOT EXISTS above is a no-op against the
                    # existing V2 table, so we ALTER it explicitly. Row data
                    # is preserved; new column defaults to NULL.
                    cols = [r["name"] for r in conn.execute(
                        "PRAGMA table_info(problems)"
                    ).fetchall()]
                    if "not_before" not in cols:
                        conn.execute(
                            "ALTER TABLE problems ADD COLUMN not_before TIMESTAMP"
                        )
                    conn.execute(
                        "UPDATE meta SET value = ? WHERE key = 'schema_version'",
                        (str(SCHEMA_VERSION),),
                    )
                else:
                    raise SchemaMismatchError(
                        f"{self.db_path} schema_version={stored['value']} "
                        f"but code expects {SCHEMA_VERSION}. Delete problems/ "
                        "and re-run `solvo init`."
                    )

    def get(self, problem_id: int) -> Optional[Problem]:
        """Fetch a single problem by id (any status). Returns None if not found."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM problems WHERE id = ?", (problem_id,)
            ).fetchone()
            return _row_to_problem(row) if row is not None else None

    def list_queue(self) -> list[Problem]:
        """Read-only view of active tasks in position order. No side effects.

        Agents use this for situational awareness before deciding where to
        insert a new task. Does not include done or failed tasks.
        """
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM problems "
                "WHERE status IN ('pending', 'checked_out') "
                "ORDER BY position ASC"
            ).fetchall()
            return [_row_to_problem(r) for r in rows]

    def get_next(self) -> Optional[Problem]:
        """Take position-1 from the queue; mark it checked_out.

        Raises QueueBusyError if any task is already checked_out — the
        heartbeat is expected to complete or reset one task before taking
        another. Returns None if the queue has no pending tasks.
        """
        with self._connect() as conn:
            busy = conn.execute(
                "SELECT id FROM problems WHERE status = 'checked_out' LIMIT 1"
            ).fetchone()
            if busy is not None:
                raise QueueBusyError(
                    f"problem #{busy['id']} is already checked_out; "
                    "complete or reset it before taking another"
                )
            # Skip rows gated on a future not_before. SQLite's datetime()
            # parses ISO 8601 with or without trailing Z / +HH:MM and treats
            # the result as UTC, matching datetime('now'). NULL not_before
            # means "always eligible".
            row = conn.execute(
                "SELECT * FROM problems WHERE status = 'pending' "
                "AND (not_before IS NULL "
                "     OR datetime(not_before) <= datetime('now')) "
                "ORDER BY position ASC LIMIT 1"
            ).fetchone()
            if row is None:
                return None
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE problems SET status = 'checked_out', "
                "checked_out_at = ? WHERE id = ?",
                (now, row["id"]),
            )
            problem = _row_to_problem(row)
            problem.status = "checked_out"
            problem.checked_out_at = now
            return problem

    def add(
        self,
        description: str,
        position: Optional[int],
        created_by: str,
        not_before: Optional[str] = None,
    ) -> int:
        """Insert at `position`, shifting every active task at >= that position
        down by 1. If `position` is None, append to the end.

        `not_before`: optional ISO 8601 UTC timestamp (e.g.
        '2026-05-10T11:35:00Z' or '2026-05-10 11:35Z'). When set, get_next()
        will skip the row until the wall clock has caught up — used by agents
        to schedule "come back later" tasks without burning ticks on a
        self-defer-via-prompt loop.

        Uses a two-phase negate trick to avoid colliding with the partial
        unique index mid-transaction: flip all shifted rows to negative,
        then bump them by one and re-negate. SQLite's partial unique index
        still treats them as unique throughout because original positions
        were unique, so their negations are also unique.
        """
        with self._connect() as conn:
            conn.execute("BEGIN")
            try:
                max_pos_row = conn.execute(
                    "SELECT COALESCE(MAX(position), 0) AS m FROM problems "
                    "WHERE status IN ('pending', 'checked_out')"
                ).fetchone()
                max_pos = max_pos_row["m"]

                if position is None:
                    target = max_pos + 1
                else:
                    if position < 1:
                        raise ValueError(
                            f"position must be >= 1; got {position}"
                        )
                    if position > max_pos + 1:
                        raise ValueError(
                            f"position {position} is beyond end of queue "
                            f"(active tasks: {max_pos}). Use position "
                            f"{max_pos + 1} or None to append."
                        )
                    target = position
                    # Two-phase negate shift
                    conn.execute(
                        "UPDATE problems SET position = -position "
                        "WHERE position >= ? "
                        "AND status IN ('pending', 'checked_out')",
                        (target,),
                    )
                    conn.execute(
                        "UPDATE problems SET position = -position + 1 "
                        "WHERE position < 0 "
                        "AND status IN ('pending', 'checked_out')"
                    )
                cursor = conn.execute(
                    "INSERT INTO problems "
                    "(description, position, status, created_by, not_before) "
                    "VALUES (?, ?, 'pending', ?, ?)",
                    (description, target, created_by, not_before),
                )
                conn.execute("COMMIT")
                return cursor.lastrowid
            except Exception:
                conn.execute("ROLLBACK")
                raise

    def complete(
        self,
        problem_id: int,
        summary: str,
        tick_id: Optional[str] = None,
    ) -> None:
        """Mark a checked_out problem as done. tick_id is stamped so the
        heartbeat can count completions per tick (soft-guard telemetry).
        """
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "UPDATE problems SET status = 'done', "
                "completed_at = ?, completion_note = ?, tick_completed_id = ? "
                "WHERE id = ?",
                (now, summary, tick_id, problem_id),
            )

    def reset_to_pending(self, problem_id: int, error_tail: str) -> str:
        """Recovery path: on main-agent failure, move a checked_out task
        back to pending, increment attempt_count, log error.

        After MAX_ATTEMPTS failures, moves to status='failed' instead of
        pending so the task stops cycling. Returns the new status string.
        Does NOT touch position (other insertions during the failed attempt
        may have already shifted it, which is correct).
        """
        with self._connect() as conn:
            row = conn.execute(
                "SELECT attempt_count FROM problems WHERE id = ?",
                (problem_id,),
            ).fetchone()
            if row is None:
                raise ValueError(f"problem #{problem_id} does not exist")
            new_attempts = row["attempt_count"] + 1
            new_status = "failed" if new_attempts >= MAX_ATTEMPTS else "pending"
            conn.execute(
                "UPDATE problems SET status = ?, "
                "attempt_count = ?, last_error = ?, checked_out_at = NULL "
                "WHERE id = ?",
                (new_status, new_attempts, error_tail, problem_id),
            )
            return new_status

    def reclaim_checked_out(self, reason: str) -> list[int]:
        """Heartbeat-startup recovery: reset every currently-checked_out task
        back to pending *without* bumping attempt_count.

        Ctrl-C, laptop sleep, API outage, and session termination can leave
        tasks orphaned in `checked_out` state. On the next heartbeat startup
        we want to pick them up transparently — they weren't really attempted
        in the sense that the agent's logic was the problem; the host died.

        Returns the list of task IDs that were reclaimed. `reason` is stored
        in last_error for post-hoc forensics.
        """
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id FROM problems WHERE status = 'checked_out'"
            ).fetchall()
            ids = [r["id"] for r in rows]
            if not ids:
                return []
            conn.execute(
                "UPDATE problems SET status = 'pending', "
                "checked_out_at = NULL, last_error = ? "
                "WHERE status = 'checked_out'",
                (reason,),
            )
            return ids

    def count_completions_for_tick(self, tick_id: str) -> int:
        """Soft-guard helper. Count how many problems were completed under
        this tick_id. Heartbeat expects <= 1; more indicates discipline drift.
        """
        with self._connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS c FROM problems WHERE tick_completed_id = ?",
                (tick_id,),
            ).fetchone()
            return row["c"]
