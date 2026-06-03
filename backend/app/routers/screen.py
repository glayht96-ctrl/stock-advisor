import json
import concurrent.futures
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.data.tickers import TICKER_INFO, SCREENER_TICKERS

router = APIRouter()

DEFAULT_TICKERS = SCREENER_TICKERS  # 後方互換エイリアス


class Condition(BaseModel):
    indicator: str  # rsi | macd_hist | price | sma20 | sma50 | sma200 | price_vs_sma50
    operator: str   # gt | lt | gte | lte | eq
    value: float


class ScreenRequest(BaseModel):
    tickers: list[str] | None = None
    conditions: list[Condition]


def _get_val(d: dict, indicator: str) -> float | None:
    ind   = d.get("indicators") or {}
    macd  = ind.get("macd") or {}
    price = d.get("current_price")

    mapping = {
        "rsi":       ind.get("rsi_14"),
        "macd_hist": macd.get("histogram"),
        "price":     price,
        "sma20":     ind.get("sma_20"),
        "sma50":     ind.get("sma_50"),
        "sma200":    ind.get("sma_200"),
    }
    if indicator in mapping:
        return mapping[indicator]
    if indicator == "price_vs_sma50":
        sma50 = ind.get("sma_50")
        return (price - sma50) if (price is not None and sma50) else None
    return None


def _apply(d: dict, cond: Condition) -> bool:
    val = _get_val(d, cond.indicator)
    if val is None:
        return False
    v, op = cond.value, cond.operator
    if op == "gt":  return val > v
    if op == "lt":  return val < v
    if op == "gte": return val >= v
    if op == "lte": return val <= v
    if op == "eq":  return abs(val - v) < 0.01
    return False


def _fetch_and_filter(ticker: str, conditions: list[Condition]):
    try:
        from app.services.stock_service import get_stock_data
        stock = get_stock_data(ticker, period="3mo")
        d = stock.model_dump()
        if not all(_apply(d, c) for c in conditions):
            return None
        ind  = d.get("indicators") or {}
        macd = ind.get("macd") or {}
        info = TICKER_INFO.get(ticker, {})
        return {
            "ticker": ticker,
            "name": d.get("name"),
            "current_price": d.get("current_price"),
            "change_pct": d.get("change_pct"),
            "currency": d.get("currency"),
            "sector": info.get("sector", "-"),
            "market": info.get("market", "-"),
            "rsi": ind.get("rsi_14"),
            "macd_hist": macd.get("histogram"),
            "sma20": ind.get("sma_20"),
            "sma50": ind.get("sma_50"),
        }
    except Exception as e:
        print(f"[WARN] Screen {ticker}: {e}")
        return None


class AnalyzeRequest(BaseModel):
    conditions: list[Condition]
    results: list[dict]


@router.post("/analyze")
async def analyze_screen_results(req: AnalyzeRequest):
    from app.services.claude_service import get_screener_analysis_stream

    async def generate():
        async for chunk in get_screener_analysis_stream(
            [c.model_dump() for c in req.conditions],
            req.results,
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/")
def screen_stocks(req: ScreenRequest):
    tickers = req.tickers or DEFAULT_TICKERS
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
        futures = [ex.submit(_fetch_and_filter, t, req.conditions) for t in tickers]
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if r:
                results.append(r)

    results.sort(key=lambda x: x.get("rsi") or 999)
    return {"results": results, "total": len(results)}
