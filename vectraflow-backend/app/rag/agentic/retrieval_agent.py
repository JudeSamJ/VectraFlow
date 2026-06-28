import time
import json
import uuid
import structlog
from typing import List, Dict, AsyncGenerator
from dataclasses import dataclass, field

from app.rag.agentic.loop_guard import LoopGuard
from app.rag.retrieval.retrieval_engine import RetrievalEngine
from app.rag.generation.generation_engine import GenerationEngine
from app.rag.embeddings.base_provider import BaseLLMProvider
from app.rag.retrieval.base_retriever import RetrievedNode

logger = structlog.get_logger(__name__)

@dataclass
class AgenticStep:
    sub_question: str
    rationale: str
    retrieved_chunks: List[RetrievedNode] = field(default_factory=list)

@dataclass
class AgentTrace:
    steps: List[AgenticStep] = field(default_factory=list)
    sufficiency_verdicts: List[str] = field(default_factory=list)
    final_answer: str = ""
    partial: bool = False
    stop_reason: str = ""

class AgentPlanner:
    def __init__(self, llm: BaseLLMProvider):
        self.llm = llm
        
    async def plan(self, query: str) -> AgenticStep:
        sys_prompt = "You are a retrieval planner. Decompose the query into the FIRST logical sub-question to search for."
        messages = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": query}]
        
        resp_text = await self.llm.generate(messages, temperature=0.1)
        # Mocking the JSON parse for now
        return AgenticStep(sub_question=query, rationale="Initial search")
        
    async def replan(self, query: str, context: List[RetrievedNode], trace: AgentTrace) -> AgenticStep:
        sys_prompt = "You are a replanner. Look at what we know so far and decide what to search for next."
        # Mocking the replan logic
        return AgenticStep(sub_question="What else?", rationale="Follow up search")

class SufficiencyChecker:
    def __init__(self, llm: BaseLLMProvider):
        self.llm = llm
        
    async def check(self, query: str, context: List[RetrievedNode]) -> bool:
        sys_prompt = "Are the provided context documents sufficient to answer the query? Reply 'YES' or 'NO'."
        # Mocking the sufficiency check
        if len(context) >= 3:
            return True
        return False

class RetrievalAgent:
    def __init__(
        self,
        planner: AgentPlanner,
        sufficiency_checker: SufficiencyChecker,
        retrieval_engine: RetrievalEngine,
        generation_engine: GenerationEngine,
        loop_guard: LoopGuard
    ):
        self.planner = planner
        self.sufficiency_checker = sufficiency_checker
        self.retrieval_engine = retrieval_engine
        self.generation_engine = generation_engine
        self.loop_guard = loop_guard

    async def run_stream(self, query: str, collection_name: str) -> AsyncGenerator[str, None]:
        trace = AgentTrace()
        start_time = time.time()
        gathered_context = []
        tokens_used = 0
        cost_usd = 0.0
        
        step_count = 0
        plan = await self.planner.plan(query)
        
        while True:
            step_count += 1
            exceeded, reason = self.loop_guard.check(step_count, tokens_used, cost_usd, start_time)
            
            if exceeded:
                trace.partial = True
                trace.stop_reason = reason
                yield f"data: {json.dumps({'event': 'loop_guard_tripped', 'reason': reason})}\n\n"
                break
                
            yield f"data: {json.dumps({'event': 'plan_step', 'sub_question': plan.sub_question})}\n\n"
            
            sub_chunks = await self.retrieval_engine.run(plan.sub_question, [plan.sub_question], collection_name)
            plan.retrieved_chunks = sub_chunks
            gathered_context.extend(sub_chunks)
            trace.steps.append(plan)
            
            # Very rough token estimation mock
            tokens_used += len(gathered_context) * 200 
            
            sufficient = await self.sufficiency_checker.check(query, gathered_context)
            trace.sufficiency_verdicts.append(str(sufficient))
            
            yield f"data: {json.dumps({'event': 'sufficiency_check', 'sufficient': sufficient})}\n\n"
            
            if sufficient:
                break
                
            plan = await self.planner.replan(query, gathered_context, trace)

        yield f"data: {json.dumps({'event': 'generation_started'})}\n\n"
        
        async for chunk in self.generation_engine.generate_stream(query, nodes=gathered_context):
            yield chunk
