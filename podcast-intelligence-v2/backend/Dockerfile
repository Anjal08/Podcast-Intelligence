# Use Python slim base image to keep size relatively small
FROM python:3.11-slim

# Install system dependencies (ffmpeg is required for yt-dlp to convert audio to mp3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory in container
WORKDIR /app

# Copy requirements file first to leverage Docker cache
COPY requirements.txt .

# Install PyTorch CPU-only version first to save significant disk space / memory
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Start FastAPI with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
