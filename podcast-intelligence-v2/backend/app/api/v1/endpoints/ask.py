import logging
from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from datetime import datetime, timezone

from app.core.db import get_database
from app.models.conversation import AskRequest, ConversationResponse, Message
from app.services.intelligence import chat_about_podcast

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("", response_model=ConversationResponse)
async def ask_question(request: AskRequest):
    """
    Submit a prompt about a specific podcast.
    Retrieves history, calls Llama 3.3 via Groq using the transcript context, 
    and saves the discussion thread in MongoDB.
    """
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable"
        )
        
    if not ObjectId.is_valid(request.podcast_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid podcast ID format"
        )
        
    # 1. Fetch transcript context
    podcast = await db.podcasts.find_one({"_id": ObjectId(request.podcast_id)})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
        
    if podcast.get("status") == "processing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podcast transcript is still processing. Please try again in a few moments."
        )
        
    transcript_text = podcast.get("transcript_text", "")
    
    # 2. Retrieve conversation or initialize a new one
    conversation = await db.conversations.find_one({"podcast_id": request.podcast_id})
    
    if not conversation:
        conversation = {
            "podcast_id": request.podcast_id,
            "messages": []
        }
        result = await db.conversations.insert_one(conversation)
        conversation["_id"] = result.inserted_id
        
    history = conversation.get("messages", [])
    
    # Limit history context passed to LLM to save tokens (last 10 messages)
    llm_history = []
    for msg in history[-10:]:
        llm_history.append({
            "role": msg["role"],
            "content": msg["content"]
        })
        
    # 3. Call intelligence service
    logger.info(f"Asking question for podcast {request.podcast_id}...")
    reply = await chat_about_podcast(transcript_text, llm_history, request.prompt)
    
    # 4. Save messages to history
    user_msg = {
        "role": "user",
        "content": request.prompt,
        "timestamp": datetime.now(timezone.utc)
    }
    assistant_msg = {
        "role": "assistant",
        "content": reply,
        "timestamp": datetime.now(timezone.utc)
    }
    
    await db.conversations.update_one(
        {"_id": conversation["_id"]},
        {
            "$push": {
                "messages": {
                    "$each": [user_msg, assistant_msg]
                }
            }
        }
    )
    
    # Update local dict to return in response
    conversation["messages"].extend([user_msg, assistant_msg])
    
    return ConversationResponse.from_mongo(conversation)

@router.get("/{podcast_id}", response_model=ConversationResponse)
async def get_conversation_history(podcast_id: str):
    """Retrieve chat history linked to a specific podcast."""
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
        
    conversation = await db.conversations.find_one({"podcast_id": podcast_id})
    if not conversation:
        # If no conversation exists yet, return an empty template
        return ConversationResponse(
            id=str(ObjectId()), # Mock ID for client-side
            podcast_id=podcast_id,
            messages=[]
        )
        
    return ConversationResponse.from_mongo(conversation)
