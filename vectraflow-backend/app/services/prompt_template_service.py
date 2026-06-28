import uuid
from sqlalchemy.ext.asyncio import AsyncSession
# The model for PromptTemplate was omitted from phase 2, let's create a service that implies the DB ops for now.
# Realistically, this would do CRUD for a PromptTemplate model

class PromptTemplateService:
    @staticmethod
    def get_default_system_template() -> str:
        return """You are a knowledge assistant. Answer ONLY using the provided context.
If the context does not contain the answer, say so explicitly — do not
guess or use outside knowledge.

Context:
{% for chunk in context_chunks %}
[{{ loop.index }}] (Source: {{ chunk.document_filename }}, p.{{ chunk.page_number }})
{{ chunk.text }}
{% endfor %}

Conversation history:
{% for msg in history %}
{{ msg.role }}: {{ msg.content }}
{% endfor %}

Question: {{ query }}

Answer with inline citation markers like [1], [2] referring to the sources above."""
        
    async def render(self, template_id: uuid.UUID, context_data: dict, db: AsyncSession) -> str:
        # In full implementation:
        # 1. Fetch template from DB
        # 2. Render with jinja2
        pass
