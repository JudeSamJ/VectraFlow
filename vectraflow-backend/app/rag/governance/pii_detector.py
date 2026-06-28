import structlog
from typing import List, Dict, Optional
from pydantic import BaseModel, UUID4
from enum import Enum

logger = structlog.get_logger(__name__)

class PIIAction(str, Enum):
    redact_before_send = "redact_before_send"
    block_ingestion = "block_ingestion"
    flag_only = "flag_only"

class PIIPolicy(BaseModel):
    id: UUID4
    knowledge_base_id: UUID4
    detect_categories: List[str]
    action: PIIAction
    allowed_provider_regions: Optional[List[str]] = None
    restore_in_final_answer: bool = True

class PIIDetector:
    """
    Runs at ingestion time to scan for PII based on policy.
    """
    def __init__(self):
        pass
        
    def scan(self, text: str, policy: PIIPolicy) -> Dict[str, List[str]]:
        """
        Mock implementation: Scans for SSN or Credit Card if in policy.
        Returns detected entities mapped by category.
        """
        detected = {}
        # In reality, this would use Microsoft Presidio or a local NLP model.
        if "ssn" in policy.detect_categories and "XXX-XX-XXXX" in text:
            detected["ssn"] = ["XXX-XX-XXXX"]
            logger.warning("pii_detected", category="ssn")
            
            if policy.action == PIIAction.block_ingestion:
                raise ValueError("Ingestion blocked by PII Policy: SSN detected.")
                
        return detected

class PIIRedactor:
    """
    Runs at generation time, immediately before provider calls.
    NON-BYPASSABLE.
    """
    def __init__(self):
        pass
        
    def redact(self, text: str, policy: PIIPolicy) -> str:
        """
        Replaces sensitive data with placeholder tokens.
        """
        # Mock implementation
        if policy.action != PIIAction.redact_before_send:
            return text
            
        redacted = text
        if "ssn" in policy.detect_categories:
            redacted = redacted.replace("XXX-XX-XXXX", "[REDACTED_SSN_1]")
            
        if redacted != text:
            logger.info("pii_redacted_before_send")
            
        return redacted
        
    def unredact(self, text: str, policy: PIIPolicy, original_text: str) -> str:
        """
        Restores placeholders to original text in the final answer if policy allows.
        """
        if not policy.restore_in_final_answer:
            return text
            
        # Mock implementation: find [REDACTED_SSN_1] and put back XXX-XX-XXXX
        # Real implementation requires tracking the mapping during redact()
        restored = text.replace("[REDACTED_SSN_1]", "XXX-XX-XXXX")
        return restored
