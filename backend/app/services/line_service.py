"""LINE Notify 通知サービス"""
import os
import httpx
from datetime import datetime

LINE_NOTIFY_URL = "https://notify-api.line.me/api/notify"


def _env_token() -> str:
    from dotenv import load_dotenv
    load_dotenv(override=True)
    return os.getenv("LINE_NOTIFY_TOKEN", "")


async def _post(token: str, message: str) -> bool:
    """LINE Notify にメッセージを POST する。成功なら True。"""
    if not token or token.startswith("your-"):
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                LINE_NOTIFY_URL,
                headers={"Authorization": f"Bearer {token}"},
                data={"message": message},
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"[WARN] LINE Notify: {e}")
        return False


async def send_alert(
    token: str,
    ticker: str,
    condition: str,
    current_value: float,
    threshold: float,
) -> bool:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    msg = (
        f"\n🔔 株価アラート発火\n"
        f"銘柄  : {ticker}\n"
        f"条件  : {condition}\n"
        f"現在値: {current_value:.2f}\n"
        f"閾値  : {threshold}\n"
        f"時刻  : {now}"
    )
    return await _post(token or _env_token(), msg)


async def send_test(token: str) -> bool:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    msg = (
        f"\n✅ Stock Advisor — LINE通知テスト\n"
        f"時刻: {now}\n"
        f"通知設定が正常に完了しました。"
    )
    return await _post(token, msg)
