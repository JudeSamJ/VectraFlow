from fastapi import FastAPI


def setup_telemetry(app: FastAPI) -> None:
    # OpenTelemetry tracing is opt-in. Install opentelemetry-sdk and
    # set ENABLE_TELEMETRY=true to activate distributed tracing.
    pass
