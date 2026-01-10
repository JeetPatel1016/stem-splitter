FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with optimizations for large packages
# Use --no-cache-dir to avoid caching issues
# Install in smaller batches to reduce memory pressure
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt --timeout 1000

# Note: Source code is mounted via docker-compose volume for hot-reload

# Create necessary directories
RUN mkdir -p /app/uploads /app/outputs

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
