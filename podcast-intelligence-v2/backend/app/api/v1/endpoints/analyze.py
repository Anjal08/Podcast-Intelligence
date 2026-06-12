import logging
import os
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, status
from typing import List
from bson import ObjectId

from app.core.db import get_database
from app.models.podcast import PodcastResponse, PodcastCreate
from app.services.transcription import compute_file_hash, transcribe_audio
from app.services.intelligence import generate_chapters

router = APIRouter()
logger = logging.getLogger(__name__)

async def process_podcast_task(file_bytes: bytes, filename: str, file_hash: str):
    """Background task to transcribe audio and generate chapters."""
    db = get_database()
    try:
        # 1. Transcribe the audio
        logger.info(f"Background task: Transcribing audio for {filename}")
        transcript = await transcribe_audio(file_bytes, filename)
        
        # 2. Segment into chapters using LLM
        logger.info(f"Background task: Generating chapters for {filename}")
        chapters = await generate_chapters(transcript)
        
        # 3. Update database
        await db.podcasts.update_one(
            {"file_hash": file_hash},
            {
                "$set": {
                    "transcript_text": transcript,
                    "generated_chapters": chapters,
                    "status": "completed"
                }
            }
        )
        logger.info(f"Background task: Successfully processed podcast {filename}")
    except Exception as e:
        logger.error(f"Background task failed for podcast {filename}: {e}")
        await db.podcasts.update_one(
            {"file_hash": file_hash},
            {
                "$set": {
                    "transcript_text": f"Error during processing: {str(e)}",
                    "status": "failed"
                }
            }
        )

@router.post("", response_model=PodcastResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_podcast(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a podcast audio file. 
    Checks if the file has been analyzed before (using SHA256). 
    If yes, returns the existing analysis. If no, starts background analysis.
    """
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable"
        )
        
    try:
        # Read file contents and compute hash
        file_bytes = await file.read()
        file_hash = compute_file_hash(file_bytes)
        
        # Check database for existing file hash
        existing_podcast = await db.podcasts.find_one({"file_hash": file_hash})
        
        if existing_podcast:
            logger.info(f"File cache hit for hash {file_hash}. Returning stored analysis.")
            return PodcastResponse.from_mongo(existing_podcast)
            
        # File is new, create a processing placeholder record
        logger.info(f"New podcast uploaded. Hash: {file_hash}. Initializing background tasks.")
        new_podcast_dict = {
            "file_hash": file_hash,
            "filename": file.filename,
            "transcript_text": "Transcription and chapter generation in progress...",
            "status": "processing",
            "generated_chapters": []
        }
        
        result = await db.podcasts.insert_one(new_podcast_dict)
        new_podcast_dict["_id"] = result.inserted_id
        
        # Add CPU/API intensive tasks to FastAPI background workers
        background_tasks.add_task(
            process_podcast_task,
            file_bytes,
            file.filename,
            file_hash
        )
        
        return PodcastResponse.from_mongo(new_podcast_dict)
        
    except Exception as e:
        logger.error(f"Error analyzing podcast upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while uploading: {e}"
        )

@router.post("/local/{video_id}", response_model=PodcastResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_local_podcast(
    video_id: str,
    background_tasks: BackgroundTasks
):
    """
    Analyze an already downloaded podcast from temp_uploads.
    """
    filepath = os.path.join("temp_uploads", f"{video_id}.mp3")
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found on server."
        )

    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable"
        )
        
    try:
        with open(filepath, "rb") as f:
            file_bytes = f.read()
            
        file_hash = compute_file_hash(file_bytes)
        filename = f"{video_id}.mp3"
        
        # Check database for existing file hash
        existing_podcast = await db.podcasts.find_one({"file_hash": file_hash})
        
        if existing_podcast:
            logger.info(f"File cache hit for hash {file_hash}. Returning stored analysis.")
            return PodcastResponse.from_mongo(existing_podcast)
            
        # File is new, create a processing placeholder record
        logger.info(f"New local podcast analysis. Hash: {file_hash}. Initializing background tasks.")
        new_podcast_dict = {
            "file_hash": file_hash,
            "filename": filename,
            "transcript_text": "Transcription and chapter generation in progress...",
            "status": "processing",
            "generated_chapters": []
        }
        
        result = await db.podcasts.insert_one(new_podcast_dict)
        new_podcast_dict["_id"] = result.inserted_id
        
        # Add CPU/API intensive tasks to FastAPI background workers
        background_tasks.add_task(
            process_podcast_task,
            file_bytes,
            filename,
            file_hash
        )
        
        return PodcastResponse.from_mongo(new_podcast_dict)
        
    except Exception as e:
        logger.error(f"Error analyzing local podcast: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while analyzing: {e}"
        )

@router.get("", response_model=List[PodcastResponse])
async def list_podcasts():
    """Retrieve all analyzed podcasts from the database."""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable"
        )
        
    cursor = db.podcasts.find().sort("_id", -1)
    podcasts = await cursor.to_list(length=100)
    return [PodcastResponse.from_mongo(p) for p in podcasts]

@router.get("/{podcast_id}", response_model=PodcastResponse)
async def get_podcast(podcast_id: str):
    """Retrieve a single podcast by its MongoDB ID."""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable"
        )
        
    if not ObjectId.is_valid(podcast_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid podcast ID format"
        )
        
    podcast = await db.podcasts.find_one({"_id": ObjectId(podcast_id)})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
        
    return PodcastResponse.from_mongo(podcast)
