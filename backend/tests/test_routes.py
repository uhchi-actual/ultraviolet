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


def test_unimplemented_route_returns_501():
    resp = client.get("/api/profile")
    assert resp.status_code == 501
