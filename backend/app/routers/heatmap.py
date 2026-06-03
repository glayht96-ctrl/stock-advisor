"""セクター別ヒートマップ — 全銘柄の騰落率をセクター集計"""
import concurrent.futures
from fastapi import APIRouter
from app.data.tickers import TICKER_INFO, SCREENER_TICKERS
from app.services import cache as _cache

router = APIRouter()

_CACHE_KEY = "heatmap:sectors"
_CACHE_TTL  = 900  # 15分


def _fetch_change(ticker: str) -> dict | None:
    try:
        from app.services.stock_service import get_stock_data
        s = get_stock_data(ticker, period="5d")
        info = TICKER_INFO.get(ticker, {})
        return {
            "ticker":     ticker,
            "name":       s.name,
            "change_pct": s.change_pct,
            "market_cap": s.market_cap,
            "sector":     info.get("sector", "その他"),
            "market":     info.get("market", "US"),
        }
    except Exception as e:
        print(f"[WARN] Heatmap {ticker}: {e}")
        return None


@router.get("/")
def get_heatmap():
    cached = _cache.get(_CACHE_KEY)
    if cached is not None:
        return cached

    stocks: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
        futures = {ex.submit(_fetch_change, t): t for t in SCREENER_TICKERS}
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if r and r.get("change_pct") is not None:
                stocks.append(r)

    # セクター別にグループ化
    sectors_map: dict[str, dict] = {}
    for s in stocks:
        key = f"{s['market']}::{s['sector']}"
        if key not in sectors_map:
            sectors_map[key] = {
                "sector":         s["sector"],
                "market":         s["market"],
                "stocks":         [],
                "avg_change_pct": 0.0,
            }
        sectors_map[key]["stocks"].append(s)

    result = []
    for sec in sectors_map.values():
        changes = [x["change_pct"] for x in sec["stocks"] if x["change_pct"] is not None]
        sec["avg_change_pct"] = round(sum(changes) / len(changes), 2) if changes else 0.0
        sec["stocks"].sort(key=lambda x: (x.get("market_cap") or 0), reverse=True)
        result.append(sec)

    result.sort(key=lambda x: x["avg_change_pct"], reverse=True)

    response = {"sectors": result, "total_stocks": len(stocks)}
    _cache.set(_CACHE_KEY, response, ttl_seconds=_CACHE_TTL)
    return response
