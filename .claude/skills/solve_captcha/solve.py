"""solve_captcha: thin wrapper around 2Captcha's HTTP API.

The skill is general-purpose — it doesn't know about specific sites.
The agent provides the CAPTCHA descriptor (sitekey + page_url for
JS-injected captchas; image bytes for old-school OCR captchas) and
gets back a token string. Injecting the token into the form is the
agent's job.

Cost ~$0.001 per recaptcha-v2 solve; image solves $0.0006. Set
CAPTCHA_API_KEY in <ws>/.solvo/secrets.env to enable; otherwise the
skill raises NoApiKeyError and the agent falls back to manual /
Computer Use solving.
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Optional

import requests


SUBMIT_URL = "https://2captcha.com/in.php"
RES_URL = "https://2captcha.com/res.php"
POLL_INTERVAL_S = 5
POLL_MAX_ATTEMPTS = 36   # ~3 minutes


class SolveCaptchaError(RuntimeError):
    """API returned an error or unexpected payload."""


class NoApiKeyError(SolveCaptchaError):
    """CAPTCHA_API_KEY env var not set."""


_KIND_TO_METHOD = {
    "recaptcha-v2": "userrecaptcha",
    "recaptcha-v3": "userrecaptcha",
    "hcaptcha": "hcaptcha",
    "turnstile": "turnstile",
    "image": "post",   # image solves use POST upload, handled separately
}


def solve(
    kind: str,
    sitekey: Optional[str] = None,
    page_url: Optional[str] = None,
    image_path: Optional[str] = None,
    action: Optional[str] = None,   # recaptcha-v3 only
    min_score: Optional[float] = None,   # recaptcha-v3 only
) -> str:
    """Solve a CAPTCHA via 2Captcha. Returns the token string the
    agent can inject into the page / API call.

    Args:
        kind: one of recaptcha-v2 / recaptcha-v3 / hcaptcha / turnstile
              / image
        sitekey: required for JS captchas (everything except 'image')
        page_url: required for JS captchas
        image_path: required for kind='image' (path on disk)
        action: optional, recaptcha-v3 only
        min_score: optional, recaptcha-v3 only (default 0.3)

    Raises:
        NoApiKeyError: CAPTCHA_API_KEY not in env
        SolveCaptchaError: API rejected request, or polling exhausted

    Cost: ~$0.001 per JS captcha; ~$0.0006 per image. Polled every 5s.
    """
    api_key = os.environ.get("CAPTCHA_API_KEY")
    if not api_key:
        raise NoApiKeyError(
            "CAPTCHA_API_KEY not set; add it to <ws>/.solvo/secrets.env "
            "or fall back to manual / Computer Use solving."
        )
    if kind not in _KIND_TO_METHOD:
        raise SolveCaptchaError(
            f"unknown kind {kind!r}; want one of {list(_KIND_TO_METHOD)}"
        )

    request_id = _submit(api_key, kind, sitekey, page_url, image_path,
                         action, min_score)
    return _poll(api_key, request_id)


def _submit(api_key, kind, sitekey, page_url, image_path, action, min_score):
    if kind == "image":
        if not image_path:
            raise SolveCaptchaError("kind=image requires image_path")
        with open(image_path, "rb") as f:
            files = {"file": f}
            data = {"key": api_key, "method": "post", "json": "1"}
            r = requests.post(SUBMIT_URL, files=files, data=data, timeout=30)
    else:
        if not sitekey or not page_url:
            raise SolveCaptchaError(
                f"kind={kind} requires sitekey + page_url"
            )
        params = {
            "key": api_key,
            "method": _KIND_TO_METHOD[kind],
            "pageurl": page_url,
        }
        if kind in ("recaptcha-v2", "recaptcha-v3"):
            params["googlekey"] = sitekey
        else:
            params["sitekey"] = sitekey
        if kind == "recaptcha-v3":
            params["version"] = "v3"
            if action:
                params["action"] = action
            if min_score is not None:
                params["min_score"] = min_score
        r = requests.get(SUBMIT_URL, params=params, timeout=30)

    body = r.text
    if not body.startswith("OK|"):
        raise SolveCaptchaError(f"submit rejected: {body}")
    return body.split("|", 1)[1]


def _poll(api_key, request_id):
    for _ in range(POLL_MAX_ATTEMPTS):
        time.sleep(POLL_INTERVAL_S)
        r = requests.get(RES_URL, params={
            "key": api_key,
            "action": "get",
            "id": request_id,
        }, timeout=30)
        body = r.text
        if body == "CAPCHA_NOT_READY":
            continue
        if body.startswith("OK|"):
            return body.split("|", 1)[1]
        raise SolveCaptchaError(f"poll error: {body}")
    raise SolveCaptchaError(
        f"exhausted {POLL_MAX_ATTEMPTS} polls without solution"
    )
