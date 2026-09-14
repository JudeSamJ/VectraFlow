import structlog
from typing import Any, Dict

from app.integrations.d365.entity_config import D365EntityConfig

logger = structlog.get_logger(__name__)


def entity_record_to_text(record: Dict[str, Any], config: D365EntityConfig) -> str:
    """
    Turns one structured D365 record into a natural-language sentence via
    the entity's configured template — not a raw JSON/field dump, so it
    embeds meaningfully rather than as noise.

    This is intentionally basic (a single str.format() template) so the
    ingestion connector has something real to feed the embedding pipeline
    end-to-end. It's superseded by a proper structured-data chunking module
    (kept separate, per the project's own chunking pipeline conventions).
    """
    safe_values = {k: (record.get(k) if record.get(k) not in (None, "") else "unspecified") for k in config.select_fields}
    try:
        return config.text_template.format(**safe_values)
    except (KeyError, IndexError) as e:
        logger.warning("d365_text_template_field_missing", entity=config.entity_name, error=str(e))
        # Fall back to a plain "field: value" sentence rather than dropping the record.
        parts = [f"{k}: {v}" for k, v in safe_values.items()]
        return f"{config.entity_name} record — " + "; ".join(parts) + "."
