import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
from app.config import settings
from app.api.v1.router import api_router
from app.core.telemetry import setup_telemetry
import requests

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
    )

    allowed_origins = [
        origin.strip()
        for origin in settings.CORS_ALLOWED_ORIGINS.split(",")
        if origin.strip()
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=settings.CORS_ALLOWED_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_cors_headers(request: Request, call_next):
        origin = request.headers.get("origin")
        if origin:
            normalized_origin = origin.rstrip("/")
            is_allowed = normalized_origin in allowed_origins or bool(
                re.match(settings.CORS_ALLOWED_ORIGIN_REGEX, normalized_origin)
            )
            if is_allowed:
                if request.method == "OPTIONS":
                    response = Response(status_code=200)
                    response.headers["Access-Control-Allow-Origin"] = normalized_origin
                    response.headers["Access-Control-Allow-Credentials"] = "true"
                    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                    requested_headers = request.headers.get("access-control-request-headers")
                    response.headers["Access-Control-Allow-Headers"] = requested_headers or "*"
                    response.headers["Vary"] = "Origin"
                    return response

                response = await call_next(request)
                response.headers["Access-Control-Allow-Origin"] = normalized_origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Vary"] = "Origin"
                return response

        return await call_next(request)

    setup_telemetry(app)
    app.include_router(api_router, prefix="/api/v1")
    
    @app.get("/health")
    async def health_check():
        return {"status": "ok"}
    
    @app.get("/my-ip")
    def my_ip():
        ip = requests.get("https://api.ipify.org").text
        return {
        "render_outbound_ip": ip
        }
        
    return app

app = create_app()
