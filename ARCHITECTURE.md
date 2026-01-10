# System Architecture

## Overview

The Stem Splitter is a distributed system for audio stem separation using AI. It consists of four main services orchestrated with Docker Compose.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP (Port 3000)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Service                             │
│  - React + TypeScript + Tailwind CSS                            │
│  - File upload UI                                               │
│  - URL submission form                                          │
│  - Real-time job status polling                                 │
│  - Stem download interface                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API (Port 8000)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Service                             │
│  - FastAPI Python server                                        │
│  - Handles file uploads                                         │
│  - Downloads from URLs (yt-dlp)                                 │
│  - Creates jobs in Redis queue                                  │
│  - Provides job status API                                      │
│  - Serves processed stems                                       │
└─────────────────┬───────────────────────────┬───────────────────┘
                  │                           │
                  │                           │
        Job Queue │                           │ Job Status
                  ▼                           ▼
    ┌─────────────────────────┐   ┌─────────────────────────┐
    │    Redis Service        │   │   Shared Volumes        │
    │  - Job queue (list)     │   │  - upload_data          │
    │  - Job metadata (hash)  │   │  - output_data          │
    │  - Status tracking      │   │  - demucs_models        │
    └───────────┬─────────────┘   └─────────────────────────┘
                │                           ▲
                │ Pop Jobs                  │ Read/Write Files
                ▼                           │
┌─────────────────────────────────────────────────────────────────┐
│                      Worker Service                              │
│  - Python worker process                                        │
│  - Polls Redis for jobs                                         │
│  - Runs Demucs AI model                                         │
│  - Processes audio → stems                                      │
│  - Updates job status                                           │
│  - GPU/CPU support                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend Service (React)

**Technology**: React 18, TypeScript, Tailwind CSS

**Responsibilities**:
- Render user interface
- Handle file uploads via drag-and-drop or file picker
- Accept and validate URLs
- Submit jobs to backend
- Poll job status every 2 seconds
- Display progress bars
- Provide download links for completed stems

**Key Files**:
- `App.tsx` - Main application component
- `FileUpload.tsx` - File upload interface
- `URLInput.tsx` - URL submission form
- `JobStatus.tsx` - Job progress and download UI
- `api.ts` - API client

**Environment**:
- Port: 3000
- Hot reload enabled for development

### 2. Backend Service (FastAPI)

**Technology**: Python 3.10, FastAPI, Redis client

**Responsibilities**:
- REST API endpoints
- File upload handling
- URL download (YouTube, SoundCloud, etc.)
- Job creation and queuing
- Job status retrieval
- File serving (stem downloads)
- Job cleanup

**Key Endpoints**:
- `POST /upload` - Upload audio file
- `POST /submit-url` - Submit URL for download
- `GET /status/{job_id}` - Get job status
- `GET /download/{job_id}/{stem}` - Download stem
- `DELETE /job/{job_id}` - Delete job
- `GET /health` - Health check

**Key Files**:
- `main.py` - FastAPI application
- `requirements.txt` - Python dependencies

**Environment**:
- Port: 8000
- CORS enabled for frontend
- Hot reload enabled

### 3. Worker Service (Demucs)

**Technology**: Python 3.10, Demucs, PyTorch

**Responsibilities**:
- Poll Redis job queue
- Load audio files from shared volume
- Run Demucs stem separation
- Update job progress in Redis
- Save stems to shared volume
- Cleanup temporary files

**Processing Flow**:
1. Wait for job from Redis (BRPOP)
2. Update status to "processing"
3. Load input file
4. Run Demucs model (htdemucs)
5. Extract 4 stems: vocals, drums, bass, other
6. Save stems as WAV files
7. Update status to "completed"
8. Delete input file

**Key Files**:
- `worker.py` - Worker process
- `requirements.txt` - Python dependencies

**Environment**:
- GPU support via NVIDIA Docker runtime
- CPU fallback available
- Model caching for faster subsequent runs

### 4. Redis Service

**Technology**: Redis 7 Alpine

**Responsibilities**:
- Job queue (Redis list)
- Job metadata storage (Redis hash)
- Status synchronization between backend and worker

