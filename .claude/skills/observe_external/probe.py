"""observe_external: agent-invoked, multi-source external-state probe.

Returns a structured markdown string. Each source (vercel / gmail /
github / goatcounter / railway) is independently failable — missing
credentials or network errors degrade to a one-line segment, never
raise. State per source is persisted under
`<workspace>/.solvo/state/observe_external_<source>.json` so consecutive
calls return delta, not the whole history.

The skill is invoked by the agent (not auto-injected per tick). One
entry point — `observe()` — fan-outs internally and renders.
"""
from __future__ import annotations

import email
import imaplib
import json
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parseaddr, parsedate_to_datetime
from pathlib import Path
from typing import Any, Callable, Optional
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest


# --- Constants ---------------------------------------------------------

DEFAULT_SINCE_HOURS = 24
HTTP_TIMEOUT_S = 15
GMAIL_BODY_PREVIEW_CHARS = 240
GITHUB_API = "https://api.github.com"
GOATCOUNTER_API_TEMPLATE = "https://{site}.goatcounter.com/api/v0"
RAILWAY_AFFILIATE_API = "https://backboard.railway.app/graphql/v2"
VERCEL_API = "https://api.vercel.com"

ALL_SOURCES = ("vercel", "gmail", "github", "goatcounter", "railway")


# --- State persistence -------------------------------------------------

def _state_dir() -> Path:
    """Resolve <workspace>/.solvo/state, creating if missing.

    Prefers SOLVO_WORKSPACE env (set by heartbeat/spawn). Falls back to
    CWD so the skill also works when invoked outside a container (e.g.
    operator running it from solvo repo root for smoke-test)."""
    ws = os.environ.get("SOLVO_WORKSPACE")
    if ws:
        root = Path(ws)
    else:
        root = Path.cwd()
    state = root / ".solvo" / "state"
    state.mkdir(parents=True, exist_ok=True)
    return state


def _state_path(source: str) -> Path:
    return _state_dir() / f"observe_external_{source}.json"


def _load_state(source: str) -> dict:
    p = _state_path(source)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def _save_state(source: str, state: dict) -> None:
    p = _state_path(source)
    try:
        p.write_text(json.dumps(state, indent=2, sort_keys=True))
    except OSError:
        # Non-fatal — state will simply not persist across calls. The
        # agent should still get the current snapshot.
        pass


# --- HTTP helper -------------------------------------------------------

def _http_get(
    url: str,
    headers: Optional[dict] = None,
    timeout: int = HTTP_TIMEOUT_S,
) -> tuple[int, str]:
    """Minimal stdlib HTTP GET. Returns (status, body_text).

    Raises on connect / timeout / non-2xx if the caller doesn't catch
    urllib errors. Callers are expected to wrap in try/except so a
    single source's failure doesn't break the whole observe() call.
    """
    req = urlrequest.Request(url, headers=headers or {})
    with urlrequest.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        return resp.getcode(), body


def _http_post(
    url: str,
    body: bytes,
    headers: Optional[dict] = None,
    timeout: int = HTTP_TIMEOUT_S,
) -> tuple[int, str]:
    req = urlrequest.Request(
        url, data=body, headers=headers or {}, method="POST"
    )
    with urlrequest.urlopen(req, timeout=timeout) as resp:
        return resp.getcode(), resp.read().decode("utf-8", errors="replace")


