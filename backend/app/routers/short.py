"""空売り残高・信用情報 — yfinance info フィールドから取得"""
import math
import yfinance as yf
from fastapi import APIRouter, HTTPException
from app.services import cache as _cache
from app.services.stock_service import _normalize_ticker

router = APIRouter()


def _safe_float(v) -> float | None:
    try:
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else f
    except Exception:
        return None


def _safe_int(v) -> int | None:
    f = _safe_float(v)
    return int(f) if f is not None else None


@router.get("/{ticker}")
def get_short_data(ticker: str):
    """空売り残高・信用倍率データを返す"""
    ticker = _normalize_ticker(ticker.upper())
    cache_key = f"short:{ticker}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        t = yf.Ticker(ticker)
        info = _cache.get(f"info:{ticker}")
        if not isinstance(info, dict):
            try:
                info = t.info
                if isinstance(info, dict) and info:
                    _cache.set(f"info:{ticker}", info, ttl_seconds=3600)
                else:
                    info = {}
            except Exception:
                info = {}

        short_ratio    = _safe_float(info.get("shortRatio"))
        raw_pct        = _safe_float(info.get("shortPercentOfFloat"))
        shares_short   = _safe_int(info.get("sharesShort"))
        shares_prior   = _safe_int(info.get("sharesShortPriorMonth"))

        # 0.08 → 8.0% に変換
        short_pct = round(raw_pct * 100, 2) if raw_pct and raw_pct <= 1 else (
                    round(raw_pct, 2) if raw_pct else None)

        label = "高" if (short_pct and short_pct > 10) else (
                "中" if (short_pct and short_pct > 5)  else "低")

        mom_change_pct = None
        if shares_short and shares_prior and shares_prior > 0:
            mom_change_pct = round((shares_short - shares_prior) / shares_prior * 100, 1)

        result = {
            "ticker":                   ticker,
            "short_ratio":              round(short_ratio, 2) if short_ratio else None,
            "short_percent_of_float":   short_pct,
            "shares_short":             shares_short,
            "shares_short_prior_month": shares_prior,
            "mom_change_pct":           mom_change_pct,
            "label":                    label,
        }
        _cache.set(cache_key, result, ttl_seconds=3600)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"空売りデータ取得エラー: {str(e)}")
