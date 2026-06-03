"""決算カレンダー — yfinance の calendar / earnings_dates から決算予定日を取得"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from fastapi import APIRouter
from app.services import cache as _cache

router = APIRouter()


def _get_earnings_date(ticker: str) -> dict | None:
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        name = info.get("longName") or info.get("shortName") or ticker

        today = datetime.now().date()
        earnings_date: datetime.date | None = None

        # ── calendar (DataFrame / dict) ───────────────────────────────
        try:
            cal = t.calendar
            if cal is not None:
                if hasattr(cal, "empty"):                   # DataFrame
                    if not cal.empty and "Earnings Date" in cal.index:
                        eds = cal.loc["Earnings Date"]
                        for ed in (eds if hasattr(eds, "__iter__") else [eds]):
                            try:
                                d = pd.Timestamp(ed).date()
                                if d >= today:
                                    earnings_date = d
                                    break
                            except Exception:
                                pass
                elif isinstance(cal, dict):                 # legacy dict
                    ed_raw = cal.get("Earnings Date")
                    if ed_raw:
                        for ed in (ed_raw if isinstance(ed_raw, list) else [ed_raw]):
                            try:
                                d = pd.Timestamp(ed).date()
                                if d >= today:
                                    earnings_date = d
                                    break
                            except Exception:
                                pass
        except Exception:
            pass

        # ── earnings_dates (newer yfinance) ──────────────────────────
        if not earnings_date:
            try:
                edf = t.earnings_dates
                if edf is not None and not edf.empty:
                    for idx in reversed(edf.index.tolist()):
                        try:
                            d = pd.Timestamp(idx).date()
                            if d >= today:
                                earnings_date = d
                        except Exception:
                            pass
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
    _cache.set(cache_key, response, ttl_seconds=3600)  # 1時間キャッシュ
    return response


@router.get("/upcoming")
def get_upcoming(tickers: str = ""):
    """?tickers=AAPL,7203.T — ウォッチリスト銘柄の直近決算"""
    return get_calendar(tickers)
