"""solve_captcha skill — see SKILL.md."""
from solvo.skills.solve_captcha.solve import (
    solve,
    SolveCaptchaError,
    NoApiKeyError,
)

__all__ = ["solve", "SolveCaptchaError", "NoApiKeyError"]
