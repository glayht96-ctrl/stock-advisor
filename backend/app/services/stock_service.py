import time
import yfinance as yf
import pandas as pd
from app.models.schemas import (
    StockResponse, PricePoint, Indicators, MacdData, BollingerData,
    RsiPoint, MacdPoint,
)
from app.services import cache as _cache

STOCK_TTL   = 300
INFO_TTL    = 3600
_SLEEP      = 0.5   # yfinance 呼び出し前の待機秒数
_MAX_RETRY  = 3
_RETRY_WAIT = 1.0


def _is_rate_limit(e: Exception) -> bool:
    msg = str(e).lower()
    return "429" in msg or "too many requests" in msg or "rate limit" in msg


def _yf_info(t: yf.Ticker) -> dict:
    for attempt in range(_MAX_RETRY):
        try:
            time.sleep(_SLEEP)
            return t.info
        except Exception as e:
            if _is_rate_limit(e) and attempt < _MAX_RETRY - 1:
                time.sleep(_RETRY_WAIT)
                continue
            if _is_rate_limit(e):
                raise ValueError("データ取得中です。少し待ってから再試行してください。")
            raise
    return {}


def _yf_history(t: yf.Ticker, period: str, interval: str) -> pd.DataFrame:
    for attempt in range(_MAX_RETRY):
        try:
            time.sleep(_SLEEP)
            return t.history(period=period, interval=interval)
        except Exception as e:
            if _is_rate_limit(e) and attempt < _MAX_RETRY - 1:
                time.sleep(_RETRY_WAIT)
                continue
            if _is_rate_limit(e):
                raise ValueError("データ取得中です。少し待ってから再試行してください。")
            raise
    return pd.DataFrame()


def safe_float(val) -> float | None:
    try:
        f = float(val)
        return None if pd.isna(f) else round(f, 4)
    except Exception:
        return None


def safe_int(val) -> int | None:
    try:
        f = float(val)
        return None if pd.isna(f) else int(f)
    except Exception:
        return None


def _find_col(df: pd.DataFrame, prefix: str) -> str | None:
    return next((c for c in df.columns if c.startswith(prefix)), None)


def get_stock_data(ticker: str, period: str = "1y", interval: str = "1d") -> StockResponse:
    cache_key = f"stock:{ticker}:{period}:{interval}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    t = yf.Ticker(ticker)

    info_key = f"info:{ticker}"
    info = _cache.get(info_key)
    if info is None:
        info = _yf_info(t)
        _cache.set(info_key, info, ttl_seconds=INFO_TTL)

    df = _yf_history(t, period, interval)
    if df.empty:
        raise ValueError(f"データが見つかりません: {ticker}")

    try:
        import ta as ta_lib
        close = df["Close"]
        df["SMA_20"]  = ta_lib.trend.sma_indicator(close, window=20)
        df["SMA_50"]  = ta_lib.trend.sma_indicator(close, window=50)
        df["SMA_200"] = ta_lib.trend.sma_indicator(close, window=200)
        df["EMA_20"]  = ta_lib.trend.ema_indicator(close, window=20)
        df["RSI_14"]  = ta_lib.momentum.rsi(close, window=14)
        df["MACD_12_26_9"]  = ta_lib.trend.macd(close)
        df["MACDS_12_26_9"] = ta_lib.trend.macd_signal(close)
        df["MACDH_12_26_9"] = ta_lib.trend.macd_diff(close)
        bb = ta_lib.volatility.BollingerBands(close, window=20)
        df["BBU_20_2.0"] = bb.bollinger_hband()
        df["BBM_20_2.0"] = bb.bollinger_mavg()
        df["BBL_20_2.0"] = bb.bollinger_lband()
    except Exception as e:
        print(f"[WARN] ta: {e}")

    sma20_col  = _find_col(df, "SMA_20")
    sma50_col  = _find_col(df, "SMA_50")
    sma200_col = _find_col(df, "SMA_200")
    ema20_col  = _find_col(df, "EMA_20")

    prices = [
        PricePoint(
            date=str(idx.date()),
            open=round(float(row["Open"]), 4),
            high=round(float(row["High"]), 4),
            low=round(float(row["Low"]), 4),
            close=round(float(row["Close"]), 4),
            volume=int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
            sma20=safe_float(row[sma20_col]) if sma20_col else None,
            sma50=safe_float(row[sma50_col]) if sma50_col else None,
            sma200=safe_float(row[sma200_col]) if sma200_col else None,
            ema20=safe_float(row[ema20_col]) if ema20_col else None,
        )
        for idx, row in df.iterrows()
    ]

    rsi_col = _find_col(df, "RSI_")
    rsi_series = [
        RsiPoint(date=str(idx.date()), rsi=safe_float(row[rsi_col]))
        for idx, row in df.iterrows()
    ] if rsi_col else []

    macd_col   = _find_col(df, "MACD_")
    signal_col = next((c for c in df.columns if "MACDS_" in c or c.startswith("MACD_S")), None)
    hist_col   = next((c for c in df.columns if "MACDH_" in c or c.startswith("MACD_H")), None)
    macd_series = [
        MacdPoint(
            date=str(idx.date()),
            macd=safe_float(row[macd_col]) if macd_col else None,
            signal=safe_float(row[signal_col]) if signal_col else None,
            histogram=safe_float(row[hist_col]) if hist_col else None,
        )
        for idx, row in df.iterrows()
    ] if macd_col else []

    last = df.iloc[-1]
    def flast(prefix): return safe_float(last[_find_col(df, prefix)]) if _find_col(df, prefix) else None

    closes = df["Close"].dropna()
    current = safe_float(closes.iloc[-1]) if len(closes) >= 1 else None
    prev    = safe_float(closes.iloc[-2]) if len(closes) >= 2 else None
    change  = round(current - prev, 2) if current and prev else None
    change_pct = round((change / prev) * 100, 2) if change and prev else None

    week52_high = safe_float(info.get("fiftyTwoWeekHigh")) or safe_float(df["High"].max())
    week52_low  = safe_float(info.get("fiftyTwoWeekLow"))  or safe_float(df["Low"].min())
    avg_volume  = safe_int(info.get("averageVolume")) or safe_int(df["Volume"].mean())

    result = StockResponse(
        ticker=ticker,
        name=info.get("longName") or info.get("shortName") or ticker,
        currency=info.get("currency", "USD"),
        current_price=current,
        change=change,
        change_pct=change_pct,
        volume=safe_int(last.get("Volume")),
        market_cap=safe_int(info.get("marketCap")),
        week52_high=week52_high,
        week52_low=week52_low,
        avg_volume=avg_volume,
        prices=prices,
        indicators=Indicators(
            sma_20=flast("SMA_20"), sma_50=flast("SMA_50"), sma_200=flast("SMA_200"),
            ema_20=flast("EMA_20"), rsi_14=flast("RSI_14"),
            macd=MacdData(
                macd=safe_float(last[macd_col]) if macd_col else None,
                signal=safe_float(last[signal_col]) if signal_col else None,
                histogram=safe_float(last[hist_col]) if hist_col else None,
            ),
            bollinger=BollingerData(
                upper=flast("BBU_"), middle=flast("BBM_"), lower=flast("BBL_"),
            ),
        ),
        rsi_series=rsi_series,
        macd_series=macd_series,
    )
    _cache.set(cache_key, result, ttl_seconds=STOCK_TTL)
    return result
