from typing import List, Any
import structlog

logger = structlog.get_logger(__name__)

class Step:
    def __init__(self, sub_question: str):
        self.sub_question = sub_question

class Plan:
    def __init__(self, steps: List[Step]):
        self.steps = steps

class StepPlanner:
    async def plan(self, query: str) -> Plan:
        # Stub: Just use the original query as a single step
        return Plan(steps=[Step(sub_question=query)])

    async def replan(self, query: str, gathered_context: List[Any], trace: Any) -> Plan:
        # Stub: In a real agent, this looks at gathered context to decide what's missing
        return Plan(steps=[])
