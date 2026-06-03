"""決算カレンダー — yfinance の calendar / earnings_dates から決算予定日を取得"""
import json
import math
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services import cache as _cache

router = APIRouter()


def _parse_date_list(raw) -> "datetime.date | None":
    """list / scalar / datetime.date → future date or None"""
    today = datetime.now().date()
    items = raw if isinstance(raw, (list, tuple)) else [raw]
    for item in items:
        try:
            d = pd.Timestamp(item).date()
            if d >= today:
                return d
        except Exception:
            pass
    return None


def _get_earnings_date(ticker: str) -> dict | None:
    try:
        t = yf.Ticker(ticker)
        # キャッシュ済み info を優先使用（stock_service と共有）
        info = _cache.get(f"info:{ticker}")
        if not isinstance(info, dict):
            try:
                data = t.info
                info = data if isinstance(data, dict) else {}
                _cache.set(f"info:{ticker}", info, ttl_seconds=3600)
            except Exception:
                info = {}
        name = info.get("longName") or info.get("shortName") or ticker

        today = datetime.now().date()
        earnings_date: "datetime.date | None" = None

        # ── 1) calendar (DataFrame / dict) ───────────────────────────
        try:
            cal = t.calendar
            if cal is not None:
                if hasattr(cal, "empty"):               # DataFrame
                    if not cal.empty and "Earnings Date" in cal.index:
                        earnings_date = _parse_date_list(cal.loc["Earnings Date"])
                elif isinstance(cal, dict) and cal:     # dict
                    earnings_date = _parse_date_list(cal.get("Earnings Date", []))
        except Exception:
            pass

        # ── 2) earnings_dates ────────────────────────────────────────
        if not earnings_date:
            try:
                edf = t.earnings_dates
                if edf is not None and not edf.empty:
                    for idx in reversed(edf.index.tolist()):
                        d = _parse_date_list(idx)
                        if d:
                            earnings_date = d
            except Exception:
                pass

        # ── 3) info.earningsTimestamp (直接 info から) ───────────────
        if not earnings_date:
            # info が空ならもう一度 yfinance から直接フェッチ
            if not info or not info.get("earningsTimestamp"):
                try:
                    import time; time.sleep(0.5)
                    fresh = t.info
                    if isinstance(fresh, dict) and fresh:
                        info = fresh
                        _cache.set(f"info:{ticker}", info, ttl_seconds=3600)
                except Exception:
                    pass
            for key in ("earningsTimestamp", "earningsTimestampStart",
                        "nextEarningsDate"):
                ts = info.get(key)
                if ts and isinstance(ts, (int, float)):
                    try:
                        d = datetime.utcfromtimestamp(ts).date()
                        if d >= today:
                            earnings_date = d
                            break
                    except Exception:
                        pass

        # ── 4) fast_info.earnings_date (yfinance 0.2.x 向け) ────────
        if not earnings_date:
            try:
                fi = t.fast_info
                for attr in ("earnings_date", "next_earnings_date"):
                    raw = getattr(fi, attr, None)
                    if raw:
                        d = _parse_date_list(raw)
                        if d:
                            earnings_date = d
                            break
            except Exception:
                pass

        if not earnings_date:
            return None

        days_until = (earnings_date - today).days
        if days_until > 90:          # 90日超は対象外
            return None

        eps_est = info.get("forwardEps")
        return {
            "ticker":           ticker,
            "name":             name,
            "earnings_date":    str(earnings_date),
            "days_until":       days_until,
            "eps_estimate":     round(eps_est, 2) if eps_est else None,
            "revenue_estimate": None,
        }
    except Exception as e:
        print(f"[WARN] Earnings {ticker}: {e}")
        return None


@router.get("/calendar")
def get_calendar(tickers: str = ""):
    """?tickers=AAPL,7203.T — 指定銘柄の決算予定"""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:30]
    if not ticker_list:
        return {"earnings": []}

    cache_key = f"earnings:{'_'.join(sorted(ticker_list))}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    results = []
    for ticker in ticker_list:
        r = _get_earnings_date(ticker)
        if r:
            results.append(r)

    results.sort(key=lambda x: x["days_until"])
    response = {"earnings": results}
    if results:                                          # 空は非キャッシュ
        _cache.set(cache_key, response, ttl_seconds=3600)
    return response


@router.get("/upcoming")
def get_upcoming(tickers: str = ""):
    """?tickers=AAPL,7203.T — ウォッチリスト銘柄の直近決算"""
    return get_calendar(tickers)


