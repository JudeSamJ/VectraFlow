import httpx
import structlog
from app.config import settings

logger = structlog.get_logger(__name__)


class OAuthError(Exception):
    pass


async def exchange_google_code(code: str) -> dict:
    """Exchanges an OAuth authorization code for the user's email/name via Google."""
    redirect_uri = f"{settings.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/google/callback"
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            logger.error("google_token_exchange_failed", status=token_resp.status_code, body=token_resp.text[:300])
            raise OAuthError("Google token exchange failed")
        access_token = token_resp.json().get("access_token")

        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise OAuthError("Failed to fetch Google profile")
        data = userinfo_resp.json()

    email = data.get("email")
    if not email:
        raise OAuthError("Google account has no email")
    return {"email": email, "name": data.get("name") or email.split("@")[0]}


async def exchange_github_code(code: str) -> dict:
    """Exchanges an OAuth authorization code for the user's email/name via GitHub."""
    redirect_uri = f"{settings.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/github/callback"
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "code": code,
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
            },
        )
        if token_resp.status_code != 200:
            logger.error("github_token_exchange_failed", status=token_resp.status_code, body=token_resp.text[:300])
            raise OAuthError("GitHub token exchange failed")
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise OAuthError("GitHub token exchange returned no access_token")

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
        user_resp = await client.get("https://api.github.com/user", headers=headers)
        if user_resp.status_code != 200:
            raise OAuthError("Failed to fetch GitHub profile")
        user_data = user_resp.json()

        email = user_data.get("email")
        if not email:
            # GitHub only includes a public email if the user opted in — fall
            # back to the (possibly private) primary email via a second call.
            emails_resp = await client.get("https://api.github.com/user/emails", headers=headers)
            if emails_resp.status_code == 200:
                primary = next((e for e in emails_resp.json() if e.get("primary")), None)
                email = primary["email"] if primary else None

    if not email:
        raise OAuthError("Could not obtain an email address from GitHub — make sure your GitHub account has a public or primary email")
    return {"email": email, "name": user_data.get("name") or user_data.get("login")}
