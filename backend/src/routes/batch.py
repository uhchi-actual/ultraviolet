"""POST /api/batch-analyze — batch Demucs analysis with SSE progress."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger("ultraviolet.batch")


class BatchAnalyzeRequest(BaseModel):
    directory: str = Field(..., min_length=1, description="Absolute path to a music folder")
    recursive: bool = True
    skip_existing: bool = True
    purge_demo: bool = True


@router.post("/batch-analyze")
async def batch_analyze(body: BatchAnalyzeRequest) -> StreamingResponse:
    from pathlib import Path

    directory = Path(body.directory).expanduser()
    if not directory.is_dir():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Directory not found: {body.directory}",
        )

    from src.analysis.batch_import import clear_cancel, iter_batch_events

    clear_cancel()

    def sse_stream():
        try:
            for event in iter_batch_events(
                str(directory),
                recursive=body.recursive,
                skip_existing=body.skip_existing,
                purge_demo=body.purge_demo,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception("Batch analyze stream failed")
            yield f"data: {json.dumps({'status': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/batch-analyze/cancel")
def batch_analyze_cancel() -> dict[str, Any]:
    from src.analysis.batch_import import request_cancel

    request_cancel()
    return {"status": "cancelling"}
