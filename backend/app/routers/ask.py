import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ChatMessage(BaseModel):
    role: str      # "user" | "assistant"
    content: str


class AskRequest(BaseModel):
    ticker: str
    question: str
    history: Optional[list[ChatMessage]] = None


class AskResponse(BaseModel):
    ticker: str
    question: str
    answer: str


@router.post("/stream")
async def ask_stream(req: AskRequest):
    """ストリーミング Q&A（SSE）"""
    try:
        from app.services.claude_service import answer_question
        history = [{"role": m.role, "content": m.content} for m in (req.history or [])]

        async def generate():
            async for chunk in answer_question(req.ticker, req.question, history):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=AskResponse)
async def ask(req: AskRequest):
    """非ストリーミング版（後方互換）"""
    try:
        from app.services.claude_service import answer_question
        history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
        chunks: list[str] = []
        async for chunk in answer_question(req.ticker, req.question, history):
            chunks.append(chunk)
        return AskResponse(ticker=req.ticker, question=req.question, answer="".join(chunks))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
