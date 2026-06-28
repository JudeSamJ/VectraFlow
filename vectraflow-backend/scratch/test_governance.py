import uuid
import os
from app.rag.governance.pii_detector import PIIDetector, PIIRedactor, PIIPolicy, PIIAction
from app.rag.governance.audit_logger import AuditLogger

def test():
    kb_id = uuid.uuid4()
    policy = PIIPolicy(
        id=uuid.uuid4(),
        knowledge_base_id=kb_id,
        detect_categories=["ssn"],
        action=PIIAction.redact_before_send,
        restore_in_final_answer=True
    )
    
    print("--- Testing PIIDetector (Ingestion) ---")
    detector = PIIDetector()
    text = "John Doe's SSN is XXX-XX-XXXX."
    detected = detector.scan(text, policy)
    print(f"Detected PII: {detected}")
    
    print("\n--- Testing PIIRedactor (Generation) ---")
    redactor = PIIRedactor()
    redacted_text = redactor.redact(text, policy)
    print(f"Redacted Text sent to LLM: {redacted_text}")
    
    # Simulate LLM generating an answer using the redacted text
    llm_answer = "The user's SSN is [REDACTED_SSN_1]."
    final_answer = redactor.unredact(llm_answer, policy, text)
    print(f"Final unredacted answer to user: {final_answer}")
    
    print("\n--- Testing Audit Logger ---")
    log_path = "scratch/test_audit.jsonl"
    if os.path.exists(log_path):
        os.remove(log_path)
        
    logger = AuditLogger(log_path=log_path)
    logger.log_query(
        user_id="user123",
        kb_id=str(kb_id),
        query="What is John's SSN?",
        retrieved_chunk_ids=["chunk1"],
        pii_categories=["ssn"],
        provider="openai",
        final_answer=final_answer
    )
    
    with open(log_path, "r") as f:
        print(f"Audit log entry:\n{f.read()}")

if __name__ == "__main__":
    test()
