from fastapi import APIRouter
from app.api.v1.endpoints import analyze, ask, audio

api_router = APIRouter()
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
api_router.include_router(ask.router, prefix="/ask", tags=["ask"])
api_router.include_router(audio.router, prefix="/audio", tags=["audio"])
