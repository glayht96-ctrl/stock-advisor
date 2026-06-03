"""
セクター別ヒートマップ
初回リクエストは即時 {status:"loading"} を返し、バックグラウンドでスキャン。
フロントエンドが5秒ごとにポーリングしてキャッシュ完成後に表示する。
"""
import concurrent.futures
import threading
from fastapi import APIRouter
from app.data.tickers import TICKER_INFO, HEATMAP_TICKERS
from app.services import cache as _cache

router = APIRouter()

_CACHE_KEY  = "heatmap:sectors"
_LOCK_KEY   = "heatmap:scanning"
_CACHE_TTL  = 900   # 15分
_SCAN_LOCK  = threading.Lock()
_IS_SCANNING = False


def _fetch_change(ticker: str) -> dict | None:
    try:
        # キャッシュ済みなら即返却（sleep なし）
        for period in ("5d", "1mo", "3mo"):
            cached = _cache.get(f"stock:{ticker}:{period}:1d")
            if cached is not None:
                info = TICKER_INFO.get(ticker, {})
                return {
                    "ticker":     ticker,
                    "name":       cached.name,
                    "change_pct": cached.change_pct,
                    "market_cap": cached.market_cap,
                    "sector":     info.get("sector", "-"),
                    "market":     info.get("market", "-"),
                }
        # キャッシュなし → yfinance で取得
        from app.services.stock_service import get_stock_data
        s = get_stock_data(ticker, period="5d")
        info = TICKER_INFO.get(ticker, {})
        return {
            "ticker":     ticker,
            "name":       s.name,
            "change_pct": s.change_pct,
            "market_cap": s.market_cap,
            "sector":     info.get("sector", "-"),
            "market":     info.get("market", "-"),
        }
    except Exception as e:
        print(f"[WARN] Heatmap {ticker}: {e}")
        return None


def _scan_and_cache():
    """バックグラウンドスレッドで全銘柄スキャン → キャッシュ保存"""
    global _IS_SCANNING
    try:
        stocks: list[dict] = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
            futures = {ex.submit(_fetch_change, t): t for t in HEATMAP_TICKERS}
            for f in concurrent.futures.as_completed(futures):
                r = f.result()
                if r and r.get("change_pct") is not None:
                    stocks.append(r)

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
        response = {"sectors": result, "total_stocks": len(stocks), "status": "ok"}
        _cache.set(_CACHE_KEY, response, ttl_seconds=_CACHE_TTL)
        print(f"[INFO] Heatmap scan done: {len(stocks)} stocks, {len(result)} sectors")
    except Exception as e:
        print(f"[ERROR] Heatmap scan: {e}")
    finally:
        _IS_SCANNING = False


@router.get("/")
def get_heatmap():
    global _IS_SCANNING

    cached = _cache.get(_CACHE_KEY)
    if cached is not None:
        return cached

    # バックグラウンドスキャン開始（重複防止）
    with _SCAN_LOCK:
        if not _IS_SCANNING:
            _IS_SCANNING = True
            t = threading.Thread(target=_scan_and_cache, daemon=True)
            t.start()

    return {"sectors": [], "total_stocks": 0, "status": "loading"}
