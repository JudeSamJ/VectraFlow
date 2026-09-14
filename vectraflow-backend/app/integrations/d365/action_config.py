"""
Whitelist of D365 F&O actions the chatbot is allowed to perform, on the
same "verify against your own environment first" footing as
entity_config.py's read-side BUILTIN_ENTITIES — these are standard-shaped
OData entity names, but D365 F&O environments vary in which entities are
actually writable and what fields they expose, so confirm each one against
the target environment's $metadata before enabling it in production.

Intentionally small and closed: exactly three actions, each with its own
Pydantic parameter model (so a request that doesn't match gets rejected
before anything is staged, let alone sent to D365), and NOTHING here
constructs or accepts an arbitrary OData path/payload from user input —
see action_handler.py, which only ever calls whitelisted, pre-defined
D365ActionConfig entries.
"""
from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional, Type

from pydantic import BaseModel, Field


class CheckStockLevelParams(BaseModel):
    item_number: str = Field(..., min_length=1, max_length=64)
    warehouse: str = Field(..., min_length=1, max_length=64)
    company: str = Field(default="USMF", min_length=1, max_length=16)


class CreatePurchaseRequisitionParams(BaseModel):
    item_number: str = Field(..., min_length=1, max_length=64)
    quantity: int = Field(..., gt=0, le=100_000)
    warehouse: str = Field(..., min_length=1, max_length=64)
    company: str = Field(default="USMF", min_length=1, max_length=16)
    justification: Optional[str] = Field(default=None, max_length=500)


class FlagItemLowStockParams(BaseModel):
    item_number: str = Field(..., min_length=1, max_length=64)
    company: str = Field(default="USMF", min_length=1, max_length=16)
    note: Optional[str] = Field(default=None, max_length=500)


@dataclass
class D365ActionConfig:
    name: str
    description: str
    http_method: Literal["GET", "POST", "PATCH"]
    entity_name: str          # OData entity set name — verify against $metadata
    param_model: Type[BaseModel]
    is_write: bool             # False only for check_stock_level (a read)

    def build_request(self, params: BaseModel) -> Dict[str, Any]:
        """
        Turns validated params into what the OData call needs: a $filter
        (GET) or a JSON body (POST/PATCH) plus, for PATCH, the entity key.
        Field names are the part of this that's most likely to need
        adjusting per environment — see the module docstring.
        """
        if self.name == "check_stock_level":
            p: CheckStockLevelParams = params  # type: ignore[assignment]
            return {
                "filter": f"ItemNumber eq '{p.item_number}' and InventLocationId eq '{p.warehouse}' and dataAreaId eq '{p.company}'",
            }
        if self.name == "create_purchase_requisition":
            p: CreatePurchaseRequisitionParams = params  # type: ignore[assignment]
            body = {
                "ItemNumber": p.item_number,
                "PurchQty": p.quantity,
                "InventLocationId": p.warehouse,
                "dataAreaId": p.company,
            }
            if p.justification:
                body["Justification"] = p.justification
            return {"body": body}
        if self.name == "flag_item_low_stock":
            p: FlagItemLowStockParams = params  # type: ignore[assignment]
            body = {"LowStockFlag": True}
            if p.note:
                body["LowStockNote"] = p.note
            return {
                "key": f"ItemNumber='{p.item_number}',dataAreaId='{p.company}'",
                "body": body,
            }
        raise ValueError(f"No request builder for action '{self.name}'")


ACTION_WHITELIST: Dict[str, D365ActionConfig] = {
    "check_stock_level": D365ActionConfig(
        name="check_stock_level",
        description="Look up the on-hand quantity for an item at a warehouse. Read-only.",
        http_method="GET",
        entity_name="InventoryOnhandEntity",
        param_model=CheckStockLevelParams,
        is_write=False,
    ),
    "create_purchase_requisition": D365ActionConfig(
        name="create_purchase_requisition",
        description="Create a new purchase requisition line for an item, quantity, and warehouse.",
        http_method="POST",
        entity_name="PurchReqTableEntity",
        param_model=CreatePurchaseRequisitionParams,
        is_write=True,
    ),
    "flag_item_low_stock": D365ActionConfig(
        name="flag_item_low_stock",
        description="Flag a released product as low-stock (sets a boolean field on the item master).",
        http_method="PATCH",
        entity_name="ReleasedProductsV2",
        param_model=FlagItemLowStockParams,
        is_write=True,
    ),
}


def get_action_config(action_name: str) -> D365ActionConfig:
    config = ACTION_WHITELIST.get(action_name)
    if not config:
        raise ValueError(
            f"Unknown or non-whitelisted D365 action '{action_name}'. "
            f"Whitelisted actions: {list(ACTION_WHITELIST)}."
        )
    return config
