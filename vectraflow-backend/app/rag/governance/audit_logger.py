import structlog
from datetime import datetime
import json
import os

logger = structlog.get_logger(__name__)

class AuditLogger:
    """
    Immutable, append-only record of every query for compliance export.
    Stored separately from operational structlogs.
    """
    def __init__(self, log_path: str = "/tmp/synapse_audit.jsonl"):
        self.log_path = log_path
        
    def log_query(self, user_id: str, kb_id: str, query: str, retrieved_chunk_ids: list[str], pii_categories: list[str], provider: str, final_answer: str):
        """
        Appends an immutable record. NEVER allow DELETE.
        """
        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "kb_id": kb_id,
            "query": query,
            "retrieved_chunk_ids": retrieved_chunk_ids,
            "pii_detected": pii_categories,
            "generation_provider": provider,
            "final_answer": final_answer
        }
        
        # Append to a local file for now (could be S3/WORM storage)
        try:
            with open(self.log_path, "a") as f:
                f.write(json.dumps(record) + "\n")
            logger.info("audit_log_written", kb_id=kb_id)
        except Exception as e:
            logger.error("audit_log_failed", error=str(e))
            # In a highly regulated environment, if audit logging fails, 
            # the query should fail-closed.
            raise RuntimeError("CRITICAL: Failed to write to audit log.")
