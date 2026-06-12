import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Podcast Intelligence Platform v2"
    API_V1_STR: str = "/api/v1"
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    MONGO_URI: str = "mongodb://localhost:27017/"
    DB_NAME: str = "podcast_intelligence_v2"
    
    GROQ_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
