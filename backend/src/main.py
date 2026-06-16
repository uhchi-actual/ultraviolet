"""FastAPI application entry point: CORS, lifespan, and route registration."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routes import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ultraviolet")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Ultraviolet backend starting up")
    logger.info("Ollama host: %s (model: %s)", settings.ollama_host, settings.ollama_model)
    yield
    logger.info("Ultraviolet backend shutting down")


app = FastAPI(
    title="Ultraviolet API",
    description="Multi-agent music recommendation engine with explainable Tree.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/", tags=["meta"])
async def root() -> dict[str, str]:
    return {
        "name": "Ultraviolet",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health",
    }
