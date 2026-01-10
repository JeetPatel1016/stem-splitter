# Getting Started with Stem Splitter

This guide will help you set up and run the Stem Splitter system on your local machine.

## Prerequisites Check

Before starting, ensure you have:

### Required
- ✅ Docker Desktop installed and running
- ✅ At least 8GB RAM available
- ✅ 10GB+ free disk space

### Optional
- 🎮 NVIDIA GPU with CUDA support (for faster processing)
- 🔧 Docker Compose (usually included with Docker Desktop)

## Installation Steps

### Step 1: Verify Docker Installation

Open a terminal and run:

```bash
docker --version
docker-compose --version
```

You should see version numbers for both commands.

### Step 2: Start the Application

#### On Windows:
Double-click `start.bat` or run:
```cmd
start.bat
```

#### On Mac/Linux:
Make the script executable and run:
```bash
chmod +x start.sh
./start.sh
```

#### Or manually with docker-compose:
```bash
docker-compose up --build
```

### Step 3: Wait for Services to Start

The first run will take several minutes as it:
1. Downloads Docker images
2. Installs dependencies
3. Downloads the Demucs AI model (~500MB)

You'll see logs from all services. Wait until you see:
```
frontend_1  | webpack compiled successfully
backend_1   | Uvicorn running on http://0.0.0.0:8000
worker_1    | Worker started, waiting for jobs...
```

### Step 4: Access the Application

Open your browser and go to:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## First Test

1. Go to http://localhost:3000
2. Click "Upload File" tab
3. Upload a short MP3 file (recommend < 3 minutes for first test)
4. Click "Upload and Split Stems"
5. Watch the progress bar
6. Download individual stems when complete

## Common Issues

### "Docker is not running"
- Start Docker Desktop
- Wait for it to fully initialize (whale icon in system tray)

### "Port already in use"
- Stop other services using ports 3000, 8000, or 6379
- Or modify ports in `docker-compose.yml`

### Frontend can't connect to backend
- Wait 30 seconds for all services to start
- Check services are running: `docker-compose ps`
- Restart if needed: `docker-compose restart`

### Processing is very slow
- First run downloads AI models (one-time)
- CPU processing is slower than GPU (expected)
- Use shorter audio files for testing

### Out of memory
- Close other applications
- Increase Docker memory in Docker Desktop settings:
  - Settings → Resources → Memory → Increase to 8GB+
- Restart Docker Desktop

## Understanding the Output

After processing, you'll get 4 stems:

1. **vocals.wav** - Singing and vocals
2. **drums.wav** - Drum tracks
3. **bass.wav** - Bass guitar and low-frequency instruments
4. **other.wav** - Everything else (guitar, piano, synths, etc.)

## Performance Expectations

Processing time varies based on:

| Setup | Time for 3-min song |
|-------|---------------------|
| CPU only | 5-15 minutes |
| GPU (NVIDIA) | 30-90 seconds |

## Next Steps

- Try the URL feature with a YouTube link
- Process multiple files in parallel
- Experiment with different audio sources
- Check the API documentation at http://localhost:8000/docs

## Stopping the Application

Press `Ctrl+C` in the terminal or run:

```bash
docker-compose down
```

To also remove all data (processed files, uploads):

```bash
docker-compose down -v
```

## Getting Help

1. Check the logs:
   ```bash
   docker-compose logs -f
   ```

2. Restart services:
   ```bash
   docker-compose restart
   ```

3. Full reset:
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

## What's Next?

- Read [README.md](README.md) for full documentation
- Check API endpoints for integration
- Customize Demucs settings in `worker/worker.py`
- Deploy to production (see README.md)

Enjoy separating your stems!
