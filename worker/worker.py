import redis
import json
import os
import time
import signal
import sys
from pathlib import Path
import shutil
import logging
from contextlib import contextmanager
from typing import Optional, List
from threading import Thread, Event
import torch
import torchaudio
from demucs.pretrained import get_model
from demucs.apply import apply_model
from demucs.audio import save_audio

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
MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))
JOB_TIMEOUT = int(os.getenv("JOB_TIMEOUT", 600))  # 10 minutes default
REDIS_RETRY_DELAY = 5
REDIS_MAX_RETRIES = 10

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Global shutdown flag
shutdown_requested = False
current_job_id = None

# Redis connection with retry logic
redis_client = None


def connect_redis():
    """Connect to Redis with retry logic"""
    global redis_client

    for attempt in range(REDIS_MAX_RETRIES):
        try:
            client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=0,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30
            )
            # Test connection
            client.ping()
            redis_client = client
            logger.info("Successfully connected to Redis")
            return client
        except redis.ConnectionError as e:
            logger.warning(f"Redis connection attempt {attempt + 1}/{REDIS_MAX_RETRIES} failed: {e}")
            if attempt < REDIS_MAX_RETRIES - 1:
                time.sleep(REDIS_RETRY_DELAY)
            else:
                logger.error("Failed to connect to Redis after all retries")
                raise


def update_job_status(job_id: str, status: str, progress: float = None, message: str = None, stems: list = None):
    """Update job status in Redis using atomic hash operations"""
    try:
        key = f"job:{job_id}"
        updates = {"status": status}

        if progress is not None:
            updates["progress"] = str(progress)
        if message is not None:
            updates["message"] = message
        if stems is not None:
            updates["stems"] = json.dumps(stems)

        # Atomic update using HSET
        redis_client.hset(key, mapping=updates)
        logger.info(f"Job {job_id}: {status} - {message if message else ''}")
    except redis.ConnectionError:
        logger.error(f"Failed to update job {job_id} status due to Redis connection error")
        connect_redis()  # Attempt to reconnect


def get_job_data(job_id: str) -> Optional[dict]:
    """Get job data from Redis"""
    try:
        key = f"job:{job_id}"
        data = redis_client.hgetall(key)
        if data:
            # Parse stems if it exists
            if "stems" in data and data["stems"]:
                data["stems"] = json.loads(data["stems"])
            # Parse progress if it exists
            if "progress" in data:
                data["progress"] = float(data["progress"])
            return data
        return None
    except Exception as e:
        logger.error(f"Error getting job data for {job_id}: {e}")
        return None


def handle_shutdown(signum, frame):
    """Handle shutdown signals gracefully"""
    global shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True

    if current_job_id:
        logger.info(f"Marking current job {current_job_id} as failed due to shutdown")
        update_job_status(current_job_id, "failed", message="Worker shutdown during processing")


@contextmanager
def cleanup_on_error(job_id: str, input_file: Path, job_output_dir: Path):
    """Context manager to ensure cleanup on errors"""
    try:
        yield
    except Exception:
        # Clean up on error
        logger.info(f"Cleaning up failed job {job_id} artifacts")
        if job_output_dir.exists():
            shutil.rmtree(job_output_dir, ignore_errors=True)
        if input_file and input_file.exists():
            input_file.unlink(missing_ok=True)
        raise


def process_audio_with_timeout(job_id: str, filename: str, timeout: int, job_params: Optional[dict] = None):
    """Wrapper to run process_audio with timeout"""
    result = {"success": False, "error": None}
    completed = Event()

    def run_processing():
        try:
            process_audio(job_id, filename, job_params)
            result["success"] = True
        except Exception as e:
            result["error"] = str(e)
        finally:
            completed.set()

    thread = Thread(target=run_processing, daemon=True)
    thread.start()
    thread.join(timeout=timeout)

    if thread.is_alive():
        # Timeout occurred
        error_msg = f"Job timeout after {timeout} seconds"
        logger.error(f"Job {job_id} {error_msg}")
        update_job_status(job_id, "failed", 0, error_msg)
        raise TimeoutError(error_msg)

    if not result["success"]:
        raise Exception(result["error"])


