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
_SLEEP      = 0.3
_MAX_RETRY  = 3
_RETRY_WAIT = 2.0


def _is_rate_limit(e: Exception) -> bool:
    msg = str(e).lower()
    return "429" in msg or "too many requests" in msg or "rate limit" in msg


def _yf_info(t: yf.Ticker) -> dict:
    """
    yfinance .info を取得。
    - None / 非dict を返す場合は {} にフォールバック（info はオプショナルメタデータ）
    - 例外は抑制してログだけ出力し、呼び出し元をクラッシュさせない
    """
    for attempt in range(_MAX_RETRY):
        try:
            time.sleep(_SLEEP)
            data = t.info
            if isinstance(data, dict):
                return data
            # None や想定外の型が返った場合
            print(f"[WARN] _yf_info: unexpected type {type(data)} for {t.ticker}")
            return {}
        except Exception as e:
            if _is_rate_limit(e):
                if attempt < _MAX_RETRY - 1:
                    time.sleep(_RETRY_WAIT * (attempt + 1))
                    continue
                raise ValueError("データ取得中です。少し待ってから再試行してください。")
            # info は補助情報なのでクラッシュさせず、リトライしてから空dictを返す
            print(f"[WARN] _yf_info attempt {attempt+1}: {e}")
            if attempt < _MAX_RETRY - 1:
                time.sleep(_RETRY_WAIT)
                continue
    return {}


def _yf_fast_info_supplement(t: yf.Ticker) -> dict:
    """fast_info から基本フィールドを補完（info が空の場合のフォールバック）"""
    try:
        fi = t.fast_info
        return {
            "currency":        getattr(fi, "currency", None),
            "marketCap":       _to_int(getattr(fi, "market_cap", None)),
            "fiftyTwoWeekHigh": _to_float(getattr(fi, "fifty_two_week_high", None)),
            "fiftyTwoWeekLow":  _to_float(getattr(fi, "fifty_two_week_low", None)),
            "averageVolume":    _to_int(getattr(fi, "three_month_average_volume", None)),
        }
    except Exception as e:
        print(f"[WARN] _yf_fast_info_supplement: {e}")
        return {}


def _to_float(v) -> float | None:
    try:
        f = float(v)
        return None if pd.isna(f) else f
    except Exception:
        return None


def _to_int(v) -> int | None:
    f = _to_float(v)
    return int(f) if f is not None else None


def _yf_history(t: yf.Ticker, period: str, interval: str) -> pd.DataFrame:
    for attempt in range(_MAX_RETRY):
        try:
            time.sleep(_SLEEP)
            df = t.history(period=period, interval=interval)
            if df is None or not isinstance(df, pd.DataFrame):
                return pd.DataFrame()
            # yfinance 0.2.x で MultiIndex 列が返る場合をフラット化
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
            return df
        except Exception as e:
            if _is_rate_limit(e):
                if attempt < _MAX_RETRY - 1:
                    time.sleep(_RETRY_WAIT * (attempt + 1))
                    continue
                raise ValueError("データ取得中です。少し待ってから再試行してください。")
            print(f"[WARN] _yf_history attempt {attempt+1}: {e}")
            if attempt < _MAX_RETRY - 1:
                time.sleep(_RETRY_WAIT)
                continue
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
    return next((c for c in df.columns if str(c).startswith(prefix)), None)


def _guess_currency(ticker: str) -> str:
    """ticker サフィックスから通貨を推定（info が空の場合のフォールバック）"""
    if ticker.endswith(".T"):  return "JPY"
    if ticker.endswith(".L"):  return "GBP"
    if ticker.endswith(".HK"): return "HKD"
    if ticker.endswith(".PA") or ticker.endswith(".DE") or ticker.endswith(".AS"): return "EUR"
    return "USD"


def _safe_row_val(row: pd.Series, col: str) -> float | None:
    """DataFrame 行から安全に float を取得"""
    try:
        v = row.get(col) if hasattr(row, "get") else row[col]
        return safe_float(v)
    except Exception:
        return None


