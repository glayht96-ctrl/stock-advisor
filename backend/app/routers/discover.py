"""本日の注目銘柄スキャナー — スコアリングで上位15銘柄を抽出"""
import json
import concurrent.futures
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services import cache as _cache
from app.routers.screen import TICKER_INFO, DEFAULT_TICKERS

router = APIRouter()

_CACHE_KEY = "discover:top15"
_CACHE_TTL  = 600  # 10分


def _score_ticker(ticker: str) -> dict | None:
    try:
        from app.services.stock_service import get_stock_data
        stock = get_stock_data(ticker, period="3mo")
        d = stock.model_dump()
        ind      = d.get("indicators") or {}
        prices   = d.get("prices") or []
        macd_ser = d.get("macd_series") or []
        info     = TICKER_INFO.get(ticker, {})

        change_pct: float     = d.get("change_pct") or 0.0
        volume:     int       = d.get("volume") or 0
        avg_volume: int       = d.get("avg_volume") or 0
        rsi:        float | None = ind.get("rsi_14")

        score   = 0.0
        signals: list[str] = []

        # 1. 値動き: |騰落率|
        abs_chg = abs(change_pct)
        score += abs_chg * 1.5
        if abs_chg >= 3.0:
            label = f"急騰 +{change_pct:.1f}%" if change_pct > 0 else f"急落 {change_pct:.1f}%"
            signals.append(label)

        # 2. 出来高急増: 当日 / 平均出来高
        if volume > 0 and avg_volume > 0:
            vol_ratio = volume / avg_volume
            score += max(0.0, (vol_ratio - 1.0)) * 2.0
            if vol_ratio >= 2.0:
                signals.append(f"出来高{vol_ratio:.1f}倍")

        # 3a. RSI 過熱 / 売られすぎ
        if rsi is not None:
            if rsi >= 70:
                score += (rsi - 70) * 0.4
                signals.append(f"RSI {rsi:.0f} 過熱")
            elif rsi <= 30:
                score += (30 - rsi) * 0.4
                signals.append(f"RSI {rsi:.0f} 売られすぎ")

        # 3b. 価格が SMA20 をゴールデン/デッドクロス（直近3日以内）
        for i in range(max(0, len(prices) - 4), len(prices) - 1):
            pc, nc = prices[i], prices[i + 1]
            pc_c, nc_c = pc.get("close"), nc.get("close")
            pc_s, nc_s = pc.get("sma20"), nc.get("sma20")
            if None in (pc_c, nc_c, pc_s, nc_s):
                continue
            if pc_c < pc_s and nc_c > nc_s:
                score += 4.0
                signals.append("GC SMA20")
                break
            if pc_c > pc_s and nc_c < nc_s:
                score += 4.0
                signals.append("DC SMA20")
                break

        # 3c. MACD ヒストグラムがゼロ近辺でクロス（直近）
        hists = [
            s["histogram"] for s in macd_ser[-4:]
            if s.get("histogram") is not None
        ]
        if len(hists) >= 2 and (hists[-1] > 0) != (hists[-2] > 0):
            score += 3.0
            signals.append("MACD転換")

        return {
            "ticker":        ticker,
            "name":          d.get("name"),
            "current_price": d.get("current_price"),
            "change_pct":    change_pct,
            "currency":      d.get("currency"),
            "sector":        info.get("sector", "-"),
            "market":        info.get("market", "-"),
            "rsi":           rsi,
            "volume":        volume,
            "avg_volume":    avg_volume,
            "signals":       signals,
            "_score":        score,
        }
    except Exception as e:
        print(f"[WARN] Discover {ticker}: {e}")
        return None


@router.get("/")
def get_discover():
    cached = _cache.get(_CACHE_KEY)
    if cached is not None:
        return cached

    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        futures = {ex.submit(_score_ticker, t): t for t in DEFAULT_TICKERS}
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if r:
                results.append(r)

    results.sort(key=lambda x: x.get("_score", 0.0), reverse=True)
    top15 = [{k: v for k, v in r.items() if k != "_score"} for r in results[:15]]

    response = {"results": top15, "total": len(results)}
    _cache.set(_CACHE_KEY, response, ttl_seconds=_CACHE_TTL)
    return response


@router.get("/comment")
async def stream_comment():
    cached  = _cache.get(_CACHE_KEY)
    results = (cached or {}).get("results", [])

    from app.services.claude_service import get_discover_comment_stream

    async def generate():
        async for chunk in get_discover_comment_stream(results):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
