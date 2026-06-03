"""毎朝の相場レポート — Gemini ストリーミング + 1時間キャッシュ"""
import json
import asyncio
import feedparser
import yfinance as yf
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services import cache as _cache

router = APIRouter()

REPORT_CACHE_KEY = "morning_report:latest"
REPORT_TTL       = 3600  # 1時間

INDICES = [
    {"ticker": "^N225",   "name": "日経225"},
    {"ticker": "^GSPC",   "name": "S&P500"},
    {"ticker": "^IXIC",   "name": "NASDAQ"},
    {"ticker": "^DJI",    "name": "DOW"},
    {"ticker": "JPY=X",   "name": "USD/JPY"},
    {"ticker": "BTC-USD", "name": "BTC/USD"},
]


def _fetch_indices() -> list[dict]:
    results = []
    for idx in INDICES:
        try:
            info = yf.Ticker(idx["ticker"]).fast_info
            price = float(info.last_price) if info.last_price else None
            prev  = float(info.previous_close) if info.previous_close else None
            if price and prev:
                chg = round(price - prev, 4)
                pct = round(chg / prev * 100, 2)
                results.append({
                    "ticker":     idx["ticker"],
                    "name":       idx["name"],
                    "price":      round(price, 2),
                    "change":     chg,
                    "change_pct": pct,
                })
        except Exception:
            pass
    return results


def _fetch_market_news() -> list[dict]:
    articles = []
    urls = [
        "https://news.google.com/rss/search?q=株式相場&hl=ja&gl=JP&ceid=JP:ja",
        "https://news.google.com/rss/search?q=stock+market&hl=en&gl=US&ceid=US:en",
    ]
    for url in urls:
        try:
            feed = feedparser.parse(url)
            for e in feed.entries[:6]:
                articles.append({
                    "title":  e.get("title", ""),
                    "source": getattr(e.get("source", {}), "title", "Google News"),
                })
        except Exception:
            pass
    return articles[:10]


@router.get("/stream")
async def morning_report_stream(force: bool = False):
    """朝の相場レポートを SSE ストリーミング。1時間キャッシュ済みなら即返却。"""
    from app.services.claude_service import get_morning_report_stream

    # キャッシュチェック
    if not force:
        cached_text = _cache.get(REPORT_CACHE_KEY)
        if cached_text:
            async def serve_cached():
                # キャッシュ済みテキストをそのまま流す
                chunk_size = 40
                for i in range(0, len(cached_text), chunk_size):
                    yield f"data: {json.dumps({'text': cached_text[i:i+chunk_size]})}\n\n"
                    await asyncio.sleep(0.01)
                yield "data: [DONE]\n\n"
            return StreamingResponse(
                serve_cached(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            )

    # 新規生成
    loop    = asyncio.get_running_loop()
    indices = await loop.run_in_executor(None, _fetch_indices)
    news    = await loop.run_in_executor(None, _fetch_market_news)

    accumulated: list[str] = []

    async def generate():
        async for chunk in get_morning_report_stream(indices, news):
            accumulated.append(chunk)
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        # 生成完了後にキャッシュへ保存
        _cache.set(REPORT_CACHE_KEY, "".join(accumulated), ttl_seconds=REPORT_TTL)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
