"""email_receive: poll IMAP for a matching message and return it
parsed (from / subject / body / extracted links). Stdlib only.
"""
from __future__ import annotations

import email
import imaplib
import os
import re
import time
from dataclasses import dataclass, field
from email.message import Message
from email.utils import parseaddr
from typing import List, Optional


URL_RE = re.compile(r"https?://[^\s<>\"']+")


class EmailReceiveError(RuntimeError):
    """Base class for email_receive failures."""


class NoCredentialsError(EmailReceiveError):
    """AGENT_EMAIL_IMAP_* env vars missing."""


class EmailReceiveTimeout(EmailReceiveError):
    """Polling exhausted without a match."""


@dataclass
class EmailMessage:
    uid: str
    from_addr: str
    to_addr: str
    subject: str
    body: str
    links: List[str] = field(default_factory=list)


def _read_creds() -> dict:
    keys = [
        "AGENT_EMAIL_IMAP_HOST",
        "AGENT_EMAIL_IMAP_USERNAME",
        "AGENT_EMAIL_IMAP_APP_PASSWORD",
    ]
    missing = [k for k in keys if not os.environ.get(k)]
    if missing:
        raise NoCredentialsError(
            f"missing env vars: {missing}. This skill is unavailable "
            f"in this workspace — pivot to a signup flow that doesn't "
            f"need email verification, or use a different channel."
        )
    return {
        "host": os.environ["AGENT_EMAIL_IMAP_HOST"],
        "port": int(os.environ.get("AGENT_EMAIL_IMAP_PORT", "993")),
        "user": os.environ["AGENT_EMAIL_IMAP_USERNAME"],
        "password": os.environ["AGENT_EMAIL_IMAP_APP_PASSWORD"],
        "folder": os.environ.get("AGENT_EMAIL_IMAP_FOLDER", "INBOX"),
    }


def _connect_and_select(creds):
    m = imaplib.IMAP4_SSL(creds["host"], creds["port"])
    m.login(creds["user"], creds["password"])
    m.select(creds["folder"])
    return m


def _build_search_terms(
    from_filter: Optional[str],
    to_filter: Optional[str],
    subject_filter: Optional[str],
) -> List[str]:
    terms: List[str] = []
    if from_filter:
        # Translate `*@reddit.com` glob into an IMAP FROM substring search.
        # IMAP doesn't do globs; we do a substring match on the most
        # distinctive portion.
        substr = from_filter.replace("*", "").replace("@", "").strip()
        terms += ["FROM", f'"{substr}"']
    if to_filter:
        substr = to_filter.replace("*", "").replace("@", "").strip()
        terms += ["TO", f'"{substr}"']
    if subject_filter:
        terms += ["SUBJECT", f'"{subject_filter}"']
    if not terms:
        terms = ["ALL"]
    return terms


def _parse_message(uid: str, raw: bytes) -> EmailMessage:
    msg: Message = email.message_from_bytes(raw)
    from_name, from_addr = parseaddr(msg.get("From", ""))
    _, to_addr = parseaddr(msg.get("To", ""))
    subject = msg.get("Subject", "")
    # Body extraction — favor text/plain.
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_payload(decode=True).decode(
                    part.get_content_charset() or "utf-8", errors="replace"
                )
                break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode(
                msg.get_content_charset() or "utf-8", errors="replace"
            )
    links = URL_RE.findall(body)
    return EmailMessage(
        uid=uid,
        from_addr=from_addr or from_name,
        to_addr=to_addr,
        subject=subject,
        body=body,
        links=links,
    )


def wait_for_email(
    from_filter: Optional[str] = None,
    to_filter: Optional[str] = None,
    subject_filter: Optional[str] = None,
    timeout: int = 120,
    poll_interval: int = 5,
) -> EmailMessage:
    """Poll IMAP for a matching message; return parsed EmailMessage on
    first match or raise EmailReceiveTimeout if no match within timeout.

    Filter args are substrings (IMAP doesn't support glob); pass the
    most distinctive part of the address you expect ('reddit.com',
    'noreply@netlify.com', etc.).
    """
    creds = _read_creds()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        m = _connect_and_select(creds)
        try:
            search_terms = _build_search_terms(
                from_filter, to_filter, subject_filter
            )
            typ, data = m.search(None, *search_terms)
            if typ == "OK" and data and data[0]:
                uids = data[0].decode().split()
                if uids:
                    last_uid = uids[-1]
                    typ, fetched = m.fetch(last_uid.encode(), "(RFC822)")
                    if typ == "OK" and fetched and fetched[0]:
                        return _parse_message(last_uid, fetched[0][1])
        finally:
            try:
                m.logout()
            except Exception:
                pass
        time.sleep(poll_interval)
    raise EmailReceiveTimeout(
        f"no matching email within {timeout}s "
        f"(from={from_filter!r}, to={to_filter!r}, "
        f"subject={subject_filter!r})"
    )


def recent(n: int = 5) -> List[EmailMessage]:
    """Return the N most recent messages in the configured folder.
    Useful for debugging or for sweeping a backlog. Most recent first."""
    creds = _read_creds()
    m = _connect_and_select(creds)
    try:
        typ, data = m.search(None, "ALL")
        if typ != "OK" or not data or not data[0]:
            return []
        uids = data[0].decode().split()
        last = uids[-n:][::-1]   # most recent first
        out: List[EmailMessage] = []
        for uid in last:
            typ, fetched = m.fetch(uid.encode(), "(RFC822)")
            if typ == "OK" and fetched and fetched[0]:
                out.append(_parse_message(uid, fetched[0][1]))
        return out
    finally:
        try:
            m.logout()
        except Exception:
            pass
