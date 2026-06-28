import structlog
from typing import Dict, Any

logger = structlog.get_logger("audit")

class AuditLogger:
    def log_retrieval(self, user_id: str, kb_id: str, query: str, retrieved_chunk_ids: list[str]):
        """
        Logs every retrieval event to a write-only sink for compliance.
        """
        logger.info(
            "audit_retrieval_event",
            user_id=user_id,
            kb_id=kb_id,
            query=query, # Depending on compliance, query might be hashed or scrubbed
            chunks_accessed=retrieved_chunk_ids
        )
