"""アラートチェック & LINE通知ルーター"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AlertCheckReq(BaseModel):
    ticker: str
    indicator: str   # "RSI" | "price"
    threshold: float
    direction: str   # "above" | "below"
    line_token: str | None = None


class LineTestReq(BaseModel):
    line_token: str


@router.post("/check")
async def check_alert(req: AlertCheckReq):
    """条件チェックし、満たせば LINE 通知を送信する"""
    try:
        from app.services.stock_service import get_stock_data
        stock = get_stock_data(req.ticker.upper(), period="1mo")
        value = (
            stock.indicators.rsi_14
            if req.indicator == "RSI"
            else stock.current_price
        )
        if value is None:
            return {"triggered": False, "value": None, "notified": False}

        triggered = (
            value >= req.threshold
            if req.direction == "above"
            else value <= req.threshold
        )

        notified = False
        if triggered and req.line_token:
            from app.services.line_service import send_alert
            dir_label = "≥" if req.direction == "above" else "≤"
            notified = await send_alert(
                req.line_token, req.ticker.upper(),
                f"{req.indicator} {dir_label} {req.threshold}",
                value, req.threshold,
            )

        return {"triggered": triggered, "value": round(value, 2), "notified": notified}
    except Exception as e:
        return {"triggered": False, "value": None, "notified": False, "error": str(e)}


@router.post("/test")
async def test_line(req: LineTestReq):
    """LINE 通知テスト送信"""
    if not req.line_token:
        return {"success": False, "message": "トークンが未設定です"}
    from app.services.line_service import send_test
    ok = await send_test(req.line_token)
    return {
        "success": ok,
        "message": "テスト通知を送信しました" if ok else "送信失敗 — トークンを確認してください",
    }
