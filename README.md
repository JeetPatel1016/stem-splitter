# Stem Splitter

A complete audio stem separation system using Demucs AI, built with Docker Compose. Upload MP3 files or paste URLs to separate audio into individual stems (vocals, drums, bass, etc.).

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS web client
- **Backend**: FastAPI Python server with REST API
- **Worker**: Demucs-powered audio processing service
- **Queue**: Redis for job management
- **Storage**: Shared volumes for uploads and outputs

## Features

- 🎵 Upload audio files (MP3, WAV, FLAC, M4A, OGG)
- 🔗 Download from URLs (YouTube, SoundCloud, etc. via yt-dlp)
- 🤖 High-quality stem separation using Demucs AI
- 📊 Real-time progress tracking
- 💾 Download individual stems
- 🎨 Beautiful, responsive UI with Tailwind CSS

## Prerequisites

- Docker Desktop (with Docker Compose)
- NVIDIA GPU with CUDA support (optional, for faster processing)
- At least 8GB RAM
- 10GB+ free disk space

## Quick Start

1. **Clone or navigate to the project directory**

```bash
cd stem-splitter
```

2. **Start all services**

```bash
docker-compose up --build
```

This will:
- Build all Docker images
- Start Redis, backend, worker, and frontend services
- Frontend will be available at http://localhost:3000
- Backend API at http://localhost:8000

3. **Access the application**

Open your browser and go to http://localhost:3000

## Usage

### Upload a File

1. Click the "Upload File" tab
2. Drag and drop an audio file or click to browse
3. Click "Upload and Split Stems"
4. Wait for processing to complete
5. Download individual stems

### Use a URL

1. Click the "From URL" tab
2. Paste a URL (YouTube, SoundCloud, etc.)
3. Click "Download and Split Stems"
4. Wait for download and processing
5. Download individual stems

## API Endpoints

### Backend (Port 8000)

- `POST /upload` - Upload an audio file
- `POST /submit-url` - Submit a URL for processing
- `GET /status/{job_id}` - Get job status
- `GET /download/{job_id}/{stem}` - Download a specific stem
- `DELETE /job/{job_id}` - Delete a job and its files
- `GET /health` - Health check

### Example API Usage

```bash
# Upload a file
curl -X POST -F "file=@song.mp3" http://localhost:8000/upload

# Check status
curl http://localhost:8000/status/{job_id}

# Download a stem
curl http://localhost:8000/download/{job_id}/vocals -o vocals.wav
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory to customize settings:

```env
# Backend
REDIS_HOST=redis
REDIS_PORT=6379
UPLOAD_DIR=/app/uploads
OUTPUT_DIR=/app/outputs

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

### Demucs Models

The worker uses the default `htdemucs` model. To change the model or separation type:

Edit `worker/worker.py` line 50-58:

```python
# For full 4-stem separation (drums, bass, other, vocals)
cmd = [
    "python", "-m", "demucs",
    "-n", "htdemucs",  # or "mdx_extra", "htdemucs_ft"
    "--out", str(OUTPUT_DIR),
    str(input_file)
]
```

Available models:
- `htdemucs` - Hybrid Transformer Demucs (default, best quality)
- `mdx_extra` - Extra model variant
- `htdemucs_ft` - Fine-tuned version

### GPU Support

The docker-compose.yml is configured for NVIDIA GPU support. If you don't have a GPU:

1. Comment out the GPU section in `docker-compose.yml`:

```yaml
# deploy:
#   resources:
#     reservations:
#       devices:
#         - driver: nvidia
#           count: all
#           capabilities: [gpu]
```

Processing will use CPU (slower but functional).

## Development

### Project Structure

```
stem-splitter/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── worker/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── worker.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── types.ts
│       └── components/
│           ├── FileUpload.tsx
│           ├── URLInput.tsx
│           └── JobStatus.tsx
└── README.md
```

### Running in Development Mode

All services are configured with hot-reload:

```bash
# Start with logs
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart worker
```

### Rebuilding After Changes

```bash
# Rebuild all services
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend
```

## Troubleshooting

### Frontend can't connect to backend

- Ensure `REACT_APP_API_URL` is set correctly
- Check that backend is running: `docker-compose ps`
- Verify CORS settings in `backend/main.py`

### Worker not processing jobs

- Check worker logs: `docker-compose logs worker`
- Verify Redis connection: `docker-compose logs redis`
- Ensure upload directory has files: `docker-compose exec worker ls /app/uploads`

### Out of memory errors

- Reduce concurrent processing
- Use smaller audio files
- Increase Docker memory limit in Docker Desktop settings

### Slow processing

- Enable GPU support if available
- Use a smaller Demucs model
- Reduce input file quality/length

## Performance Tips

1. **GPU Acceleration**: Use NVIDIA GPU for 10-20x faster processing
2. **File Size**: Smaller files process faster (consider trimming long tracks)
3. **Model Selection**: Use `htdemucs` for quality, lighter models for speed
4. **Concurrent Jobs**: Worker processes one job at a time by default

## Volumes and Data

Docker volumes store:
- `redis_data` - Job queue and status
- `upload_data` - Uploaded files (temporary)
- `output_data` - Processed stems
- `demucs_models` - Cached AI models

To clear all data:

```bash
docker-compose down -v
```

## Production Deployment

For production:

1. Set up proper environment variables
2. Use a reverse proxy (nginx)
3. Enable HTTPS
4. Set up authentication
5. Configure file size limits
6. Set up monitoring and logging
7. Use a persistent storage solution
8. Configure auto-cleanup of old jobs

## License

This project uses:
- Demucs (MIT License)
- FastAPI (MIT License)
- React (MIT License)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions:
- Check the logs: `docker-compose logs`
- Review this README
- Check Docker and system resources