def get_stock_data(ticker: str, period: str = "1y", interval: str = "1d") -> StockResponse:
    cache_key = f"stock:{ticker}:{period}:{interval}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    t = yf.Ticker(ticker)

    # ── info 取得（常に dict を保証） ────────────────────────────────
    info_key = f"info:{ticker}"
    info = _cache.get(info_key)
    if not isinstance(info, dict):          # None / 旧バグで格納された非dict を再取得
        info = _yf_info(t)
        _cache.set(info_key, info, ttl_seconds=INFO_TTL)

    # info が空なら fast_info で補完
    if not info.get("currency") and not info.get("longName"):
        supplement = _yf_fast_info_supplement(t)
        info = {**supplement, **info}       # info 側を優先

    # ── history 取得 ─────────────────────────────────────────────────
    df = _yf_history(t, period, interval)
    if df.empty:
        name = info.get("longName") or info.get("shortName") or ticker
        raise ValueError(f"{name}（{ticker}）のデータが見つかりません。ティッカーを確認してください。")

    # ── テクニカル指標計算 ────────────────────────────────────────────
    close_col = _find_col(df, "Close") or "Close"
    try:
        close = df[close_col]
    except KeyError:
        # 列名が異なる場合（例: 大文字/小文字）の最終防衛
        for c in df.columns:
            if str(c).lower() == "close":
                close = df[c]
                close_col = c
                break
        else:
            raise ValueError(f"{ticker}: Close 列が見つかりません（列: {list(df.columns)}）")

    try:
        import ta as ta_lib
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
        print(f"[WARN] ta indicators: {e}")

    sma20_col  = _find_col(df, "SMA_20")
    sma50_col  = _find_col(df, "SMA_50")
    sma200_col = _find_col(df, "SMA_200")
    ema20_col  = _find_col(df, "EMA_20")

    # ── PricePoint リスト ─────────────────────────────────────────────
    def _row_float(row, col):
        try:
            v = row[col]
            return round(float(v), 4) if not pd.isna(v) else 0.0
        except Exception:
            return 0.0

    prices = [
        PricePoint(
            date=str(idx.date()),
            open=_row_float(row, "Open"),
            high=_row_float(row, "High"),
            low=_row_float(row, "Low"),
            close=_row_float(row, close_col),
            volume=int(row["Volume"]) if "Volume" in row.index and not pd.isna(row["Volume"]) else 0,
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
    signal_col = next((c for c in df.columns if "MACDS_" in str(c) or str(c).startswith("MACD_S")), None)
    hist_col   = next((c for c in df.columns if "MACDH_" in str(c) or str(c).startswith("MACD_H")), None)
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

    closes     = df[close_col].dropna()
    current    = safe_float(closes.iloc[-1]) if len(closes) >= 1 else None
    prev       = safe_float(closes.iloc[-2]) if len(closes) >= 2 else None
    change     = round(current - prev, 2) if current is not None and prev is not None else None
    change_pct = round((change / prev) * 100, 2) if change is not None and prev else None

    # info が空でも df から計算できるものはフォールバック
    week52_high = safe_float(info.get("fiftyTwoWeekHigh")) or safe_float(df["High"].max())
    week52_low  = safe_float(info.get("fiftyTwoWeekLow"))  or safe_float(df["Low"].min())
    avg_volume  = safe_int(info.get("averageVolume")) or safe_int(df["Volume"].mean()) if "Volume" in df.columns else None

    currency = info.get("currency") or _guess_currency(ticker)
    name     = info.get("longName") or info.get("shortName") or ticker

    vol_val = last.get("Volume") if hasattr(last, "get") else last["Volume"] if "Volume" in last.index else None

    result = StockResponse(
        ticker=ticker,
        name=name,
        currency=currency,
        current_price=current,
        change=change,
        change_pct=change_pct,
        volume=safe_int(vol_val),
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
