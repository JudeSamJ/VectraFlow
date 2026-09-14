"""
Distinguishes an action request ("create a purchase requisition for item
A0001") from an ordinary question ("what's our policy on requisitions?")
before a chat message is routed. Deliberately separate from
app/rag/query_understanding/query_classifier.py (rag vs. chit-chat, used
inside RAGOrchestrator itself) — this only decides whether to hand a
message to the existing RAG flow unchanged, or to the new action layer
(action_handler.py) instead. Nothing here executes anything.
"""
import json
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import structlog
from pydantic import ValidationError

from app.rag.generation.base_llm_provider import BaseLLMProvider
from app.integrations.d365.action_config import ACTION_WHITELIST, get_action_config

logger = structlog.get_logger(__name__)


@dataclass
class ActionIntentResult:
    is_action: bool
    action_name: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    # Set when the model thought this was an action but named an action
    # outside the whitelist, or the extracted parameters didn't validate —
    # callers should fall back to the normal RAG flow rather than guess.
    rejection_reason: Optional[str] = None


def _whitelist_summary() -> str:
    lines = []
    for cfg in ACTION_WHITELIST.values():
        fields = ", ".join(cfg.param_model.model_fields.keys())
        lines.append(f'- "{cfg.name}": {cfg.description} Parameters: {fields}.')
    return "\n".join(lines)


async def detect_action_intent(query: str, llm: BaseLLMProvider) -> ActionIntentResult:
    system_prompt = (
        "You classify a message to a D365 Finance & Operations assistant as either a QUESTION "
        "(anything answerable by searching documents/knowledge, including general questions about "
        "D365 data) or an ACTION REQUEST asking to perform one of these exact whitelisted operations:\n"
        f"{_whitelist_summary()}\n\n"
        "Only classify as an action if the user is clearly asking to DO one of these things right now, "
        "with enough information to fill in its parameters. If it's a question, or an action outside "
        "this whitelist, or parameters are missing/unclear, classify it as a question instead — never "
        "invent an action or guess missing parameters.\n"
        "Respond with ONLY a JSON object: "
        '{"intent": "question"} or '
        '{"intent": "action", "action_name": "<one of the whitelisted names>", "parameters": {...}}.'
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query},
    ]

    try:
        response_text = ""
        async for chunk in llm.generate_stream(messages, temperature=0.0):
            response_text += chunk
    except Exception as exc:
        logger.error("action_intent_llm_failed", error=str(exc))
        return ActionIntentResult(is_action=False)

    start = response_text.find("{")
    end = response_text.rfind("}") + 1
    if start == -1 or end == 0:
        return ActionIntentResult(is_action=False)

    try:
        data = json.loads(response_text[start:end])
    except json.JSONDecodeError:
        logger.warning("action_intent_unparseable_response", response=response_text[:300])
        return ActionIntentResult(is_action=False)

    if data.get("intent") != "action":
        return ActionIntentResult(is_action=False)

    action_name = data.get("action_name")
    raw_params = data.get("parameters") or {}

    try:
        config = get_action_config(action_name)
    except ValueError as exc:
        logger.info("action_intent_unknown_action", action_name=action_name)
        return ActionIntentResult(is_action=False, rejection_reason=str(exc))

    try:
        config.param_model.model_validate(raw_params)
    except ValidationError as exc:
        logger.info("action_intent_invalid_parameters", action_name=action_name, error=str(exc))
        return ActionIntentResult(
            is_action=True,
            action_name=action_name,
            parameters=raw_params,
            rejection_reason=f"Missing or invalid parameters for '{action_name}': {exc.errors()[0].get('msg', 'invalid input')}",
        )

    return ActionIntentResult(is_action=True, action_name=action_name, parameters=raw_params)
