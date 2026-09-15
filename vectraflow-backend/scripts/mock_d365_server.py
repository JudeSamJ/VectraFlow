"""
Standalone mock of the two D365 F&O surfaces VectraFlow's D365 connector
talks to — the Azure AD token endpoint and the OData /data/{Entity}
endpoints — so the whole connector (entity sync -> citations, and the
action layer's check/create/flag actions) can be exercised end-to-end
without a real Azure AD app registration or D365 environment.

This is a TESTING TOOL ONLY. It does not validate credentials, does not
persist anything beyond the process's lifetime, and returns canned/fake
data. Never point a real deployment's D365_BASE_URL at this.

Run locally:
    cd vectraflow-backend
    python scripts/mock_d365_server.py            # http://localhost:8100

Or deploy as a second Render Web Service from this same repo/branch, with
its Start Command overridden to:
    uvicorn scripts.mock_d365_server:app --host 0.0.0.0 --port $PORT
(it only needs fastapi + uvicorn, both already in requirements.txt).

Then, on the REAL backend service, set:
    D365_BASE_URL=https://<this-mock-service>
    D365_TENANT_ID=mock-tenant        # any non-empty placeholder
    D365_CLIENT_ID=mock-client        # any non-empty placeholder
    D365_CLIENT_SECRET=mock-secret    # any non-empty placeholder
    D365_TOKEN_URL_OVERRIDE=https://<this-mock-service>/oauth2/v2.0/token
"""
import random
import re
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

app = FastAPI(title="Mock D365 F&O Server (testing only)")

# ─────────────────────────────────────────────
# Fake in-memory data
# ─────────────────────────────────────────────

RELEASED_PRODUCTS: List[Dict[str, Any]] = [
    {"ItemNumber": "A0001", "ProductName": "Steel Bracket", "ProductCategoryName": "Hardware",
     "ProductSearchName": "STEEL BRACKET", "dataAreaId": "USMF", "ModifiedDateTime": "2026-09-01T00:00:00Z"},
    {"ItemNumber": "A0002", "ProductName": "Hex Bolt M8", "ProductCategoryName": "Fasteners",
     "ProductSearchName": "HEX BOLT M8", "dataAreaId": "USMF", "ModifiedDateTime": "2026-09-05T00:00:00Z"},
    {"ItemNumber": "A0003", "ProductName": "Industrial Gasket", "ProductCategoryName": "Seals",
     "ProductSearchName": "INDUSTRIAL GASKET", "dataAreaId": "USMF", "ModifiedDateTime": "2026-09-10T00:00:00Z"},
]

VENDORS: List[Dict[str, Any]] = [
    {"VendorAccountNumber": "V001", "OrganizationName": "Acme Supply Co.", "VendorGroupId": "RAW",
     "dataAreaId": "USMF", "ModifiedDateTime": "2026-09-01T00:00:00Z"},
    {"VendorAccountNumber": "V002", "OrganizationName": "Northwind Fasteners", "VendorGroupId": "COMP",
     "dataAreaId": "USMF", "ModifiedDateTime": "2026-09-08T00:00:00Z"},
]

# item_number -> on-hand qty per warehouse, so check_stock_level gives
# consistent answers across calls instead of random ones every time.
STOCK_LEVELS: Dict[str, Dict[str, float]] = {
    "A0001": {"WH1": 12.0, "WH2": 340.0},
    "A0002": {"WH1": 2.0, "WH2": 15.0},
    "A0003": {"WH1": 0.0, "WH2": 88.0},
}


def _extract_eq(filter_expr: str, field: str) -> Optional[str]:
    m = re.search(rf"{field} eq '([^']*)'", filter_expr or "")
    return m.group(1) if m else None


# ─────────────────────────────────────────────
# Azure AD token endpoint stand-in
# ─────────────────────────────────────────────

@app.post("/oauth2/v2.0/token")
async def mock_token(request: Request):
    # Doesn't validate client_id/secret — this is a mock. Any non-empty
    # values D365TokenProvider sends are accepted.
    return JSONResponse({
        "token_type": "Bearer",
        "expires_in": 3600,
        "access_token": f"mock-token-{uuid.uuid4().hex[:16]}",
    })


# ─────────────────────────────────────────────
# OData /data/{Entity} — GET (list/filter), POST (create), PATCH (update)
# ─────────────────────────────────────────────

@app.get("/data/ReleasedProductsV2")
async def get_released_products(request: Request):
    return {"value": RELEASED_PRODUCTS}


@app.get("/data/VendorsV2")
async def get_vendors(request: Request):
    return {"value": VENDORS}


@app.get("/data/InventoryOnhandEntity")
async def get_inventory_onhand(request: Request):
    filter_expr = request.query_params.get("$filter", "")
    item_number = _extract_eq(filter_expr, "ItemNumber") or "A0001"
    warehouse = _extract_eq(filter_expr, "InventLocationId") or "WH1"
    data_area = _extract_eq(filter_expr, "dataAreaId") or "USMF"

    qty = STOCK_LEVELS.get(item_number, {}).get(warehouse)
    if qty is None:
        qty = round(random.uniform(0, 100), 1)

    return {"value": [{
        "ItemNumber": item_number,
        "InventLocationId": warehouse,
        "dataAreaId": data_area,
        "PhysicalInvent": qty,
        "AvailPhysical": qty,
    }]}


@app.post("/data/PurchReqTableEntity")
async def create_purchase_requisition(request: Request):
    body = await request.json()
    created = {
        "PurchReqTableId": f"PR-{uuid.uuid4().hex[:8].upper()}",
        "PurchReqStatus": "Draft",
        "CreatedDateTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **body,
    }
    return JSONResponse(created, status_code=201)


@app.patch("/data/ReleasedProductsV2({key})")
async def flag_item_low_stock(key: str, request: Request):
    body = await request.json()
    # key looks like "ItemNumber='A0001',dataAreaId='USMF'" — good enough
    # for this mock to just check which fake item it names.
    for item in RELEASED_PRODUCTS:
        if item["ItemNumber"] in key:
            item.update(body)
            break
    # D365 F&O's PATCH commonly returns 204 No Content on success —
    # D365ActionClient.patch() already handles that.
    return Response(status_code=204)


@app.get("/health")
async def health():
    return {"status": "ok", "note": "mock D365 server — testing only"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
