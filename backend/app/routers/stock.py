import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.services.stock_service import get_stock_data
from app.models.schemas import StockResponse
from pydantic import BaseModel

router = APIRouter()


class AnalysisResponse(BaseModel):
    ticker: str
    analysis: str


@router.get("/{ticker}", response_model=StockResponse)
def read_stock(
    ticker: str,
    period: str = Query("1y", description="取得期間: 1mo|3mo|6mo|1y|2y"),
    interval: str = Query("1d", description="足の種類: 1d|1wk|1mo"),
):
    try:
        return get_stock_data(ticker.upper(), period=period, interval=interval)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"データ取得エラー: {str(e)}")


@router.get("/{ticker}/analysis/stream")
async def stream_analysis(ticker: str):
    """Claude ストリーミング総合分析（SSE）"""
    try:
        from app.services.claude_service import get_stock_analysis_stream
        from app.services.news_service import get_news

        stock = get_stock_data(ticker.upper(), period="3mo")
        news  = await get_news(ticker.upper(), limit=10)

        stock_dict = stock.model_dump()
        news_dicts = [a.model_dump() for a in news.articles]

        async def generate():
            async for chunk in get_stock_analysis_stream(ticker.upper(), stock_dict, news_dicts):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析エラー: {str(e)}")


@router.get("/{ticker}/analysis", response_model=AnalysisResponse)
async def get_analysis(ticker: str):
    """非ストリーミング版（後方互換）"""
    try:
        from app.services.claude_service import get_stock_analysis
        from app.services.news_service import get_news

        stock = get_stock_data(ticker.upper(), period="3mo")
        news  = await get_news(ticker.upper(), limit=10)

        stock_dict = stock.model_dump()
        news_dicts = [a.model_dump() for a in news.articles]

        analysis = await get_stock_analysis(ticker.upper(), stock_dict, news_dicts)
        return AnalysisResponse(ticker=ticker.upper(), analysis=analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析エラー: {str(e)}")
