"""
Write-capable OData client for the D365 action layer — separate from
client.py (D365ODataClient), which is read-only and built around
paginated $select/$filter fetches for the sync connector. This one issues
single GET/POST/PATCH calls for one whitelisted action at a time (see
action_config.py) and never does pagination or bulk fetches.
"""
from typing import Any, Dict, Optional

import httpx
import structlog

from app.integrations.d365.auth import D365TokenProvider

logger = structlog.get_logger(__name__)


class D365ActionError(Exception):
    pass


class D365ActionClient:
    def __init__(self, base_url: str, token_provider: D365TokenProvider):
        self.base_url = base_url.rstrip("/")
        self.token_provider = token_provider
        self._client = httpx.AsyncClient(timeout=30.0)

    async def _headers(self, user_bearer_token: Optional[str] = None) -> Dict[str, str]:
        """
        user_bearer_token: an access token for the D365 environment scoped
        to the authenticated user, when one is available — this is the
        extension point for per-user attribution (see
        app/services/action_handler.py's docstring on why that isn't wired
        up end-to-end yet). Falls back to the same app-only
        client-credentials token the read connector uses.
        """
        token = user_bearer_token or await self.token_provider.get_token()
        return {"Authorization": f"Bearer {token}", "Accept": "application/json", "Content-Type": "application/json"}

    async def get(self, entity_name: str, filter_expr: str, user_bearer_token: Optional[str] = None) -> Dict[str, Any]:
        headers = await self._headers(user_bearer_token)
        url = f"{self.base_url}/data/{entity_name}"
        try:
            response = await self._client.get(url, headers=headers, params={"$filter": filter_expr, "$top": 1})
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error("d365_action_get_failed", entity=entity_name, error=str(e))
            raise D365ActionError(f"D365 request for {entity_name} failed: {e}") from e
        payload = response.json()
        records = payload.get("value", [])
        return records[0] if records else {}

    async def post(self, entity_name: str, body: Dict[str, Any], user_bearer_token: Optional[str] = None) -> Dict[str, Any]:
        headers = await self._headers(user_bearer_token)
        url = f"{self.base_url}/data/{entity_name}"
        try:
            response = await self._client.post(url, headers=headers, json=body)
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error("d365_action_post_failed", entity=entity_name, error=str(e))
            raise D365ActionError(f"D365 create on {entity_name} failed: {e}") from e
        return response.json()

    async def patch(self, entity_name: str, key: str, body: Dict[str, Any], user_bearer_token: Optional[str] = None) -> Dict[str, Any]:
        headers = await self._headers(user_bearer_token)
        url = f"{self.base_url}/data/{entity_name}({key})"
        try:
            response = await self._client.patch(url, headers=headers, json=body)
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error("d365_action_patch_failed", entity=entity_name, key=key, error=str(e))
            raise D365ActionError(f"D365 update on {entity_name}({key}) failed: {e}") from e
        # D365 F&O's PATCH commonly returns 204 No Content on success.
        if response.status_code == 204 or not response.content:
            return {"status": "updated"}
        return response.json()