# --- Per-source observers ---------------------------------------------

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso_z(dt: datetime) -> str:
    """ISO 8601 with trailing Z (UTC). Easier to grep in state files."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_iso_z(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def _segment(title: str, lines: list[str]) -> str:
    """Render one source segment as markdown."""
    return f"## {title}\n" + "\n".join(lines) + "\n"


# --- Vercel ------------------------------------------------------------

def observe_vercel(since_hours: int) -> str:
    token = os.environ.get("VERCEL_TOKEN")
    project = os.environ.get("VERCEL_PROJECT_ID")
    team = os.environ.get("VERCEL_TEAM_ID")
    if not token or not project:
        return _segment(
            "Vercel",
            ["- no vercel credentials "
             "(need VERCEL_TOKEN + VERCEL_PROJECT_ID)"]
        )

    state = _load_state("vercel")
    now = _now_utc()
    last_check = _parse_iso_z(state.get("last_check_at", ""))
    # Window is max(since_hours, time-since-last-check). This way the
    # operator-supplied since_hours is a floor, not a ceiling.
    window_start = now - timedelta(hours=since_hours)
    if last_check is not None and last_check < window_start:
        # Last check older than the floor — extend window to cover it.
        window_start = last_check

    qs = {
        "projectId": project,
        "from": str(int(window_start.timestamp() * 1000)),
        "to": str(int(now.timestamp() * 1000)),
    }
    if team:
        qs["teamId"] = team
    url = f"{VERCEL_API}/v1/web/insights/views?{urlparse.urlencode(qs)}"
    headers = {"Authorization": f"Bearer {token}"}

    lines = [
        f"- since last check: {state.get('last_check_at', 'first call')}",
        f"- window: last {since_hours}h",
    ]
    try:
        status, body = _http_get(url, headers=headers)
        if status >= 400:
            lines.append(f"- error: HTTP {status}: {body[:160]}")
        else:
            data = json.loads(body) if body else {}
            # Vercel returns either {"data": [...]} or {"total": N,
            # "topPaths": [...]} depending on plan tier. Handle both
            # shapes defensively.
            total = data.get("total")
            if total is None and isinstance(data.get("data"), list):
                total = sum(
                    int(item.get("count", 0)) for item in data["data"]
                )
            prev_total = state.get("last_total")
            delta_str = ""
            if isinstance(prev_total, int) and isinstance(total, int):
                delta = total - prev_total
                sign = "+" if delta >= 0 else ""
                delta_str = f"  ({sign}{delta} vs prev window)"
            lines.append(
                f"- pageviews: {total if total is not None else 'n/a'}"
                f"{delta_str}"
            )
            top = data.get("topPaths") or data.get("paths") or []
            if top:
                lines.append("- top paths:")
                for row in top[:10]:
                    p = row.get("path") or row.get("name") or "?"
                    c = row.get("count") or row.get("views") or 0
                    lines.append(f"  - {p}  {c}")
            if isinstance(total, int):
                state["last_total"] = total
    except (urlerror.URLError, json.JSONDecodeError, TimeoutError, OSError) as exc:
        lines.append(f"- error: {type(exc).__name__}: {str(exc)[:160]}")

    state["last_check_at"] = _iso_z(now)
    _save_state("vercel", state)
    return _segment("Vercel", lines)


# --- Gmail (IMAP) ------------------------------------------------------

def observe_gmail(since_hours: int) -> str:
    keys = [
        "AGENT_EMAIL_IMAP_HOST",
        "AGENT_EMAIL_IMAP_USERNAME",
        "AGENT_EMAIL_IMAP_APP_PASSWORD",
    ]
    if any(not os.environ.get(k) for k in keys):
        return _segment(
            "Gmail",
            ["- no gmail credentials "
             "(need AGENT_EMAIL_IMAP_HOST/USERNAME/APP_PASSWORD)"]
        )

    state = _load_state("gmail")
    now = _now_utc()
    last_uid = state.get("last_uid")
    window_start = now - timedelta(hours=since_hours)

    host = os.environ["AGENT_EMAIL_IMAP_HOST"]
    port = int(os.environ.get("AGENT_EMAIL_IMAP_PORT", "993"))
    user = os.environ["AGENT_EMAIL_IMAP_USERNAME"]
    pw = os.environ["AGENT_EMAIL_IMAP_APP_PASSWORD"]
    folder = os.environ.get("AGENT_EMAIL_IMAP_FOLDER", "INBOX")

    lines = [
        f"- since last check: {state.get('last_check_at', 'first call')}",
        f"- window: last {since_hours}h",
    ]
    try:
        m = imaplib.IMAP4_SSL(host, port)
        try:
            m.login(user, pw)
            m.select(folder)
            # IMAP SINCE takes a date (DD-Mon-YYYY) — coarser than we
            # want, but UID-based delta below tightens it.
            since_str = window_start.strftime("%d-%b-%Y")
            typ, data = m.search(None, f'(SINCE "{since_str}")')
            uids: list[str] = []
            if typ == "OK" and data and data[0]:
                uids = data[0].decode().split()
            # Filter by UID > last_uid to get strict delta after first call.
            if last_uid is not None:
                try:
                    last_uid_int = int(last_uid)
                    uids = [u for u in uids if int(u) > last_uid_int]
                except ValueError:
                    pass
            lines.append(f"- new since last check: {len(uids)}")
            for uid in uids[-20:]:   # cap to last 20 to keep output sane
                typ, fetched = m.fetch(uid.encode(), "(RFC822)")
                if typ != "OK" or not fetched or not fetched[0]:
                    continue
                raw = fetched[0][1]
                msg = email.message_from_bytes(raw)
                _, from_addr = parseaddr(msg.get("From", ""))
                subject = (msg.get("Subject", "") or "").strip()
                date_hdr = msg.get("Date", "") or ""
                try:
                    dt = parsedate_to_datetime(date_hdr)
                    date_str = dt.astimezone(timezone.utc).strftime(
                        "%Y-%m-%d %H:%M"
                    )
                except (TypeError, ValueError):
                    date_str = "?"
                body_text = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            payload = part.get_payload(decode=True) or b""
                            body_text = payload.decode(
                                part.get_content_charset() or "utf-8",
                                errors="replace",
                            )
                            break
                else:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        body_text = payload.decode(
                            msg.get_content_charset() or "utf-8",
                            errors="replace",
                        )
                preview = " ".join(body_text.split())[
                    :GMAIL_BODY_PREVIEW_CHARS
                ]
                lines.append(
                    f"- {date_str}  {from_addr}  {subject}\n"
                    f"  \"{preview}\""
                )
            if uids:
                state["last_uid"] = uids[-1]
        finally:
            try:
                m.logout()
            except Exception:
                pass
    except (imaplib.IMAP4.error, OSError, TimeoutError) as exc:
        lines.append(f"- error: {type(exc).__name__}: {str(exc)[:160]}")

    state["last_check_at"] = _iso_z(now)
    _save_state("gmail", state)
    return _segment("Gmail", lines)


# --- GitHub ------------------------------------------------------------

def _gh_request(path: str, token: str) -> tuple[int, Any]:
    url = f"{GITHUB_API}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "solvo-observe-external",
    }
    status, body = _http_get(url, headers=headers)
    try:
        return status, json.loads(body) if body else None
    except json.JSONDecodeError:
        return status, body


def observe_github(since_hours: int) -> str:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        return _segment(
            "GitHub",
            ["- no github credentials (need GH_TOKEN or GITHUB_TOKEN)"]
        )

    state = _load_state("github")
    now = _now_utc()
    last_check = _parse_iso_z(state.get("last_check_at", ""))
    window_start = now - timedelta(hours=since_hours)
    if last_check is not None and last_check < window_start:
        window_start = last_check
    since_iso = _iso_z(window_start)

    lines = [
        f"- since last check: {state.get('last_check_at', 'first call')}",
        f"- window: since {since_iso}",
    ]
    try:
        # Resolve current user once so we can scope to author=us.
        status, me = _gh_request("/user", token)
        if status >= 400 or not isinstance(me, dict):
            lines.append(f"- error: /user HTTP {status}")
            state["last_check_at"] = _iso_z(now)
            _save_state("github", state)
            return _segment("GitHub", lines)
        login = me.get("login")
        lines.append(f"- viewer: {login}")

        # Search for PRs + issues authored by us, updated since window.
        # We hit /search/issues which covers both PRs and issues in one
        # call. `updated:>=` gives us anything that changed state or
        # received a comment in the window.
        q = (
            f"author:{login} updated:>={since_iso[:10]}"
        )
        path = (
            "/search/issues"
            f"?q={urlparse.quote(q)}&sort=updated&order=desc&per_page=50"
        )
        status, data = _gh_request(path, token)
        if status >= 400 or not isinstance(data, dict):
            lines.append(f"- error: search HTTP {status}")
        else:
            items = data.get("items", [])
            # Filter precisely by updated_at timestamp (search granularity
            # is day-level on the `>=` filter).
            filtered = []
            seen_ids = set(state.get("seen_ids", []))
            for item in items:
                upd = _parse_iso_z(item.get("updated_at", "").replace(
                    "+00:00", "Z"
                ))
                if upd is None:
                    continue
                if upd < window_start:
                    continue
                filtered.append(item)
            lines.append(f"- changed: {len(filtered)}")
            new_ids = []
            for item in filtered[:25]:
                kind = "PR" if "pull_request" in item else "issue"
                state_str = item.get("state", "?")
                # Detect merged for PRs (search response doesn't include
                # merged flag — pull_request.merged_at presence is the
                # signal).
                pr = item.get("pull_request") or {}
                if kind == "PR" and pr.get("merged_at"):
                    state_str = "merged"
                repo_url = item.get("repository_url", "")
                repo_short = "/".join(repo_url.split("/")[-2:])
                num = item.get("number")
                title = (item.get("title", "") or "").strip()[:80]
                changed_flag = (
                    " NEW" if item.get("id") not in seen_ids else ""
                )
                lines.append(
                    f"  - {repo_short} #{num}  {kind}  "
                    f"{state_str}{changed_flag}  {title}"
                )
                new_ids.append(item.get("id"))
            # Keep last 200 distinct ids — enough to detect "new since"
            # without bloating the state file. dict.fromkeys preserves
            # insertion order while deduping. Note: seen_ids is a set
            # locally but persisted as a sorted list for stable diffs.
            merged_seen = set(seen_ids)
            for i in new_ids:
                if i is not None:
                    merged_seen.add(i)
            state["seen_ids"] = sorted(merged_seen)[-200:]
    except (urlerror.URLError, TimeoutError, OSError) as exc:
        lines.append(f"- error: {type(exc).__name__}: {str(exc)[:160]}")

    state["last_check_at"] = _iso_z(now)
    _save_state("github", state)
    return _segment("GitHub", lines)


# --- GoatCounter -------------------------------------------------------

def observe_goatcounter(since_hours: int) -> str:
    site = os.environ.get("GOATCOUNTER_SITE")
    token = os.environ.get("GOATCOUNTER_TOKEN")
    if not site or not token:
        return _segment(
            "GoatCounter",
            ["- no goatcounter credentials "
             "(need GOATCOUNTER_SITE + GOATCOUNTER_TOKEN)"]
        )

    state = _load_state("goatcounter")
    now = _now_utc()
    last_check = _parse_iso_z(state.get("last_check_at", ""))
    window_start = now - timedelta(hours=since_hours)
    if last_check is not None and last_check < window_start:
        window_start = last_check

    base = GOATCOUNTER_API_TEMPLATE.format(site=site)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "solvo-observe-external",
    }
    qs = urlparse.urlencode({
        "start": window_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": "10",
    })
    url = f"{base}/stats/hits?{qs}"
    lines = [
        f"- since last check: {state.get('last_check_at', 'first call')}",
        f"- window: last {since_hours}h",
    ]
    try:
        status, body = _http_get(url, headers=headers)
        if status >= 400:
            lines.append(f"- error: HTTP {status}: {body[:160]}")
        else:
            data = json.loads(body) if body else {}
            hits = data.get("hits", [])
            total_unique = sum(
                int(h.get("count_unique", h.get("count", 0))) for h in hits
            )
            prev_unique = state.get("last_unique")
            delta_str = ""
            if isinstance(prev_unique, int):
                delta = total_unique - prev_unique
                sign = "+" if delta >= 0 else ""
                delta_str = f"  ({sign}{delta} vs prev window)"
            lines.append(
                f"- unique visits: {total_unique}{delta_str}"
            )
            if hits:
                lines.append("- top paths:")
                # Sort hits by count_unique desc
                hits_sorted = sorted(
                    hits,
                    key=lambda h: -int(h.get("count_unique", h.get("count", 0))),
                )
                for h in hits_sorted[:10]:
                    path = h.get("path") or "?"
                    c = h.get("count_unique") or h.get("count") or 0
                    lines.append(f"  - {path}  {c}")
            else:
                lines.append("- (no signal yet)")
            state["last_unique"] = total_unique
    except (urlerror.URLError, json.JSONDecodeError, TimeoutError, OSError) as exc:
        lines.append(f"- error: {type(exc).__name__}: {str(exc)[:160]}")

    state["last_check_at"] = _iso_z(now)
    _save_state("goatcounter", state)
    return _segment("GoatCounter", lines)


# --- Railway affiliate -------------------------------------------------

def observe_railway(since_hours: int) -> str:
    token = os.environ.get("RAILWAY_AFFILIATE_TOKEN")
    if not token:
        return _segment(
            "Railway",
            ["- no railway credentials (need RAILWAY_AFFILIATE_TOKEN)"]
        )

    state = _load_state("railway")
    now = _now_utc()
    lines = [
        f"- since last check: {state.get('last_check_at', 'first call')}",
        f"- window: last {since_hours}h",
    ]

    # Railway exposes affiliate data via GraphQL. Without a published
    # public schema we ship a best-effort query the agent can swap out
    # if Railway changes it; on failure we degrade to "error".
    query = """
    query AffiliateStats {
      me {
        affiliate {
          totalClicks
          totalSignups
          totalEarnings
        }
      }
    }
    """
    body = json.dumps({"query": query}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "solvo-observe-external",
    }
    try:
        status, raw = _http_post(RAILWAY_AFFILIATE_API, body, headers)
        if status >= 400:
            lines.append(f"- error: HTTP {status}: {raw[:160]}")
        else:
            data = json.loads(raw) if raw else {}
            affiliate = (
                ((data.get("data") or {}).get("me") or {}).get("affiliate")
                or {}
            )
            clicks = affiliate.get("totalClicks")
            signups = affiliate.get("totalSignups")
            earnings = affiliate.get("totalEarnings")
            prev_clicks = state.get("last_clicks")
            delta_str = ""
            if isinstance(prev_clicks, int) and isinstance(clicks, int):
                delta = clicks - prev_clicks
                sign = "+" if delta >= 0 else ""
                delta_str = f"  ({sign}{delta} vs prev)"
            lines.append(
                f"- total clicks: {clicks}{delta_str}"
            )
            lines.append(f"- total signups: {signups}")
            lines.append(f"- total earnings: {earnings}")
            if isinstance(clicks, int):
                state["last_clicks"] = clicks
    except (urlerror.URLError, json.JSONDecodeError, TimeoutError, OSError) as exc:
        lines.append(f"- error: {type(exc).__name__}: {str(exc)[:160]}")

    state["last_check_at"] = _iso_z(now)
    _save_state("railway", state)
    return _segment("Railway", lines)


# --- Public entry point ------------------------------------------------

_OBSERVERS: dict[str, Callable[[int], str]] = {
    "vercel": observe_vercel,
    "gmail": observe_gmail,
    "github": observe_github,
    "goatcounter": observe_goatcounter,
    "railway": observe_railway,
}


def observe(
    sources: Optional[list[str]] = None,
    since_hours: int = DEFAULT_SINCE_HOURS,
) -> str:
    """Probe external sources, return a markdown-formatted state report.

    Args:
        sources: subset of {vercel, gmail, github, goatcounter, railway}.
                 None = all known sources. Unknown source names are
                 ignored with a warning segment.
        since_hours: floor for the lookback window. State per source
                     also tracks last-seen cursor, so the effective
                     window is max(since_hours, time-since-last-check).

    Returns:
        A markdown string with one `## <Source>` section per source.
        Never raises for credential / network failures — those become
        in-band error lines so the agent can read them and decide.
    """
    if not isinstance(since_hours, int) or since_hours <= 0:
        raise ValueError(f"since_hours must be positive int; got {since_hours!r}")

    chosen = sources if sources is not None else list(ALL_SOURCES)
    if not isinstance(chosen, list):
        raise TypeError(f"sources must be a list or None; got {type(chosen)}")

    header = f"# External state — {_iso_z(_now_utc())}\n"
    parts = [header]
    for src in chosen:
        observer = _OBSERVERS.get(src)
        if observer is None:
            parts.append(_segment(
                src,
                [f"- unknown source — valid: {', '.join(ALL_SOURCES)}"]
            ))
            continue
        try:
            parts.append(observer(since_hours))
        except Exception as exc:    # last-resort guard
            parts.append(_segment(
                src.capitalize(),
                [f"- internal error: {type(exc).__name__}: {str(exc)[:160]}"]
            ))
    return "\n".join(parts)
