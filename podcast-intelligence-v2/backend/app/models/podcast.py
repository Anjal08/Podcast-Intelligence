from pydantic import BaseModel, Field
from typing import List, Optional

class Chapter(BaseModel):
    timestamp: str = Field(..., description="Timestamp string format (e.g., '00:01:30' or '01:15:00')")
    title: str = Field(..., description="Chapter title")
    sentiment: str = Field(..., description="Sentiment analysis of the chapter (e.g., Positive, Neutral, Negative)")
    summary: str = Field(..., description="Summary of the chapter content")

class PodcastBase(BaseModel):
    file_hash: str = Field(..., description="SHA256 checksum of the audio file")
    filename: str = Field(..., description="Original name of the uploaded audio file")
    transcript_text: str = Field(..., description="Full text transcript of the podcast")
    status: str = Field(default="completed", description="Processing status: 'processing', 'completed', 'failed'")
    generated_chapters: List[Chapter] = Field(default=[], description="List of generated chapters with metadata")

class PodcastCreate(PodcastBase):
    pass

class PodcastResponse(PodcastBase):
    id: str = Field(..., description="Stringified MongoDB ObjectId")

    @classmethod
    def from_mongo(cls, data: dict):
        if not data:
            return None
        # Convert _id from ObjectId to str and remove raw _id key
        data_copy = dict(data)
        if "_id" in data_copy:
            data_copy["id"] = str(data_copy.pop("_id"))
        return cls(**data_copy)
