FROM python:3.12-slim

WORKDIR /app

# System libraries for audio (librosa/soundfile) and Demucs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libsndfile1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY src ./src

# PyTorch CUDA wheel for Demucs GPU separation, then the app stack.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cu124 \
    && pip install --no-cache-dir ".[audio,vectorstore,demucs]"

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
