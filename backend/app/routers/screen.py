import json
import concurrent.futures
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# 100銘柄 = 米国50 + 日本50
TICKER_INFO: dict[str, dict] = {
    # ── US stocks (50) ──────────────────────────────────────────────────
    "AAPL":  {"sector": "Technology",       "market": "US"},
    "MSFT":  {"sector": "Technology",       "market": "US"},
    "NVDA":  {"sector": "Technology",       "market": "US"},
    "GOOGL": {"sector": "Comm. Services",   "market": "US"},
    "AMZN":  {"sector": "Consumer Disc.",   "market": "US"},
    "META":  {"sector": "Comm. Services",   "market": "US"},
    "TSLA":  {"sector": "Consumer Disc.",   "market": "US"},
    "JPM":   {"sector": "Financials",       "market": "US"},
    "V":     {"sector": "Financials",       "market": "US"},
    "WMT":   {"sector": "Consumer Staples", "market": "US"},
    "JNJ":   {"sector": "Health Care",      "market": "US"},
    "XOM":   {"sector": "Energy",           "market": "US"},
    "PG":    {"sector": "Consumer Staples", "market": "US"},
    "HD":    {"sector": "Consumer Disc.",   "market": "US"},
    "MA":    {"sector": "Financials",       "market": "US"},
    "BAC":   {"sector": "Financials",       "market": "US"},
    "NFLX":  {"sector": "Comm. Services",   "market": "US"},
    "ADBE":  {"sector": "Technology",       "market": "US"},
    "CRM":   {"sector": "Technology",       "market": "US"},
    "AMD":   {"sector": "Technology",       "market": "US"},
    "INTC":  {"sector": "Technology",       "market": "US"},
    "ORCL":  {"sector": "Technology",       "market": "US"},
    "QCOM":  {"sector": "Technology",       "market": "US"},
    "TXN":   {"sector": "Technology",       "market": "US"},
    "AVGO":  {"sector": "Technology",       "market": "US"},
    "MU":    {"sector": "Technology",       "market": "US"},
    "COST":  {"sector": "Consumer Staples", "market": "US"},
    "UNH":   {"sector": "Health Care",      "market": "US"},
    "LLY":   {"sector": "Health Care",      "market": "US"},
    "ABT":   {"sector": "Health Care",      "market": "US"},
    "PFE":   {"sector": "Health Care",      "market": "US"},
    "MRK":   {"sector": "Health Care",      "market": "US"},
    "CVX":   {"sector": "Energy",           "market": "US"},
    "COP":   {"sector": "Energy",           "market": "US"},
    "GS":    {"sector": "Financials",       "market": "US"},
    "MS":    {"sector": "Financials",       "market": "US"},
    "SPGI":  {"sector": "Financials",       "market": "US"},
    "NEE":   {"sector": "Utilities",        "market": "US"},
    "BA":    {"sector": "Industrials",      "market": "US"},
    "CAT":   {"sector": "Industrials",      "market": "US"},
    "GE":    {"sector": "Industrials",      "market": "US"},
    "LMT":   {"sector": "Industrials",      "market": "US"},
    "RTX":   {"sector": "Industrials",      "market": "US"},
    "SBUX":  {"sector": "Consumer Disc.",   "market": "US"},
    "NKE":   {"sector": "Consumer Disc.",   "market": "US"},
    "DIS":   {"sector": "Comm. Services",   "market": "US"},
    "T":     {"sector": "Comm. Services",   "market": "US"},
    "VZ":    {"sector": "Comm. Services",   "market": "US"},
    "PYPL":  {"sector": "Financials",       "market": "US"},
    "UBER":  {"sector": "Consumer Disc.",   "market": "US"},
    # ── Japan stocks (50) ───────────────────────────────────────────────
    "7203.T": {"sector": "自動車",       "market": "JP"},
    "6758.T": {"sector": "電気機器",     "market": "JP"},
    "9984.T": {"sector": "情報通信",     "market": "JP"},
    "8306.T": {"sector": "銀行",         "market": "JP"},
    "7267.T": {"sector": "自動車",       "market": "JP"},
    "6861.T": {"sector": "電気機器",     "market": "JP"},
    "4063.T": {"sector": "化学",         "market": "JP"},
    "6501.T": {"sector": "電気機器",     "market": "JP"},
    "9432.T": {"sector": "情報通信",     "market": "JP"},
    "8035.T": {"sector": "半導体装置",   "market": "JP"},
    "6902.T": {"sector": "自動車部品",   "market": "JP"},
    "7974.T": {"sector": "ゲーム",       "market": "JP"},
    "8411.T": {"sector": "銀行",         "market": "JP"},
    "8316.T": {"sector": "銀行",         "market": "JP"},
    "2914.T": {"sector": "タバコ",       "market": "JP"},
    "6367.T": {"sector": "空調機器",     "market": "JP"},
    "4502.T": {"sector": "医薬品",       "market": "JP"},
    "6954.T": {"sector": "ロボット",     "market": "JP"},
    "7751.T": {"sector": "電気機器",     "market": "JP"},
    "9433.T": {"sector": "情報通信",     "market": "JP"},
    "8766.T": {"sector": "保険",         "market": "JP"},
    "3382.T": {"sector": "小売",         "market": "JP"},
    "8031.T": {"sector": "商社",         "market": "JP"},
    "8058.T": {"sector": "商社",         "market": "JP"},
    "6098.T": {"sector": "人材サービス", "market": "JP"},
    "4452.T": {"sector": "化学",         "market": "JP"},
    "9983.T": {"sector": "小売",         "market": "JP"},
    "4519.T": {"sector": "医薬品",       "market": "JP"},
    "4661.T": {"sector": "レジャー",     "market": "JP"},
    "6762.T": {"sector": "電子部品",     "market": "JP"},
    "6920.T": {"sector": "半導体装置",   "market": "JP"},
    "6723.T": {"sector": "半導体",       "market": "JP"},
    "4385.T": {"sector": "IT",           "market": "JP"},
    "2413.T": {"sector": "IT",           "market": "JP"},
    "6146.T": {"sector": "半導体装置",   "market": "JP"},
    "3659.T": {"sector": "ゲーム",       "market": "JP"},
    "2802.T": {"sector": "食品",         "market": "JP"},
    "4578.T": {"sector": "医薬品",       "market": "JP"},
    "8604.T": {"sector": "証券",         "market": "JP"},
    "7270.T": {"sector": "自動車",       "market": "JP"},
    "5020.T": {"sector": "石油",         "market": "JP"},
    "9020.T": {"sector": "鉄道",         "market": "JP"},
    "4543.T": {"sector": "医療機器",     "market": "JP"},
    "6645.T": {"sector": "電気機器",     "market": "JP"},
    "5108.T": {"sector": "ゴム",         "market": "JP"},
    "7735.T": {"sector": "半導体装置",   "market": "JP"},
    "4689.T": {"sector": "情報通信",     "market": "JP"},
    "4307.T": {"sector": "ITサービス",   "market": "JP"},
    "6857.T": {"sector": "半導体",       "market": "JP"},
    "2768.T": {"sector": "商社",         "market": "JP"},
}

DEFAULT_TICKERS = list(TICKER_INFO.keys())


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

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        futures = [ex.submit(_fetch_and_filter, t, req.conditions) for t in tickers]
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if r:
                results.append(r)

    results.sort(key=lambda x: x.get("rsi") or 999)
    return {"results": results, "total": len(results)}
