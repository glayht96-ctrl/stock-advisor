import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class PortfolioRequest(BaseModel):
    tickers: list[str]
    amounts: list[float]


@router.post("/analyze")
async def analyze_portfolio(req: PortfolioRequest):
    from app.services.stock_service import get_stock_data
    from app.services.claude_service import get_portfolio_analysis_stream

    stocks = []
    for ticker in req.tickers:
        try:
            data = get_stock_data(ticker.upper(), period="3mo")
            stocks.append(data.model_dump())
        except Exception as e:
            stocks.append({"ticker": ticker, "error": str(e)})

    async def generate():
        async for chunk in get_portfolio_analysis_stream(req.tickers, req.amounts, stocks):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
