import asyncio
import json
from datetime import datetime, timezone
import yfinance as yf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


def _fetch_price(ticker: str) -> dict:
    t = yf.Ticker(ticker)
    info = t.fast_info
    price = float(info.last_price) if info.last_price else None
    prev  = float(info.previous_close) if info.previous_close else None
    change = round(price - prev, 4) if (price and prev) else None
    change_pct = round((change / prev) * 100, 2) if (change and prev) else None
    volume = None
    try:
        volume = int(info.last_volume) if info.last_volume else None
    except Exception:
        pass

    # 当日の始値・高値・安値（fast_info から追加コスト無し）
    ohlc_today = None
    try:
        o = float(info.open)     if getattr(info, "open",     None) else None
        h = float(info.day_high) if getattr(info, "day_high", None) else None
        l = float(info.day_low)  if getattr(info, "day_low",  None) else None
        if o and h and l and price:
            ohlc_today = {
                "open":  round(o, 4),
                "high":  round(h, 4),
                "low":   round(l, 4),
                "close": round(price, 4),
            }
    except Exception:
        pass

    return {
        "ticker":     ticker,
        "price":      round(price, 4) if price else None,
        "change":     change,
        "change_pct": change_pct,
        "volume":     volume,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
        "ohlc_today": ohlc_today,
    }


@router.websocket("/{ticker}")
async def realtime_price(websocket: WebSocket, ticker: str):
    await websocket.accept()
    ticker = ticker.upper()
    loop = asyncio.get_running_loop()
    try:
        while True:
            data = await loop.run_in_executor(None, _fetch_price, ticker)
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(5)   # 30s → 5s
    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as e:
        print(f"[WS] {ticker}: {e}")
        try:
            await websocket.send_text(json.dumps({
                "ticker": ticker, "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }))
        except Exception:
            pass
