"""Smoke tests for the API routes (Phase 1)."""

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ultraviolet"


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["services"]["fastapi"] == "up"
    assert "ollama" in body["services"]


def test_chat_returns_response():
    resp = client.post("/api/chat", json={"message": "hello", "conversation_history": []})
    assert resp.status_code == 200
    assert isinstance(resp.json()["response"], str)
    assert resp.json()["response"]  # non-empty (real reply or graceful fallback)


def test_profile_requires_ingestion():
    # Without ingested data (and no DB in the test env) the profile is absent:
    # 404 when reachable-but-empty, 503 when the profile store is unavailable.
    resp = client.get("/api/profile")
    assert resp.status_code in (404, 503)


def test_catalog_lists_tracks():
    resp = client.get("/api/catalog")
    assert resp.status_code == 200
    assert "tracks" in resp.json()


def test_radio_unknown_seed():
    resp = client.post("/api/radio", json={"seed_track_id": "nonexistent_xyz"})
    assert resp.status_code == 404
