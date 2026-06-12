import os
import logging
import yt_dlp
import re
import time
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

from app.core.db import get_database
from app.services.intelligence import generate_chapters
from app.api.v1.endpoints.analyze import process_podcast_task
from youtube_transcript_api import YouTubeTranscriptApi

router = APIRouter()
logger = logging.getLogger(__name__)

class YouTubeDownloadRequest(BaseModel):
    url: str

@router.get("/download-local/{video_id}", status_code=status.HTTP_200_OK)
async def download_local_mp3(video_id: str):
    """
    Download the extracted MP3 file from the local cache.
    """
    temp_dir = "temp_uploads"
    filepath = os.path.join(temp_dir, f"{video_id}.mp3")
    
    # File Existence Check
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file is no longer available on the server cache."
        )
        
    # Stream Response
    return FileResponse(
        path=filepath,
        media_type="audio/mpeg",
        filename=f"extracted_podcast_{video_id}.mp3"
    )

@router.post("/extract-youtube", status_code=status.HTTP_202_ACCEPTED)
async def extract_youtube(request: YouTubeDownloadRequest):
    """
    Extract audio from a YouTube URL using yt-dlp.
    Returns the video_id so the client can download the MP3.
    """
    # --- PARSE VIDEO ID EARLY ---
    match = re.search(r"(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})", request.url)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse a valid YouTube video ID from the provided URL."
        )
    video_id = match.group(1)

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    filename = f"{video_id}.mp3"
    filepath = os.path.join(temp_dir, filename)

    # --- CACHE CHECK: Return existing record if already processed ---
    if os.path.exists(filepath):
        logger.info(f"Cache hit for video {video_id} — returning existing file")
        return {
            "message": "Returning cached MP3 for this YouTube video.",
            "status": "success",
            "audioAvailable": True,
            "video_id": video_id
        }

    # Base yt-dlp options
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': 'temp_uploads/%(id)s.%(ext)s',
        'socket_timeout': 15,
        'retries': 2,
        'nocheckcertificate': True,
        'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    # Session Spoofing / Cookie Bypass
    cookie_path = "cookies.txt"
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path
        logger.info(f"Using cookies from {cookie_path} for YouTube extraction.")

    try:
        logger.info(f"Attempting to extract audio from: {request.url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(request.url, download=True)
            video_id = info_dict.get("id", video_id)
            
            logger.info(f"Successfully downloaded audio to {filepath}")
            
            return {
                "message": "YouTube audio extracted successfully",
                "status": "success",
                "audioAvailable": True,
                "video_id": video_id
            }
            
    except Exception as e:
        logger.error(f"yt-dlp failed for {video_id}. Error: {str(e)[:200]}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Could not extract content from this YouTube video. "
                f"YouTube may be blocking automated access. "
                f"(Error: {str(e)[:150]})"
            )
        )
