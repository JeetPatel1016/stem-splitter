import redis
import json
import os
import time
import subprocess
from pathlib import Path
import shutil
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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


def update_job_status(job_id: str, status: str, progress: float = None, message: str = None, stems: list = None):
    """Update job status in Redis"""
    job_data = redis_client.get(f"job:{job_id}")
    if job_data:
        job = json.loads(job_data)
        job["status"] = status
        if progress is not None:
            job["progress"] = progress
        if message is not None:
            job["message"] = message
        if stems is not None:
            job["stems"] = stems
        redis_client.set(f"job:{job_id}", json.dumps(job))
        logger.info(f"Job {job_id}: {status} - {message}")


def process_audio(job_id: str, filename: str):
    """Process audio file with Demucs"""
    try:
        # Find the input file
        input_files = list(UPLOAD_DIR.glob(f"{job_id}_*"))
        if not input_files:
            raise FileNotFoundError(f"Input file not found for job {job_id}")

        input_file = input_files[0]
        logger.info(f"Processing file: {input_file}")

        update_job_status(job_id, "processing", 10, "Starting stem separation...")

        # Create output directory for this job
        job_output_dir = OUTPUT_DIR / job_id
        job_output_dir.mkdir(parents=True, exist_ok=True)

        # Run Demucs
        # Using htdemucs model (hybrid transformer demucs)
        # Outputs: drums, bass, other, vocals
        update_job_status(job_id, "processing", 20, "Running Demucs model...")

        cmd = [
            "python", "-m", "demucs",
            "-n", "htdemucs",
            "--out", str(OUTPUT_DIR),
            str(input_file)
        ]

        logger.info(f"Running command: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )

        # Monitor progress
        for line in process.stdout:
            logger.info(f"Demucs output: {line.strip()}")
            # Simple progress estimation
            if "Separating" in line:
                update_job_status(job_id, "processing", 50, "Separating audio tracks...")
            elif "Decoding" in line:
                update_job_status(job_id, "processing", 70, "Decoding separated tracks...")

        process.wait()

        if process.returncode != 0:
            raise Exception(f"Demucs failed with return code {process.returncode}")

        update_job_status(job_id, "processing", 90, "Organizing output files...")

        # Find and move the output files
        # Demucs creates: OUTPUT_DIR/job_id/htdemucs/filename/*.wav
        demucs_output = OUTPUT_DIR / job_id / "htdemucs"
        if not demucs_output.exists():
            # Try alternative path structure
            demucs_output = OUTPUT_DIR / "htdemucs" / job_id

        if not demucs_output.exists():
            raise Exception("Demucs output directory not found")

        # Find the actual output directory (it uses the original filename)
        track_dirs = [d for d in demucs_output.iterdir() if d.is_dir()]
        if not track_dirs:
            raise Exception("No track directory found in Demucs output")

        track_dir = track_dirs[0]
        logger.info(f"Found track directory: {track_dir}")

        # Move stems to job output directory
        stems = []
        for stem_file in track_dir.glob("*.wav"):
            dest_file = job_output_dir / stem_file.name
            shutil.copy2(stem_file, dest_file)
            stems.append(stem_file.stem)  # stem name without extension
            logger.info(f"Copied {stem_file.name} to {dest_file}")

        # Clean up intermediate files
        if demucs_output.exists():
            shutil.rmtree(demucs_output)

        # Delete input file to save space
        input_file.unlink(missing_ok=True)

        update_job_status(job_id, "completed", 100, "Stem separation completed!", stems)
        logger.info(f"Job {job_id} completed successfully. Stems: {stems}")

    except Exception as e:
        error_msg = f"Error processing job {job_id}: {str(e)}"
        logger.error(error_msg)
        update_job_status(job_id, "failed", 0, error_msg)


def main():
    """Main worker loop"""
    logger.info("Worker started, waiting for jobs...")

    while True:
        try:
            # Block and wait for a job (BRPOP with timeout)
            result = redis_client.brpop("job_queue", timeout=5)

            if result:
                _, job_id = result
                logger.info(f"Received job: {job_id}")

                # Get job data
                job_data = redis_client.get(f"job:{job_id}")
                if not job_data:
                    logger.error(f"Job data not found for {job_id}")
                    continue

                job = json.loads(job_data)
                filename = job["filename"]

                # Process the job
                process_audio(job_id, filename)

        except redis.ConnectionError as e:
            logger.error(f"Redis connection error: {e}")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
