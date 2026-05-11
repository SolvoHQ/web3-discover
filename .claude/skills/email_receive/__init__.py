"""email_receive skill — see SKILL.md."""
from solvo.skills.email_receive.receive import (
    EmailMessage,
    EmailReceiveError,
    EmailReceiveTimeout,
    NoCredentialsError,
    recent,
    wait_for_email,
)

__all__ = [
    "EmailMessage",
    "EmailReceiveError",
    "EmailReceiveTimeout",
    "NoCredentialsError",
    "recent",
    "wait_for_email",
]
