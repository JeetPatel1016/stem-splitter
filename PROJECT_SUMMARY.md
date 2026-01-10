# Stem Splitter - Project Summary

## What is This?

A complete, production-ready audio stem separation system that uses AI to split songs into individual tracks (vocals, drums, bass, and other instruments). Built with Docker Compose for easy deployment.

## Quick Start

**Windows**:
```cmd
start.bat
```

**Mac/Linux**:
```bash
chmod +x start.sh && ./start.sh
```

Then open http://localhost:3000

## What You Get

### 1. Web Interface
- Beautiful React app with Tailwind CSS
- Drag-and-drop file upload
- URL submission (YouTube, SoundCloud, etc.)
- Real-time progress tracking
- One-click stem downloads

### 2. API Server
- FastAPI REST API
- File upload handling
- URL download via yt-dlp
- Job queue management
- Stem serving

### 3. AI Worker
- Demucs-powered stem separation
- GPU/CPU support
- Automatic job processing
- Progress reporting

### 4. Infrastructure
- Redis for job queuing
- Docker volumes for storage
- Automatic service orchestration

## Project Structure

```
stem-splitter/
├── docker-compose.yml           # Service orchestration
├── docker-compose.cpu.yml       # CPU-only override
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
│
├── start.sh / start.bat         # Startup scripts
│
├── backend/                     # FastAPI server
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                  # API endpoints
│   └── .dockerignore
│
├── worker/                      # Demucs processor
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── worker.py                # Job processor
│   └── .dockerignore
│
├── frontend/                    # React UI
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── index.tsx            # Entry point
│   │   ├── App.tsx              # Main component
│   │   ├── index.css            # Tailwind imports
│   │   ├── api.ts               # API client
│   │   ├── types.ts             # TypeScript types
│   │   └── components/
│   │       ├── FileUpload.tsx   # Upload UI
│   │       ├── URLInput.tsx     # URL form
│   │       └── JobStatus.tsx    # Progress/downloads
│   └── .dockerignore
│
└── Documentation/
    ├── README.md                # Full documentation
    ├── GETTING_STARTED.md       # Setup guide
    ├── ARCHITECTURE.md          # System design
    └── QUICK_REFERENCE.md       # Command cheatsheet
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | Modern UI framework |
| | Tailwind CSS | Utility-first styling |
| **Backend** | Python 3.10 + FastAPI | High-performance API |
| | yt-dlp | URL download support |
| **Worker** | Demucs (htdemucs) | AI stem separation |
| | PyTorch | ML framework |
| **Queue** | Redis 7 | Job management |
| **Deployment** | Docker + Compose | Container orchestration |

## Features

### Core Features
✅ File upload (MP3, WAV, FLAC, M4A, OGG)
✅ URL download (YouTube, SoundCloud, etc.)
✅ 4-stem separation (vocals, drums, bass, other)
✅ Real-time progress tracking
✅ Individual stem downloads
✅ Job management (status, delete)

### Developer Features
✅ Hot reload for all services
✅ Comprehensive API documentation
✅ TypeScript type safety
✅ Docker volumes for persistence
✅ Health check endpoints
✅ Structured logging

### Production Ready
✅ Docker Compose orchestration
✅ Service isolation
✅ Volume management
✅ Error handling
✅ GPU/CPU support
✅ Scalable architecture

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload audio file |
| POST | `/submit-url` | Submit URL to download |
| GET | `/status/{job_id}` | Get job status |
| GET | `/download/{job_id}/{stem}` | Download stem |
| DELETE | `/job/{job_id}` | Delete job |
| GET | `/health` | Health check |

Full API docs: http://localhost:8000/docs

## Environment Requirements

**Minimum**:
- Docker Desktop
- 8GB RAM
- 10GB disk space

**Recommended**:
- NVIDIA GPU with CUDA
- 16GB RAM
- 50GB disk space
- SSD storage

## Performance

| Configuration | Processing Time (3-min song) |
|---------------|------------------------------|
| CPU only | 5-15 minutes |
| NVIDIA GPU | 30-90 seconds |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 3000 | React web UI |
| backend | 8000 | FastAPI server |
| redis | 6379 | Job queue |
| worker | - | Background processor |

## Docker Volumes

| Volume | Purpose |
|--------|---------|
| redis_data | Job queue persistence |
| upload_data | Uploaded audio files |
| output_data | Processed stems |
| demucs_models | Cached AI models (~500MB) |

## Output Format

Each job produces 4 stems in WAV format:

1. **vocals.wav** - Singing and vocal tracks
2. **drums.wav** - Drum and percussion
3. **bass.wav** - Bass guitar and low frequencies
4. **other.wav** - Other instruments (guitar, piano, synths)

## Common Commands

```bash
# Start
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Full reset
docker-compose down -v
docker-compose up --build

# CPU-only mode
docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up
```

## Documentation

| File | Description |
|------|-------------|
| [README.md](README.md) | Complete documentation |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Step-by-step setup guide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture details |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Command reference |

## Development Workflow

1. **Make changes** to code
2. **Hot reload** automatically updates (no rebuild needed)
3. **View logs** with `docker-compose logs -f`
4. **Test** at http://localhost:3000
5. **Debug** via logs and API docs

## Scaling

```bash
# Run multiple workers
docker-compose up --scale worker=3

# Each worker processes jobs independently
```

## Security Notes

⚠️ **This is a development setup**

For production:
- Add authentication
- Enable HTTPS
- Implement rate limiting
- Add file scanning
- Restrict CORS
- Use secrets management
- Set up monitoring

## Next Steps

### For Users
1. Run `start.sh` or `start.bat`
2. Open http://localhost:3000
3. Upload a song or paste a URL
4. Download your stems

### For Developers
1. Read [ARCHITECTURE.md](ARCHITECTURE.md)
2. Check API docs at http://localhost:8000/docs
3. Modify code (hot reload enabled)
4. Review logs with `docker-compose logs -f`

### For Production
1. Review security checklist in README.md
2. Set up authentication
3. Configure HTTPS
4. Set up monitoring
5. Deploy to cloud

## Support

- **Issues**: Check logs with `docker-compose logs -f`
- **Reset**: Run `docker-compose down -v && docker-compose up --build`
- **Documentation**: See README.md, GETTING_STARTED.md, ARCHITECTURE.md

## License

Uses open-source components:
- Demucs (MIT)
- FastAPI (MIT)
- React (MIT)

## Credits

- **AI Model**: Demucs by Meta Research
- **Frontend**: React + Tailwind CSS
- **Backend**: FastAPI
- **Download**: yt-dlp

---

**Ready to separate some stems?** Run `start.sh` or `start.bat` and visit http://localhost:3000
