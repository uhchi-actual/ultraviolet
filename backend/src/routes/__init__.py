"""API route aggregation."""

from fastapi import APIRouter

from src.routes import analyze, batch, catalog, chat, health, ingest, niche_search, profile, radio, tree

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(radio.router, tags=["radio"])
api_router.include_router(analyze.router, tags=["analyze"])
api_router.include_router(batch.router, tags=["batch"])
api_router.include_router(niche_search.router, tags=["identify"])
api_router.include_router(tree.router, tags=["tree"])
api_router.include_router(profile.router, tags=["profile"])
api_router.include_router(ingest.router, tags=["ingest"])
api_router.include_router(catalog.router, tags=["catalog"])

__all__ = ["api_router"]
