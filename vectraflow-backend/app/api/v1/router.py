from fastapi import APIRouter
from app.api.v1 import auth, users, chat, agentic, document_versions, evaluations, ingest
from app.api.v1 import knowledge_bases, conversations, kb_chat, analytics, admin, governance
from app.api.v1 import d365, actions

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(knowledge_bases.router, prefix="/knowledge-bases", tags=["knowledge-bases"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(kb_chat.router, prefix="/knowledge-bases", tags=["kb-chat"])
api_router.include_router(chat.router, prefix="/knowledge-bases", tags=["chat"])
api_router.include_router(agentic.router, prefix="/knowledge-bases", tags=["agentic"])
api_router.include_router(document_versions.router, prefix="/documents", tags=["document_versions"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(ingest.router, prefix="/knowledge-bases", tags=["ingestion"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(governance.router, tags=["governance"])
api_router.include_router(d365.router, prefix="/knowledge-bases", tags=["d365"])
api_router.include_router(d365.global_router, prefix="/d365", tags=["d365"])
api_router.include_router(actions.router, prefix="/knowledge-bases", tags=["d365-actions"])
api_router.include_router(actions.global_router, prefix="/d365-actions", tags=["d365-actions"])
