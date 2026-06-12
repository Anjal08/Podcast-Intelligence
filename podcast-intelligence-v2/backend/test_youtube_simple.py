from youtube_transcript_api import YouTubeTranscriptApi
import re

def main():
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
        print(f"Preview: {transcript_text[:200]}...")
    except Exception as e:
        print(f"Error during extraction: {e}")

if __name__ == "__main__":
    main()
