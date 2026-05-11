"""Per-workspace Supabase project provisioning.

Creates a project under `SUPABASE_ORG_ID`, polls until ACTIVE_HEALTHY,
fetches anon + service-role keys, and appends them to the workspace's
`.solvo/secrets.env`. Intended to be called from the agent so a fresh
workspace can stand up a real backend autonomously, no external help.

The workspace's per-workspace secrets.env is mounted RO into the
container's canonical secret path, but the workspace dir itself is
mounted RW — so we write via the workspace path, and the next
container start will pick the new vars up via the canonical mount.
"""
from __future__ import annotations

import json
import os
import secrets as _secrets
import string
import time
import urllib.error
import urllib.request
from pathlib import Path


_API_BASE = "https://api.supabase.com/v1"
_DEFAULT_PROJECT_CAP = 5
_POLL_INTERVAL_S = 5
_POLL_TIMEOUT_S = 600  # ~10 min for the project to come up


class SupabaseProvisionError(RuntimeError):
    """Raised for any non-recoverable failure during provision."""


def provision(workspace_path: Path | str, region: str = "us-east-1") -> dict:
    workspace_path = Path(workspace_path).resolve()
    if not workspace_path.is_dir():
        raise SupabaseProvisionError(
            f"workspace_path is not a directory: {workspace_path}"
        )

    access_token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    org_id = os.environ.get("SUPABASE_ORG_ID")
    if not access_token or not org_id:
        raise SupabaseProvisionError(
            "SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID must be set in env "
            "(global ~/.solvo/secrets.env). Without them this skill cannot "
            "talk to the Management API."
        )

    secrets_path = workspace_path / ".solvo" / "secrets.env"
    secrets_path.parent.mkdir(parents=True, exist_ok=True)
    existing = _read_existing_supabase(secrets_path)
    if existing:
        return {**existing, "created": False}

    cap = int(os.environ.get("MAX_SUPABASE_PROJECTS", _DEFAULT_PROJECT_CAP))
    projects = _api(access_token, "GET", "/projects")
    org_projects = [p for p in projects if p.get("organization_id") == org_id]
    if len(org_projects) >= cap:
        raise SupabaseProvisionError(
            f"org {org_id} has {len(org_projects)} projects (cap "
            f"MAX_SUPABASE_PROJECTS={cap}); refusing to create another. "
            "Cap reached — reuse an existing project (multi-namespace schema) instead of creating a new one."
        )

    workspace_slug = workspace_path.name
    project_name = f"solvo-{workspace_slug}"[:30]
    db_password = _gen_password()

    created = _api(
        access_token,
        "POST",
        "/projects",
        body={
            "name": project_name,
            "organization_id": org_id,
            "db_pass": db_password,
            "region": region,
            "plan": "free",
        },
    )
    ref = created.get("ref") or created.get("id")
    if not ref:
        raise SupabaseProvisionError(
            f"create returned no project ref: {json.dumps(created)[:200]}"
        )

    _wait_until_healthy(access_token, ref)
    keys = _api(access_token, "GET", f"/projects/{ref}/api-keys")
    anon_key, service_key = _extract_keys(keys)

    url = f"https://{ref}.supabase.co"
    _append_secrets(secrets_path, url, anon_key, service_key, db_password, ref)

    return {
        "ref": ref,
        "url": url,
        "anon_key": anon_key,
        "service_key": service_key,
        "db_password": db_password,
        "created": True,
    }


def _api(token: str, method: str, path: str, body: dict | None = None) -> dict | list:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        # Supabase routes through Cloudflare; the default urllib UA
        # ("Python-urllib/3.x") trips Cloudflare 1010 / "browser
        # signature blocked". A real-looking UA bypasses cleanly.
        "User-Agent": "solvo-supabase-provision/1.0",
    }
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        _API_BASE + path, data=data, method=method, headers=headers
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        raise SupabaseProvisionError(
            f"{method} {path} → {e.code}: {body_text[:300]}"
        ) from e


def _wait_until_healthy(token: str, ref: str) -> None:
    deadline = time.monotonic() + _POLL_TIMEOUT_S
    last_status = None
    while time.monotonic() < deadline:
        proj = _api(token, "GET", f"/projects/{ref}")
        status = proj.get("status")
        if status == "ACTIVE_HEALTHY":
            return
        last_status = status
        time.sleep(_POLL_INTERVAL_S)
    raise SupabaseProvisionError(
        f"project {ref} not ACTIVE_HEALTHY after {_POLL_TIMEOUT_S}s "
        f"(last status: {last_status})"
    )


def _extract_keys(keys_resp: list | dict) -> tuple[str, str]:
    if not isinstance(keys_resp, list):
        raise SupabaseProvisionError(
            f"unexpected api-keys shape: {type(keys_resp).__name__}"
        )
    by_name = {k.get("name"): k.get("api_key") for k in keys_resp if k.get("name")}
    anon = by_name.get("anon")
    service = by_name.get("service_role")
    if not anon or not service:
        raise SupabaseProvisionError(
            f"api-keys missing anon or service_role: {list(by_name)}"
        )
    return anon, service


def _gen_password(length: int = 24) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(_secrets.choice(alphabet) for _ in range(length))


def _read_existing_supabase(secrets_path: Path) -> dict | None:
    if not secrets_path.is_file():
        return None
    found: dict[str, str] = {}
    for line in secrets_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        if key in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"):
            found[key] = value
    if found.get("SUPABASE_URL"):
        return {
            "ref": found["SUPABASE_URL"].split("//")[-1].split(".")[0],
            "url": found["SUPABASE_URL"],
            "anon_key": found.get("SUPABASE_ANON_KEY", ""),
            "service_key": found.get("SUPABASE_SERVICE_KEY", ""),
            "db_password": "(persisted; not re-fetched)",
        }
    return None


def _append_secrets(
    secrets_path: Path,
    url: str,
    anon_key: str,
    service_key: str,
    db_password: str,
    ref: str,
) -> None:
    block = (
        "\n# Auto-provisioned by supabase_provision skill. Per-workspace "
        f"project ref={ref}.\n"
        f"SUPABASE_URL={url}\n"
        f"SUPABASE_ANON_KEY={anon_key}\n"
        f"SUPABASE_SERVICE_KEY={service_key}\n"
        f"# DB password (stash, not auto-loaded): {db_password}\n"
    )
    with secrets_path.open("a", encoding="utf-8") as f:
        f.write(block)