def process_audio(job_id: str, filename: str, job_params: Optional[dict] = None):
    """Process audio file with Demucs using Python API

    Args:
        job_id: Unique job identifier
        filename: Name of the audio file
        job_params: Optional parameters for processing:
            - model: Model to use (htdemucs, htdemucs_ft, htdemucs_6s, mdx_extra)
            - shifts: Number of random shifts for higher quality (0-10, default: 1)
            - overlap: Overlap between chunks (0.1-0.9, default: 0.25)
            - split: Split audio into chunks (True/False, default: True)
    """
    input_file = None
    job_output_dir = None

    # Parse job parameters
    if job_params is None:
        job_params = {}

    model_name = job_params.get("model", "htdemucs")
    shifts = int(job_params.get("shifts", 1))
    overlap = float(job_params.get("overlap", 0.25))
    split = job_params.get("split", True)

    try:
        # Check for shutdown request
        if shutdown_requested:
            logger.info(f"Shutdown requested, skipping job {job_id}")
            return

        # Find the input file
        input_files = list(UPLOAD_DIR.glob(f"{job_id}_*"))
        if not input_files:
            raise FileNotFoundError(f"Input file not found for job {job_id}")

        input_file = input_files[0]
        logger.info(f"Processing file: {input_file} with model={model_name}, shifts={shifts}, overlap={overlap}")

        update_job_status(job_id, "processing", 10, "Starting stem separation...")

        # Create output directory for this job
        job_output_dir = OUTPUT_DIR / job_id
        job_output_dir.mkdir(parents=True, exist_ok=True)

        with cleanup_on_error(job_id, input_file, job_output_dir):
            # Load Demucs model
            update_job_status(job_id, "processing", 20, f"Loading {model_name} model...")
            logger.info(f"Loading {model_name} model...")

            model = get_model(model_name)
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            model.to(device)
            logger.info(f"Model loaded on device: {device}")

            # Load audio
            update_job_status(job_id, "processing", 30, "Loading audio file...")
            logger.info(f"Loading audio from {input_file}")

            wav, sr = torchaudio.load(str(input_file))
            wav = wav.to(device)

            # Ensure stereo audio (Demucs expects 2 channels)
            if wav.shape[0] == 1:
                logger.info("Converting mono audio to stereo")
                wav = wav.repeat(2, 1)  # Duplicate mono channel to create stereo
            elif wav.shape[0] > 2:
                logger.info(f"Converting {wav.shape[0]} channels to stereo")
                wav = wav[:2, :]  # Take only first 2 channels

            # Resample if necessary
            if sr != model.samplerate:
                logger.info(f"Resampling from {sr}Hz to {model.samplerate}Hz")
                resampler = torchaudio.transforms.Resample(sr, model.samplerate).to(device)
                wav = resampler(wav)
                sr = model.samplerate

            update_job_status(job_id, "processing", 40, "Separating audio tracks...")
            logger.info(f"Running stem separation with shifts={shifts}, overlap={overlap}, split={split}...")

            # Validate audio length and adjust split parameter if needed
            # Note: BagOfModels (when shifts > 0) doesn't have valid_length, so check if method exists
            audio_length = wav.shape[1]
            if hasattr(model, 'valid_length'):
                try:
                    model.valid_length(audio_length)
                except ValueError as e:
                    # Audio is too long for the model without splitting
                    if not split:
                        logger.warning(f"Audio length {audio_length} exceeds model capacity. Forcing split=True")
                        split = True

            # Apply model with custom parameters
            with torch.no_grad():
                sources = apply_model(
                    model,
                    wav.unsqueeze(0),
                    device=device,
                    shifts=shifts,
                    overlap=overlap,
                    split=split,
                    progress=False
                )[0]

            # Check for shutdown before saving
            if shutdown_requested:
                logger.info(f"Shutdown requested during processing of job {job_id}")
                return

            update_job_status(job_id, "processing", 70, "Saving separated stems...")
            logger.info("Saving stems...")

            # Save each stem
            stems = []
            stem_names = model.sources  # ['drums', 'bass', 'other', 'vocals']

            for i, (source, name) in enumerate(zip(sources, stem_names)):
                output_path = job_output_dir / f"{name}.wav"
                save_audio(source.cpu(), output_path, sr)
                stems.append(name)
                logger.info(f"Saved {name}.wav")

                # Update progress for each stem saved
                progress = 70 + (i + 1) / len(stem_names) * 20
                update_job_status(job_id, "processing", progress, f"Saved {name}.wav")

            # Delete input file to save space
            logger.info(f"Cleaning up input file: {input_file}")
            input_file.unlink(missing_ok=True)

            update_job_status(job_id, "completed", 100, "Stem separation completed!", stems)
            logger.info(f"Job {job_id} completed successfully. Stems: {stems}")

    except Exception as e:
        error_msg = f"Error processing job {job_id}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        update_job_status(job_id, "failed", 0, error_msg)
        raise


