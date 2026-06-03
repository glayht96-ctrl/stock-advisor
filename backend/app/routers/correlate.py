"""銘柄間相関分析 — pandas corr() + Gemini 解説ストリーミング"""
import json
import math
import yfinance as yf
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services import cache as _cache

router = APIRouter()


class CorrelateRequest(BaseModel):
    tickers: list[str]
    period: str = "1y"


def _safe_corr(v) -> float | None:
    try:
        f = float(v)
        return round(f, 4) if not (math.isnan(f) or math.isinf(f)) else None
    except Exception:
        return None


@router.post("/")
def correlate_stocks(req: CorrelateRequest):
    """相関係数行列を計算して返す"""
    if len(req.tickers) < 2:
        raise HTTPException(status_code=400, detail="2銘柄以上指定してください")

    tickers = [t.strip().upper() for t in req.tickers[:8]]
    period  = req.period or "1y"

    cache_key = f"corr:{'_'.join(sorted(tickers))}:{period}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        raw = yf.download(tickers, period=period, progress=False, auto_adjust=True)
        if raw.empty:
            raise HTTPException(status_code=404, detail="データを取得できませんでした")

        # Close 列を抽出
        if isinstance(raw.columns, pd.MultiIndex):
            close_df = raw["Close"]
        elif "Close" in raw.columns:
            close_df = raw[["Close"]]
            close_df.columns = tickers[:1]
        else:
            raise ValueError("Close 列が見つかりません")

        close_df.columns = [str(c) for c in close_df.columns]

        # データが少なすぎる銘柄を除外
        min_rows = max(30, int(len(close_df) * 0.4))
        valid = [c for c in close_df.columns if close_df[c].notna().sum() >= min_rows]
        if len(valid) < 2:
            raise HTTPException(status_code=422, detail="有効データが2銘柄以上必要です")

        close_df = close_df[valid]
        returns  = close_df.pct_change().dropna()
        corr     = returns.corr()

        # 行列を dict に変換
        matrix = {
            t1: {t2: _safe_corr(corr.loc[t1, t2])
                 for t2 in valid if t2 in corr.columns}
            for t1 in valid if t1 in corr.index
        }

        # 上三角ペアリスト
        pairs = []
        for i, t1 in enumerate(valid):
            for t2 in valid[i+1:]:
                c = _safe_corr(corr.loc[t1, t2]) if t1 in corr.index and t2 in corr.columns else None
                if c is not None:
                    pairs.append({"t1": t1, "t2": t2, "corr": c})
        pairs.sort(key=lambda x: x["corr"], reverse=True)

        result = {
            "tickers":      valid,
            "matrix":       matrix,
            "top_positive": pairs[:3],
            "top_negative": list(reversed(pairs[-3:])) if len(pairs) >= 3 else [],
        }
        _cache.set(cache_key, result, ttl_seconds=300)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"相関計算エラー: {str(e)}")


@router.post("/analyze")
async def analyze_correlation(req: CorrelateRequest):
    """Gemini による相関解説 SSE ストリーミング"""
    # まず相関を計算
    try:
        corr_result = correlate_stocks(req)
    except HTTPException as e:
        raise e

    from app.services.claude_service import get_correlation_stream

    async def generate():
        async for chunk in get_correlation_stream(
            corr_result["tickers"],
            corr_result["top_positive"],
            corr_result["top_negative"],
            req.period,
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