**Data Structures**:
```
job_queue (list):
  - ["job-uuid-1", "job-uuid-2", ...]

job:{job_id} (hash):
  {
    "job_id": "uuid",
    "status": "queued|processing|completed|failed",
    "filename": "song.mp3",
    "progress": 0-100,
    "message": "Status message",
    "stems": ["vocals", "drums", "bass", "other"]
  }
```

**Environment**:
- Port: 6379
- Persistent storage via volume

## Data Flow

### Upload Flow

```
1. User uploads file in browser
   ↓
2. Frontend sends multipart/form-data to /upload
   ↓
3. Backend saves file to upload_data volume
   ↓
4. Backend creates job in Redis
   ↓
5. Backend pushes job_id to job_queue
   ↓
6. Backend returns job_id to frontend
   ↓
7. Frontend starts polling /status/{job_id}
```

### Processing Flow

```
1. Worker pops job_id from job_queue
   ↓
2. Worker reads job metadata from Redis
   ↓
3. Worker loads audio file from upload_data
   ↓
4. Worker runs Demucs (updates progress 0% → 100%)
   ↓
5. Worker saves stems to output_data/{job_id}/
   ↓
6. Worker updates job status to "completed"
   ↓
7. Frontend polls, sees "completed" status
   ↓
8. Frontend displays download links
```

### Download Flow

```
1. User clicks download link for stem
   ↓
2. Browser requests /download/{job_id}/{stem}
   ↓
3. Backend serves file from output_data/{job_id}/{stem}.wav
   ↓
4. Browser downloads WAV file
```

## Scalability Considerations

### Horizontal Scaling

**Worker Scaling**:
```bash
docker-compose up --scale worker=3
```
Multiple workers can process jobs in parallel.

**Backend Scaling**:
Requires load balancer (nginx/HAProxy) and session affinity.

### Vertical Scaling

- Increase Docker memory limits
- Use larger GPU for worker
- Optimize Demucs model selection

### Storage

- Implement cleanup jobs for old files
- Use S3-compatible object storage for production
- Add file size limits

## Security Considerations

**Current State**: Development-ready, not production-hardened

**Production TODO**:
- Add authentication (JWT, OAuth)
- Rate limiting
- File type validation
- Virus scanning
- HTTPS only
- Input sanitization
- CORS restrictions
- Secret management
- Network isolation

## Monitoring

**Logs**:
```bash
docker-compose logs -f
docker-compose logs -f worker
docker-compose logs -f backend
```

**Metrics to Track**:
- Job processing time
- Queue length
- Success/failure rate
- Disk usage
- Memory usage
- GPU utilization

## Performance Tuning

**Demucs Model Selection**:
- `htdemucs` - Best quality, slowest
- `mdx_extra` - Good quality, medium speed
- `htdemucs_ft` - Fine-tuned variant

**GPU vs CPU**:
- GPU: 30-90 seconds for 3-minute song
- CPU: 5-15 minutes for 3-minute song

**Optimization Tips**:
- Pre-download models
- Use SSD for volumes
- Increase worker memory
- Use smaller input files
- Enable GPU passthrough

## Deployment Options

### Local Development
```bash
docker-compose up
```

### Production (Single Server)
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Cloud Deployment
- AWS: ECS + EFS + ElastiCache
- GCP: GKE + Cloud Storage + Memorystore
- Azure: AKS + Blob Storage + Redis Cache

### Kubernetes
Convert docker-compose.yml to K8s manifests:
```bash
kompose convert
```

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 18 + TypeScript | User interface |
| Styling | Tailwind CSS | Responsive design |
| Backend | FastAPI | REST API server |
| Worker | Python + Demucs | AI processing |
| Queue | Redis | Job management |
| AI Model | Demucs (htdemucs) | Stem separation |
| Container | Docker + Compose | Orchestration |
| Protocol | HTTP/REST | Communication |
| Format | MP3, WAV, etc. | Audio I/O |

## Future Enhancements

- WebSocket for real-time updates
- Multiple model support (user choice)
- Batch processing
- Audio preview in browser
- Stem mixing interface
- User accounts and history
- Payment integration
- CDN for downloads
- Kubernetes deployment
- Monitoring dashboard