def retry_failed_job(job_id: str):
    """Move job to retry queue or dead letter queue"""
    try:
        job_data = get_job_data(job_id)
        if not job_data:
            logger.error(f"Cannot retry job {job_id}: job data not found")
            return

        retry_count = int(job_data.get("retry_count", 0))

        if retry_count < MAX_RETRIES:
            # Increment retry count
            redis_client.hset(f"job:{job_id}", "retry_count", str(retry_count + 1))
            # Push back to queue
            redis_client.lpush("job_queue", job_id)
            logger.info(f"Job {job_id} queued for retry {retry_count + 1}/{MAX_RETRIES}")
        else:
            # Move to dead letter queue
            redis_client.lpush("job_dead_letter", job_id)
            update_job_status(job_id, "failed", 0, f"Max retries ({MAX_RETRIES}) exceeded")
            logger.error(f"Job {job_id} moved to dead letter queue after {MAX_RETRIES} retries")
    except Exception as e:
        logger.error(f"Error retrying job {job_id}: {e}")


def main():
    """Main worker loop with graceful shutdown and retry logic"""
    global current_job_id, redis_client

    # Register signal handlers
    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)

    logger.info("Worker starting...")

    # Connect to Redis with retry logic
    try:
        connect_redis()
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)

    logger.info("Worker started, waiting for jobs...")

    while not shutdown_requested:
        try:
            # Block and wait for a job (BRPOP with timeout)
            result = redis_client.brpop("job_queue", timeout=5)

            if result:
                _, job_id = result
                current_job_id = job_id
                logger.info(f"Received job: {job_id}")

                # Get job data
                job_data = get_job_data(job_id)
                if not job_data:
                    logger.error(f"Job data not found for {job_id}")
                    current_job_id = None
                    continue

                filename = job_data.get("filename")
                if not filename:
                    logger.error(f"Filename not found in job data for {job_id}")
                    update_job_status(job_id, "failed", 0, "Invalid job data: missing filename")
                    current_job_id = None
                    continue

                # Extract job parameters if they exist
                job_params = {}
                if "params" in job_data:
                    try:
                        job_params = json.loads(job_data["params"]) if isinstance(job_data["params"], str) else job_data["params"]
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid params format for job {job_id}, using defaults")

                # Process the job with timeout
                start_time = time.time()
                try:
                    process_audio_with_timeout(job_id, filename, JOB_TIMEOUT, job_params)
                    processing_time = time.time() - start_time
                    logger.info(f"Job {job_id} processed in {processing_time:.2f} seconds")
                except TimeoutError as e:
                    logger.error(f"Job {job_id} timed out: {e}")
                    # Don't retry timeout errors - they'll likely timeout again
                    update_job_status(job_id, "failed", 0, str(e))
                except Exception as e:
                    logger.error(f"Job {job_id} failed: {e}")
                    # Retry logic
                    retry_failed_job(job_id)
                finally:
                    current_job_id = None

            # Check if we should shutdown
            if shutdown_requested:
                logger.info("Graceful shutdown initiated")
                break

        except redis.ConnectionError as e:
            logger.error(f"Redis connection error: {e}")
            try:
                connect_redis()
            except Exception:
                logger.error("Failed to reconnect to Redis, waiting before retry...")
                time.sleep(REDIS_RETRY_DELAY)
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}", exc_info=True)
            time.sleep(1)

    logger.info("Worker shutting down gracefully")


if __name__ == "__main__":
    main()
