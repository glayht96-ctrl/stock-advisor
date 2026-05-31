from fastapi import APIRouter, HTTPException, Query
from app.services.news_service import get_news
from app.models.schemas import NewsResponse

router = APIRouter()


@router.get("/{ticker}", response_model=NewsResponse)
async def read_news(
    ticker: str,
    limit: int = Query(20, ge=1, le=50),
    sentiment: bool = Query(False, description="Claudeによるセンチメント分析を実行するか"),
):
    try:
        return await get_news(ticker.upper(), limit=limit, with_sentiment=sentiment)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ニュース取得エラー: {str(e)}")
