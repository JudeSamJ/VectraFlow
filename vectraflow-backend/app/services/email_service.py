import httpx
import structlog
from app.config import settings

logger = structlog.get_logger(__name__)


async def send_email(to: str, subject: str, html: str) -> bool:
    """
    Sends via Resend's HTTP API. Returns True if actually sent, False if
    email isn't configured (logs a warning instead of failing) or the send
    itself failed — callers should treat either as non-fatal, since a
    reset email not going out shouldn't surface as a 500 to the caller
    (and, for forgot-password specifically, must not reveal anything about
    whether the address exists).
    """
    if not settings.RESEND_API_KEY:
        logger.warning("email_not_configured", to=to, subject=subject)
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            )
            response.raise_for_status()
        logger.info("email_sent", to=to, subject=subject)
        return True
    except Exception as exc:
        logger.error("email_send_failed", to=to, subject=subject, error=str(exc))
        return False
