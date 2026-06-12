import asyncio
import os
import sys

# Add backend to path so we can import app
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.intelligence import generate_chapters
from youtube_transcript_api import YouTubeTranscriptApi
import re

async def main():
    url = "https://youtu.be/z7e7gtU3PHY?si=N2TYI5Ovll-kyTtx"
    print(f"Testing URL: {url}")
    
    match = re.search(r"(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})", url)
    if not match:
        print("Could not parse ID")
        return
        
    video_id = match.group(1)
    print(f"Parsed Video ID: {video_id}")
    
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = " ".join([t['text'] for t in transcript_list])
        print(f"Successfully fetched transcript! Length: {len(transcript_text)} characters.")
        print(f"Preview: {transcript_text[:100]}...")
        
        print("\nPassing to Llama 3.3 pipeline...")
        chapters = await generate_chapters(transcript_text)
        print("\nGenerated Chapters:")
        for idx, chapter in enumerate(chapters):
            print(f"{idx+1}. [{chapter.get('timestamp')}] {chapter.get('title')} ({chapter.get('sentiment')})")
            print(f"   Summary: {chapter.get('summary')}")
            
    except Exception as e:
        print(f"Error during extraction: {e}")

if __name__ == "__main__":
    asyncio.run(main())
