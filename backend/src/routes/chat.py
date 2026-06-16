"""POST /api/chat — conversational interaction via the Conductor."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.agents.conductor import Conductor

router = APIRouter()
conductor = Conductor()


class ChatTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    recommendations: list[dict] = Field(default_factory=list)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    history = [turn.model_dump() for turn in request.conversation_history]
    reply = await conductor.chat(request.message, history)
    return ChatResponse(response=reply, recommendations=[])
