FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY ./app /workspace/app

# Set python path
ENV PYTHONPATH=/workspace

# The command will be overridden in docker-compose for api vs celery
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
