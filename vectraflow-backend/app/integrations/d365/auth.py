import time
import httpx
import structlog
from typing import Optional

logger = structlog.get_logger(__name__)


class D365AuthError(Exception):
    pass


class D365TokenProvider:
    """
    Azure AD / Microsoft Entra ID client-credentials flow for a D365 F&O
    service-to-service (app-only) connection — no user ever signs in for
    this; it's the same app registration pattern Microsoft's own D365 F&O
    integration docs describe for OData access.

    Caches the token in memory and only requests a new one once it's within
    60 seconds of expiring, since the token endpoint is rate-limited and
    every sync run would otherwise re-authenticate for no reason.
    """

    def __init__(self, tenant_id: str, client_id: str, client_secret: str, resource_scope: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        # D365 F&O uses the environment's own base URL as the OAuth resource,
        # e.g. "https://yourorg.operations.dynamics.com/.default" — this is
        # NOT the standard Microsoft Graph scope, it's environment-specific.
        self.resource_scope = resource_scope
        self._token: Optional[str] = None
        self._expires_at: float = 0.0
        self._client = httpx.AsyncClient(timeout=30.0)

    async def get_token(self) -> str:
        if self._token and time.monotonic() < self._expires_at - 60:
            return self._token

        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        try:
            response = await self._client.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": self.resource_scope,
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error("d365_token_request_failed", error=str(e))
            raise D365AuthError(f"Failed to acquire D365 access token: {e}") from e

        payload = response.json()
        self._token = payload["access_token"]
        self._expires_at = time.monotonic() + int(payload.get("expires_in", 3600))
        logger.info("d365_token_acquired", expires_in=payload.get("expires_in"))
        return self._token