@router.get("/surprise/{ticker}")
def get_earnings_surprise(ticker: str):
    """過去8四半期の決算サプライズデータを返す"""
    from app.services.stock_service import _normalize_ticker
    ticker = _normalize_ticker(ticker.upper())
    cache_key = f"earnings_surprise:{ticker}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    def _sf(v) -> float | None:
        try:
            f = float(v)
            return None if math.isnan(f) or math.isinf(f) else round(f, 4)
        except Exception:
            return None

    t = yf.Ticker(ticker)
    quarters = []

    # yfinance earnings_history (epsActual / epsEstimate)
    try:
        eh = t.earnings_history
        if eh is not None and isinstance(eh, pd.DataFrame) and not eh.empty:
            for idx, row in eh.iterrows():
                actual   = _sf(row.get("epsActual"))
                estimate = _sf(row.get("epsEstimate"))
                surprise = _sf(row.get("surprisePercent"))
                if surprise is None and actual is not None and estimate and estimate != 0:
                    surprise = round((actual - estimate) / abs(estimate) * 100, 2)
                period_str = str(idx.date()) if hasattr(idx, "date") else str(idx)
                quarters.append({
                    "period":       period_str,
                    "date":         period_str,
                    "eps_actual":   actual,
                    "eps_estimate": estimate,
                    "surprise_pct": surprise,
                })
    except Exception as e:
        print(f"[WARN] earnings_history {ticker}: {e}")

    # フォールバック: quarterly_earnings（実績のみ）
    if not quarters:
        try:
            qe = t.quarterly_earnings
            if qe is not None and isinstance(qe, pd.DataFrame) and not qe.empty:
                for idx, row in qe.iterrows():
                    quarters.append({
                        "period":       str(idx),
                        "date":         str(idx),
                        "eps_actual":   _sf(row.get("Earnings")),
                        "eps_estimate": None,
                        "surprise_pct": None,
                    })
        except Exception:
            pass

    quarters = quarters[-8:]  # 直近8四半期

    # 連続サプライズ回数
    consecutive_beats = 0
    for q in reversed(quarters):
        if q.get("surprise_pct") and q["surprise_pct"] > 0:
            consecutive_beats += 1
        else:
            break

    result = {
        "ticker":            ticker,
        "quarters":          quarters,
        "consecutive_beats": consecutive_beats,
    }
    if quarters:
        _cache.set(cache_key, result, ttl_seconds=3600)
    return result


@router.get("/surprise/{ticker}/stream")
async def earnings_surprise_stream(ticker: str):
    """決算トレンドを Gemini でストリーミング解説"""
    surprise_data = get_earnings_surprise(ticker)
    from app.services.claude_service import get_earnings_trend_stream

    async def generate():
        async for chunk in get_earnings_trend_stream(ticker, surprise_data["quarters"]):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/debug")
def debug_earnings(ticker: str = "AAPL"):
    """Render 環境での earnings データ診断用"""
    import time
    t = yf.Ticker(ticker)
    info = _cache.get(f"info:{ticker}") or {}
    today = datetime.now().date()

    # calendar
    cal_raw, cal_ed = None, None
    try:
        cal_raw = t.calendar
        if isinstance(cal_raw, dict):
            cal_ed = str(_parse_date_list(cal_raw.get("Earnings Date", [])))
    except Exception as e:
        cal_raw = str(e)

    # earnings_dates
    edf_err, edf_first = None, None
    try:
        edf = t.earnings_dates
        edf_first = str(edf.index[0]) if edf is not None and not edf.empty else "empty"
    except Exception as e:
        edf_err = str(e)

    # earningsTimestamp from info
    ets_val = info.get("earningsTimestamp")
    ets_date = None
    if ets_val:
        try: ets_date = str(datetime.utcfromtimestamp(ets_val).date())
        except Exception: pass

    return {
        "ticker": ticker,
        "today": str(today),
        "info_keys_earnings": [k for k in info if "earn" in k.lower() or "fiscal" in k.lower()],
        "earningsTimestamp": ets_val,
        "earningsTimestamp_date": ets_date,
        "calendar_type": type(cal_raw).__name__,
        "calendar_keys": list(cal_raw.keys()) if isinstance(cal_raw, dict) else str(cal_raw)[:200],
        "calendar_earnings_date": cal_ed,
        "earnings_dates_first": edf_first,
        "earnings_dates_error": edf_err,
    }
