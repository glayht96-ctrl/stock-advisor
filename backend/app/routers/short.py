"""空売り残高・信用情報 — yfinance info フィールドから取得"""
import math
import yfinance as yf
from fastapi import APIRouter, HTTPException
from app.services import cache as _cache
from app.services.stock_service import _normalize_ticker
from app.services.yf_retry import call_with_retry
from app.services import last_good as _last_good

router = APIRouter()


def _safe_float(v) -> float | None:
    try:
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else f
    except Exception:
        return None


def _looks_degraded(info: dict) -> bool:
    """Yahoo の info が欠けた返事か（普段は 170〜190 項目・symbol がある。10-24 手元で AAPL 187・7203.T 171）。"""
    return "symbol" not in info or len(info) < 20


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
        rate_limited = False
        if not isinstance(info, dict):
            try:
                # B191：回数制限の時だけ間をおいて取り直す
                info, rate_limited = call_with_retry(lambda: t.info)
                # B191 の続き（10-24）：本番（Render）では Apple でも空売りの項目が来なかった。手元からは 187 項目・空売りの数字ありで返る。
                # 回数制限の時に Yahoo が欠けた返事を返すことがある＝銘柄の名前（symbol）も無い・項目が 20 未満なら「取れなかった」と扱い、覚えない
                if isinstance(info, dict) and info and not _looks_degraded(info):
                    _cache.set(f"info:{ticker}", info, ttl_seconds=3600)
                else:
                    rate_limited = rate_limited or bool(info is None or _looks_degraded(info or {}))
                    info = {}
            except Exception:
                info = {}
                rate_limited = True   # 取れなかった（回数制限か通信の失敗）＝「データが無い」とは言わない

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
        # B191：取れなかった時（回数制限・数字が全部空）は印を付け、60 秒だけ持つ（前は空でも 1 時間持っていた）
        empty = short_ratio is None and short_pct is None and shares_short is None
        result["status"] = "rate_limited" if rate_limited else ("empty" if empty else "ok")
        if result["status"] == "ok":
            # B208 の A：空売り残高は月 2 回ほどしか変わらない＝取れた値を 1 日持ち、前の値としても覚える
            _cache.set(cache_key, result, ttl_seconds=86400)
            _last_good.remember("short", ticker, result)
            return result
        if result["status"] == "rate_limited":
            old = _last_good.recall("short", ticker)   # 断られた時は、前に取れた値を「◯時点の値」として返す
            if old is not None:
                _cache.set(cache_key, old, ttl_seconds=60)
                return old
        _cache.set(cache_key, result, ttl_seconds=60)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"空売りデータ取得エラー: {str(e)}")
