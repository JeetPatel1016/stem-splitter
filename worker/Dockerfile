FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install PyTorch CPU-only version first (much smaller, ~100MB vs ~3GB)
# This prevents the large CUDA dependencies from being downloaded
RUN pip install --no-cache-dir \
    torch==2.1.0+cpu \
    torchaudio==2.1.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir redis==5.0.1 demucs==4.0.1

# Note: Source code is mounted via docker-compose volume for hot-reload

# Create necessary directories
RUN mkdir -p /app/uploads /app/outputs

CMD ["python", "worker.py"]
