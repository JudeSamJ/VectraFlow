import httpx
import structlog
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.integrations.d365.auth import D365TokenProvider
from app.integrations.d365.entity_config import D365EntityConfig

logger = structlog.get_logger(__name__)


class D365ODataError(Exception):
    pass


class D365ODataClient:
    """
    Minimal OData v4 client for D365 F&O's data endpoint
    ({D365_BASE_URL}/data/{EntitySetName}), handling bearer-token auth,
    $select/$filter/$top query building, and @odata.nextLink pagination.
    """

    def __init__(self, base_url: str, token_provider: D365TokenProvider):
        self.base_url = base_url.rstrip("/")
        self.token_provider = token_provider
        self._client = httpx.AsyncClient(timeout=60.0)

    async def fetch_entity_records(
        self,
        config: D365EntityConfig,
        modified_since: Optional[datetime] = None,
        page_size: int = 500,
        max_records: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetches records for one entity, optionally filtered to only those
        modified since `modified_since` (requires config.modified_field to
        be set and actually queryable on that entity — see the caveat in
        entity_config.py). Follows @odata.nextLink until exhausted or
        max_records is reached.
        """
        token = await self.token_provider.get_token()
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

        params: Dict[str, Any] = {
            "$select": ",".join(config.select_fields),
            "$top": page_size,
        }
        if modified_since is not None and config.modified_field:
            # OData v4 date literal format.
            ts = modified_since.strftime("%Y-%m-%dT%H:%M:%SZ")
            params["$filter"] = f"{config.modified_field} gt {ts}"

        url = f"{self.base_url}/data/{config.entity_name}"
        records: List[Dict[str, Any]] = []

        while url:
            try:
                response = await self._client.get(url, headers=headers, params=params if params else None)
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                logger.error(
                    "d365_odata_fetch_failed",
                    entity=config.entity_name,
                    status=e.response.status_code,
                    body=e.response.text[:500],
                )
                raise D365ODataError(
                    f"D365 OData request for {config.entity_name} failed: {e.response.status_code}"
                ) from e
            except httpx.HTTPError as e:
                logger.error("d365_odata_fetch_failed", entity=config.entity_name, error=str(e))
                raise D365ODataError(f"D365 OData request for {config.entity_name} failed: {e}") from e

            payload = response.json()
            records.extend(payload.get("value", []))

            if max_records is not None and len(records) >= max_records:
                return records[:max_records]

            # Follow pagination; subsequent requests use the full nextLink URL
            # (which already carries the query params), so drop `params`.
            url = payload.get("@odata.nextLink")
            params = None

        logger.info("d365_odata_fetch_complete", entity=config.entity_name, count=len(records))
        return records
