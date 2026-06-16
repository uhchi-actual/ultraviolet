FROM python:3.12-slim

WORKDIR /app

# System libraries needed by the audio stack (librosa/soundfile/ffmpeg).
# Kept here so Phase 2 (`.[audio]`) builds without changes.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libsndfile1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY src ./src

# Phase 1 installs the core API. Add ".[agents,audio]" as those phases land.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
