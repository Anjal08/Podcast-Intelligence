from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

class Message(BaseModel):
    role: str = Field(..., description="Role of the message author: 'user' or 'assistant'")
    content: str = Field(..., description="The content of the message")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Time the message was sent")

class ConversationBase(BaseModel):
    podcast_id: str = Field(..., description="ID of the podcast this conversation is linked to")
    messages: List[Message] = Field(default=[], description="List of messages in the chat history")

class ConversationCreate(ConversationBase):
    pass

class ConversationResponse(ConversationBase):
    id: str = Field(..., description="Stringified MongoDB ObjectId")

    @classmethod
    def from_mongo(cls, data: dict):
        if not data:
            return None
        data_copy = dict(data)
        if "_id" in data_copy:
            data_copy["id"] = str(data_copy.pop("_id"))
        return cls(**data_copy)

class AskRequest(BaseModel):
    prompt: str = Field(..., description="User prompt or question regarding the podcast")
    podcast_id: str = Field(..., description="ID of the podcast being discussed")
