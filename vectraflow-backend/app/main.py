from fastapi import FastAPI
from app.config import settings
from app.api.v1.router import api_router
from app.core.telemetry import setup_telemetry

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
    )
    
    setup_telemetry(app)
    app.include_router(api_router, prefix="/api/v1")
    
    @app.get("/health")
    async def health_check():
        return {"status": "ok"}
        
    return app

app = create_app()
