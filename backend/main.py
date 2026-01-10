from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl
import redis
import json
import uuid
import os
import aiofiles
import yt_dlp
from pathlib import Path
from typing import Optional, List
import shutil

app = FastAPI(title="Stem Splitter API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/app/outputs"))

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Redis connection
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

# Models
class URLSubmission(BaseModel):
    url: HttpUrl

class JobStatus(BaseModel):
    job_id: str
    status: str  # queued, processing, completed, failed
    progress: Optional[float] = None
    message: Optional[str] = None
    stems: Optional[List[str]] = None

# Helper functions
def create_job(job_id: str, filename: str):
    """Create a new job in Redis"""
    job_data = {
        "job_id": job_id,
        "status": "queued",
        "filename": filename,
        "progress": 0,
        "message": "Job queued for processing"
    }
    redis_client.set(f"job:{job_id}", json.dumps(job_data))
    redis_client.lpush("job_queue", job_id)
    return job_data

def get_job_status(job_id: str) -> Optional[dict]:
    """Get job status from Redis"""
    job_data = redis_client.get(f"job:{job_id}")
    if job_data:
        return json.loads(job_data)
    return None

async def download_from_url(url: str, output_path: Path) -> str:
    """Download audio from URL using yt-dlp"""
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(output_path / '%(title)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        # Change extension to mp3
        filename = Path(filename).with_suffix('.mp3')
        return filename.name

# Routes
@app.get("/")
async def root():
    return {"message": "Stem Splitter API", "version": "1.0.0"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload an audio file for stem separation"""
    if not file.filename.endswith(('.mp3', '.wav', '.flac', '.m4a', '.ogg')):
        raise HTTPException(status_code=400, detail="Invalid file format. Supported: mp3, wav, flac, m4a, ogg")

    # Generate unique job ID
    job_id = str(uuid.uuid4())

    # Save uploaded file
    file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    # Create job
    job_data = create_job(job_id, file.filename)

    return JSONResponse(content={
        "job_id": job_id,
        "filename": file.filename,
        "message": "File uploaded successfully"
    })

@app.post("/submit-url")
async def submit_url(submission: URLSubmission, background_tasks: BackgroundTasks):
    """Submit a URL for audio download and stem separation"""
    job_id = str(uuid.uuid4())

    try:
        # Download file in background
        filename = await download_from_url(str(submission.url), UPLOAD_DIR)

        # Rename to include job_id
        original_path = UPLOAD_DIR / filename
        new_path = UPLOAD_DIR / f"{job_id}_{filename}"
        if original_path.exists():
            original_path.rename(new_path)

        # Create job
        job_data = create_job(job_id, filename)

        return JSONResponse(content={
            "job_id": job_id,
            "filename": filename,
            "message": "URL submitted successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download from URL: {str(e)}")

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    """Get the status of a job"""
    job_data = get_job_status(job_id)

    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatus(**job_data)

@app.get("/download/{job_id}/{stem}")
async def download_stem(job_id: str, stem: str):
    """Download a specific stem from a completed job"""
    job_data = get_job_status(job_id)

    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    if job_data["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")

    # Construct file path
    stem_path = OUTPUT_DIR / job_id / f"{stem}.wav"

    if not stem_path.exists():
        raise HTTPException(status_code=404, detail="Stem file not found")

    return FileResponse(
        path=stem_path,
        media_type="audio/wav",
        filename=f"{stem}.wav"
    )

@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its associated files"""
    job_data = get_job_status(job_id)

    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    # Delete files
    upload_files = list(UPLOAD_DIR.glob(f"{job_id}_*"))
    for f in upload_files:
        f.unlink(missing_ok=True)

    output_dir = OUTPUT_DIR / job_id
    if output_dir.exists():
        shutil.rmtree(output_dir)

    # Delete from Redis
    redis_client.delete(f"job:{job_id}")

    return {"message": "Job deleted successfully"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        redis_client.ping()
        return {"status": "healthy", "redis": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "redis": "disconnected", "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
