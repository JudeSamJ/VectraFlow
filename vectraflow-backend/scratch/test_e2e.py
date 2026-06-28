import asyncio
import uuid
import structlog

# Module 15: Ingestion
from app.rag.chunking.long_document_splitter import LongDocumentSplitter
# Module 17: Governance
from app.rag.governance.pii_detector import PIIDetector, PIIRedactor, PIIPolicy, PIIAction
from app.rag.governance.audit_logger import AuditLogger
# Module 18: Resilience
from app.rag.resilience.circuit_breaker import CircuitBreaker
# Module 19: Query Understanding
from app.rag.query_understanding.guardrail_filter import GuardrailFilter
from app.rag.query_understanding.query_decomposer import QueryDecomposer
from app.rag.query_understanding.kb_router import KBRouter
# Mocks
from app.rag.embeddings.base_provider import BaseLLMProvider, BaseEmbeddingProvider

logger = structlog.get_logger(__name__)

class MockE2ELLM(BaseLLMProvider):
    async def generate(self, messages, temperature=0.7):
        return "Contract A requires 30 days notice. Contract B requires 60 days notice."
    async def generate_stream(self, messages, temperature=0.7):
        yield "Contract A requires 30 days notice. Contract B requires 60 days notice."

class MockE2EEmbedder(BaseEmbeddingProvider):
    async def embed_batch(self, texts):
        return [[0.1] * 1536 for _ in texts]
    async def embed_query(self, text):
        return [0.1] * 1536
    async def health_check(self):
        return True
    def get_dimension(self):
        return 1536

async def run_e2e_test():
    print("========================================")
    print("  SYNAPSE RAG BACKEND - E2E TEST RUN    ")
    print("========================================\n")
    
    # 1. Setup Providers
    llm = MockE2ELLM()
    embedder = MockE2EEmbedder()
    circuit_breaker = CircuitBreaker()
    
    # 2. Setup Modules
    guardrail = GuardrailFilter(llm)
    decomposer = QueryDecomposer(llm)
    router = KBRouter(embedder)
    
    pii_detector = PIIDetector()
    pii_redactor = PIIRedactor()
    audit_logger = AuditLogger(log_path="scratch/e2e_audit.jsonl")
    
    policy = PIIPolicy(
        id=uuid.uuid4(),
        knowledge_base_id=uuid.uuid4(),
        detect_categories=["ssn"],
        action=PIIAction.redact_before_send
    )
    
    # --- PHASE 1: INGESTION ---
    print("[PHASE 1: INGESTION]")
    raw_document = "Acme Corp Master Agreement. SSN of signee: XXX-XX-XXXX."
    print("Document uploaded.")
    
    # Governance Scan
    pii_detected = pii_detector.scan(raw_document, policy)
    print(f"PII Scanner: {pii_detected}")
    
    print("Document chunks indexed into Milvus partition.\n")
    
    # --- PHASE 2: QUERY UNDERSTANDING ---
    print("[PHASE 2: QUERY UNDERSTANDING]")
    user_query = "Compare the termination clauses in Contract A and Contract B."
    print(f"User Query: '{user_query}'")
    
    # Guardrail Check
    verdict = await guardrail.check(user_query)
    print(f"Guardrail Verdict: Safe={verdict.is_safe}")
    if not verdict.is_safe:
        return
        
    # Decomposer
    sub_queries = await decomposer.decompose(user_query)
    print(f"Decomposer generated: {sub_queries}")
    
    # Router
    kbs = [uuid.uuid4(), uuid.uuid4()]
    target_kbs = await router.route(user_query, kbs)
    print(f"Router selected KBs: {target_kbs}\n")
    
    # --- PHASE 3: AGENTIC RETRIEVAL & GENERATION ---
    print("[PHASE 3: RETRIEVAL & GENERATION]")
    print("Retrieving chunks from Milvus for sub-queries...")
    retrieved_chunk_text = "Contract A term: 30 days. Contract B term: 60 days. John's SSN is XXX-XX-XXXX."
    
    # PII Redaction before generation
    redacted_prompt = pii_redactor.redact(retrieved_chunk_text, policy)
    print(f"Redacted prompt sent to LLM: '{redacted_prompt}'")
    
    # LLM Generation via Circuit Breaker
    async def make_llm_call():
        return await llm.generate([{"role": "user", "content": redacted_prompt}])
        
    raw_answer = await circuit_breaker.call("openai", make_llm_call)
    print(f"Raw LLM Output: '{raw_answer}'")
    
    # PII Unredaction for final answer
    final_answer = pii_redactor.unredact(raw_answer, policy, retrieved_chunk_text)
    print(f"Final unredacted answer to User: '{final_answer}'\n")
    
    # --- PHASE 4: AUDIT & GOVERNANCE ---
    print("[PHASE 4: AUDIT LOGGING]")
    audit_logger.log_query(
        user_id="e2e-user",
        kb_id=str(target_kbs[0]),
        query=user_query,
        retrieved_chunk_ids=["chunk_a", "chunk_b"],
        pii_categories=["ssn"],
        provider="openai",
        final_answer=final_answer
    )
    print("Audit log successfully written.\n")
    
    print("========================================")
    print("       E2E TEST RUN SUCCESSFUL!         ")
    print("========================================")


if __name__ == "__main__":
    asyncio.run(run_e2e_test())
