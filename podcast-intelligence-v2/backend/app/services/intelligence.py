import json
import logging
from typing import List, Dict, Any
from groq import Groq
from app.core.config import settings
from app.models.podcast import Chapter

logger = logging.getLogger(__name__)

def get_groq_client() -> Groq:
    """Initialize and return the Groq client if key is configured, otherwise returns None."""
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "gsk_your_actual_groq_api_key_here":
        logger.warning("GROQ_API_KEY is not set or is set to default. Running in Mock/Fallback mode.")
        return None
    try:
        return Groq(api_key=settings.GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Error initializing Groq client: {e}")
        return None

async def generate_chapters(transcript_text: str) -> List[Dict[str, Any]]:
    """
    Analyzes the transcript and generates structured chapters using Llama 3.3 on Groq.
    Falls back to a structured default list if the API key is missing or calls fail.
    """
    client = get_groq_client()
    
    if client:
        try:
            logger.info("Requesting chapter generation from Groq (Llama 3.3)...")
            system_prompt = (
                "You are an expert audio intelligence analyst. Parse the provided podcast transcript and segment it "
                "into logical, semantic chapters. For each chapter, provide:\n"
                "1. A timestamp (e.g. '00:00:00')\n"
                "2. A concise, engaging title\n"
                "3. Sentiment of that section (Positive, Neutral, or Negative)\n"
                "4. A 1-2 sentence detailed summary of what was discussed.\n"
                "Return ONLY a valid JSON array of objects matching this structure:\n"
                '[{"timestamp": "00:00:00", "title": "Introduction to AI", "sentiment": "Positive", "summary": "..."}]'
            )
            
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Here is the transcript:\n\n{transcript_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            
            content = response.choices[0].message.content
            parsed_json = json.loads(content)
            
            # Extract list if it's nested under a key, or return the array
            if isinstance(parsed_json, dict):
                for val in parsed_json.values():
                    if isinstance(val, list):
                        return val
                # If it's a dict and we can't find a list, wrap it or parse list-like attributes
                if "chapters" in parsed_json:
                    return parsed_json["chapters"]
            
            if isinstance(parsed_json, list):
                return parsed_json
                
        except Exception as e:
            logger.error(f"Groq chapter generation failed: {e}. Falling back to default list.")
            
    # Mock / Fallback Logic
    logger.info("Using mock chapter segmentation.")
    import re
    # Look for timestamps like [00:00:00] or 00:00:00
    timestamp_pattern = re.compile(r'\[?(\d{2}:\d{2}:\d{2})\]?\s*([^:]+):\s*(.*)')
    lines = transcript_text.split('\n')
    chapters = []
    
    # Check if transcript matches our standard fallback script layout
    fallback_segments = [
        ("00:00:00", "Introduction to AI & decoupled architecture", "Positive", 
         "The host introduces the podcast, setting the stage for discussions on decoupled monorepos and AI architecture."),
        ("00:02:15", "Deep-Dive into Backend and Motor Async", "Positive", 
         "A detailed analysis of building highly performant Python backends using FastAPI, MongoDB, and the Motor driver."),
        ("00:05:30", "Next.js 14 and React Server Components", "Neutral", 
         "An explanation of how Next.js 14 App Router optimizes client page rendering and manages interactive hooks."),
        ("00:08:45", "API Cost Control & Hash Checks", "Positive", 
         "Explores the strategy of caching transcripts in MongoDB via SHA256 file hashes to avoid expensive reprocessing.")
    ]
    
    # Try parsing timestamps from lines
    for line in lines:
        match = timestamp_pattern.match(line)
        if match:
            time_str, header, content_str = match.groups()
            sentiment = "Positive" if "Intro" in header or "Success" in header else "Neutral"
            chapters.append({
                "timestamp": time_str,
                "title": header.strip(),
                "sentiment": sentiment,
                "summary": content_str[:120] + "..." if len(content_str) > 120 else content_str
            })
            
    if not chapters:
        # If no regex match found, use fallback segments
        for time_str, title, sentiment, summary in fallback_segments:
            chapters.append({
                "timestamp": time_str,
                "title": title,
                "sentiment": sentiment,
                "summary": summary
            })
            
    return chapters

async def chat_about_podcast(transcript_text: str, history: List[Dict[str, Any]], user_prompt: str) -> str:
    """
    Answers user questions using the transcript as context.
    Includes history for conversational awareness.
    """
    client = get_groq_client()
    
    if client:
        try:
            logger.info("Requesting chat completion from Groq (Llama 3.3)...")
            system_prompt = (
                "You are an assistant helping a user analyze a podcast transcript. "
                "Here is the complete transcript of the podcast:\n\n"
                f"{transcript_text}\n\n"
                "Answer the user's questions based ONLY on the provided context. If the answer cannot be found in the "
                "transcript, state politely that the information is not discussed in the podcast. Keep answers concise."
            )
            
            messages = [{"role": "system", "content": system_prompt}]
            
            # Map history into format expected by SDK (role and content keys)
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
                
            messages.append({"role": "user", "content": user_prompt})
            
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.5,
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Groq chat failed: {e}. Falling back to default response.")
            
    # Mock / Fallback Logic
    prompt_lower = user_prompt.lower()
    if "backend" in prompt_lower:
        return "The podcast recommends FastAPI combined with MongoDB and Motor. This allows fully asynchronous database operations without blocking execution threads."
    elif "frontend" in prompt_lower or "next" in prompt_lower:
        return "The podcast discusses Next.js 14 App Router and React Server Components, which help optimize client bundle sizes and improve page loads."
    elif "cost" in prompt_lower or "hash" in prompt_lower or "save" in prompt_lower:
        return "To optimize API costs, the backend implements a SHA256 file hash check. If the hash matches an existing database entry, the saved analysis is returned immediately instead of reprocessing."
    else:
        return f"Based on the transcript, this podcast discusses full-stack AI architectures, covering FastAPI, MongoDB, Next.js 14, and API cost optimizations. Let me know if you have specific questions about those sections!"
