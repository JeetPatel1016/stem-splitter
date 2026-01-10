# Quick Reference

## Start/Stop Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build

# CPU-only mode
docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up
```

## View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100
```

## Service Management

```bash
# Check status
docker-compose ps

# Restart a service
docker-compose restart worker

# Scale workers
docker-compose up --scale worker=3

# Execute command in container
docker-compose exec backend bash
docker-compose exec worker python --version
```

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Supported Audio Formats

Upload: `.mp3`, `.wav`, `.flac`, `.m4a`, `.ogg`
Output: `.wav` (uncompressed, high quality)

## Output Stems

After processing, you get 4 stems:
- `vocals.wav` - Vocals and singing
- `drums.wav` - Drum tracks
- `bass.wav` - Bass and low frequencies
- `other.wav` - Other instruments

## Common Issues

| Problem | Solution |
|---------|----------|
| Port already in use | Change ports in docker-compose.yml |
| Out of memory | Increase Docker memory limit |
| Slow processing | Enable GPU or use shorter files |
| Frontend can't connect | Wait for all services, check CORS |
| Worker not processing | Check Redis connection, view logs |

## Performance

| Setup | 3-min song |
|-------|-----------|
| CPU | 5-15 min |
| GPU | 30-90 sec |

## File Locations

```
stem-splitter/
├── backend/          # API server
├── frontend/         # React app
├── worker/           # Processing worker
├── docker-compose.yml
└── README.md

Docker volumes:
- upload_data/        # Uploaded files
- output_data/        # Processed stems
- demucs_models/      # Cached AI models
- redis_data/         # Job queue
```

## Environment Variables

Create `.env` file:
```env
REDIS_HOST=redis
REDIS_PORT=6379
REACT_APP_API_URL=http://localhost:8000
```

## API Examples

```bash
# Upload file
curl -X POST -F "file=@song.mp3" http://localhost:8000/upload

# Submit URL
curl -X POST http://localhost:8000/submit-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=..."}'

# Check status
curl http://localhost:8000/status/{job_id}

# Download stem
curl http://localhost:8000/download/{job_id}/vocals -o vocals.wav

# Delete job
curl -X DELETE http://localhost:8000/job/{job_id}
```

## Troubleshooting

```bash
# Full reset
docker-compose down -v
docker system prune -a
docker-compose up --build

# Check disk space
docker system df

# Clean up
docker system prune

# Remove all containers
docker-compose down --remove-orphans
```

## Customization

### Change Demucs Model

Edit `worker/worker.py`:
```python
cmd = [
    "python", "-m", "demucs",
    "-n", "htdemucs",  # Change this
    "--out", str(OUTPUT_DIR),
    str(input_file)
]
```

Options: `htdemucs`, `mdx_extra`, `htdemucs_ft`

### Change Ports

Edit `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change frontend port
  - "8001:8000"  # Change backend port
```

### Disable GPU

Use `docker-compose.cpu.yml` or comment out:
```yaml
# deploy:
#   resources:
#     reservations:
#       devices:
#         - driver: nvidia
```

## Resource Requirements

Minimum:
- 8GB RAM
- 10GB disk space
- Docker Desktop

Recommended:
- 16GB RAM
- 50GB disk space
- NVIDIA GPU with CUDA
- SSD storage

## Production Checklist

- [ ] Set up authentication
- [ ] Configure HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set rate limits
- [ ] Use production database
- [ ] Set up logging
- [ ] Configure CDN
- [ ] Set up alerts
- [ ] Document API
