import json
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import yfinance as yf

router = APIRouter()


@router.get("/{ticker}")
def run_backtest(
    ticker: str,
    buy_date: str = Query(..., description="購入日 YYYY-MM-DD"),
    sell_date: str | None = Query(None, description="売却日 YYYY-MM-DD（省略時=今日）"),
    amount: float = Query(10000, description="投資金額"),
):
    try:
        buy_dt = date.fromisoformat(buy_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="buy_date は YYYY-MM-DD 形式で指定してください")

    if sell_date:
        try:
            sell_dt = date.fromisoformat(sell_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="sell_date は YYYY-MM-DD 形式で指定してください")
    else:
        sell_dt = date.today()

    if buy_dt >= sell_dt:
        raise HTTPException(status_code=400, detail="sell_date は buy_date より後にしてください")

    start = (buy_dt - timedelta(days=7)).isoformat()
    end = (sell_dt + timedelta(days=7)).isoformat()
    df = yf.Ticker(ticker.upper()).history(start=start, end=end)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"データが見つかりません: {ticker}")

    df.index = df.index.date  # type: ignore

    after_buy = sorted(d for d in df.index if d >= buy_dt)
    if not after_buy:
        raise HTTPException(status_code=400, detail="購入日以降のデータがありません")
    buy_actual = after_buy[0]

    before_sell = sorted(d for d in df.index if d <= sell_dt)
    if not before_sell:
        raise HTTPException(status_code=400, detail="売却日以前のデータがありません")
    sell_actual = before_sell[-1]

    if buy_actual >= sell_actual:
        raise HTTPException(status_code=400, detail="有効な取引期間が確保できません（期間が短すぎます）")

    buy_price = round(float(df.loc[buy_actual, "Close"]), 4)
    sell_price = round(float(df.loc[sell_actual, "Close"]), 4)
    shares = amount / buy_price
    profit_loss = round((sell_price - buy_price) * shares, 2)
    profit_loss_pct = round((sell_price - buy_price) / buy_price * 100, 2)
    days = (sell_actual - buy_actual).days
    years = days / 365.25
    annualized = round(((sell_price / buy_price) ** (1 / years) - 1) * 100, 2) if years > 0.01 else profit_loss_pct

    return {
        "ticker": ticker.upper(),
        "buy_date": str(buy_actual),
        "sell_date": str(sell_actual),
        "buy_price": buy_price,
        "sell_price": sell_price,
        "investment": round(amount, 2),
        "shares": round(shares, 6),
        "profit_loss": profit_loss,
        "profit_loss_pct": profit_loss_pct,
        "period_days": days,
        "annualized_return": annualized,
    }


@router.get("/{ticker}/comment")
async def backtest_comment(
    ticker: str,
    buy_date: str = Query(...),
    sell_date: str | None = Query(None),
    profit_loss_pct: float | None = Query(None),
):
    from app.services.claude_service import get_backtest_comment_stream

    sell_str = sell_date or str(date.today())

    async def generate():
        async for chunk in get_backtest_comment_stream(
            ticker.upper(), buy_date, sell_str, profit_loss_pct
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
