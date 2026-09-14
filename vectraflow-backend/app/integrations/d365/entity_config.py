from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class D365EntityConfig:
    """
    Describes one D365 F&O OData entity we know how to sync: which fields to
    pull, which field is the stable record identifier, which field (if any)
    tracks last-modified time for incremental sync, and a template for
    turning one record into a natural-language sentence.

    NOTE ON ENTITY/FIELD NAMES: "item masters" and "vendor records" below
    use ReleasedProductsV2 and VendorsV2, which are real, standard D365 F&O
    public OData entities — but the exact field names available (and
    whether a given entity exposes a queryable last-modified field at all)
    can vary by D365 version and by what's been customized in a given
    environment. Before relying on these in production, confirm the actual
    entity set name and field names against the target environment's own
    OData metadata document: GET {D365_BASE_URL}/data/$metadata.
    A "document attachments" entity isn't included here — D365 F&O exposes
    attachments through document management (DocuRef) tables, which aren't
    a single standard public OData entity the way item/vendor masters are;
    add a D365EntityConfig for it once you've identified the right entity
    set (or a custom data entity) in your specific environment.
    """

    entity_name: str          # OData entity set name, e.g. "ReleasedProductsV2"
    id_field: str              # field used as the stable record id
    select_fields: List[str]   # fields to request via $select
    text_template: str         # Python str.format() template over select_fields
    modified_field: Optional[str] = None  # field for incremental $filter, if the entity supports one
    heading: str = ""          # human label used in chunk heading_path, defaults to entity_name


# Built-in example configs — additive, and intentionally conservative about
# what's asserted to actually exist in every D365 F&O environment (see
# docstring above). Add more via the same pattern; nothing here is required
# to be used — sync is opt-in per entity per knowledge base.
BUILTIN_ENTITIES: Dict[str, D365EntityConfig] = {
    "ReleasedProductsV2": D365EntityConfig(
        entity_name="ReleasedProductsV2",
        id_field="ItemNumber",
        select_fields=["ItemNumber", "ProductName", "ProductCategoryName", "ProductSearchName", "dataAreaId"],
        text_template=(
            "Item {ItemNumber}, named \"{ProductName}\", belongs to category "
            "\"{ProductCategoryName}\" in company {dataAreaId}."
        ),
        modified_field="ModifiedDateTime",
        heading="Released Products",
    ),
    "VendorsV2": D365EntityConfig(
        entity_name="VendorsV2",
        id_field="VendorAccountNumber",
        select_fields=["VendorAccountNumber", "OrganizationName", "VendorGroupId", "dataAreaId"],
        text_template=(
            "Vendor {VendorAccountNumber} is \"{OrganizationName}\", part of vendor group "
            "\"{VendorGroupId}\" in company {dataAreaId}."
        ),
        modified_field="ModifiedDateTime",
        heading="Vendors",
    ),
}


def get_entity_config(entity_name: str) -> D365EntityConfig:
    config = BUILTIN_ENTITIES.get(entity_name)
    if not config:
        raise ValueError(
            f"Unknown D365 entity '{entity_name}'. Known entities: {list(BUILTIN_ENTITIES)}. "
            "Add a D365EntityConfig for it in app/integrations/d365/entity_config.py."
        )
    return config
