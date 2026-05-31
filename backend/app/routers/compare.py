from fastapi import APIRouter, HTTPException, Query
from app.services.stock_service import get_stock_data
from pydantic import BaseModel

router = APIRouter()


class CompareItem(BaseModel):
    ticker: str
    name: str
    currency: str
    current_price: float | None
    change_pct: float | None
    rsi_14: float | None
    macd_histogram: float | None
    sma_20: float | None
    sma_50: float | None
    market_cap: int | None


@router.get("/", response_model=list[CompareItem])
def compare(tickers: str = Query(..., description="カンマ区切り銘柄コード例: AAPL,NVDA,7203.T")):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:6]
    if not ticker_list:
        raise HTTPException(status_code=400, detail="tickersを指定してください")

    results = []
    for ticker in ticker_list:
        try:
            s = get_stock_data(ticker, period="3mo")
            results.append(CompareItem(
                ticker=s.ticker,
                name=s.name,
                currency=s.currency,
                current_price=s.current_price,
                change_pct=s.change_pct,
                rsi_14=s.indicators.rsi_14,
                macd_histogram=s.indicators.macd.histogram,
                sma_20=s.indicators.sma_20,
                sma_50=s.indicators.sma_50,
                market_cap=s.market_cap,
            ))
        except Exception as e:
            print(f"[WARN] compare skip {ticker}: {e}")
    return results
