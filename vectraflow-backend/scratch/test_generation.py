import asyncio
import json
from app.rag.embeddings.base_provider import BaseLLMProvider
from app.rag.retrieval.base_retriever import RetrievedNode
from app.rag.generation.generation_engine import GenerationEngine

class MockGeneratorLLM(BaseLLMProvider):
    async def generate_stream(self, messages, temperature=0.7):
        # Return a mock response mimicking the streaming format
        text = "Based on the documents, Paris is the capital of France [1]. The sky is blue [2]."
        words = text.split()
        for word in words:
            yield word + " "
            await asyncio.sleep(0.01)
            
    async def generate(self, messages, temperature=0.7):
        pass

async def test():
    nodes = [
        RetrievedNode(
            chunk_id="chunk_a",
            text="Paris is the capital of France.",
            score=0.9,
            metadata={"document_id": "doc_1", "page_number": 1}
        ),
        RetrievedNode(
            chunk_id="chunk_b",
            text="The sky appears blue due to Rayleigh scattering.",
            score=0.8,
            metadata={"document_id": "doc_2", "page_number": 5}
        )
    ]
    
    llm = MockGeneratorLLM()
    engine = GenerationEngine(llm_provider=llm)
    
    print("--- Streaming Output ---")
    async for event in engine.generate_stream("What is the capital of France and why is the sky blue?", nodes):
        print(event, end="")

if __name__ == "__main__":
    asyncio.run(test())
