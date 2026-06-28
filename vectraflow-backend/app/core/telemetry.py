from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from fastapi import FastAPI
from app.config import settings

def setup_telemetry(app: FastAPI):
    if not settings.ENABLE_TELEMETRY:
        return

    provider = TracerProvider()
    # In production, this would use OTLPSpanExporter to send to Jaeger/Datadog
    processor = BatchSpanProcessor(ConsoleSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    
    # We would also instrument FastAPI, SQLAlchemy, and Redis here
    # e.g., FastAPIInstrumentor.instrument_app(app)
