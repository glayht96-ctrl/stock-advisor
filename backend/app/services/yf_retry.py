"""yfinance の回数制限（Too Many Requests）の時だけ、間をおいて取り直す（B191・2026-10-24）。

Render のような共有のサーバーから Yahoo に問い合わせると回数制限にかかりやすい。
- 回数制限の時だけ WAITS 秒ずつ待って取り直す（それ以外の失敗は取り直さない）
- 結果と「回数制限だったか」を返す。呼び出し側は、空の結果を長くキャッシュしない・画面に「いま取れない」と出すのに使う
"""
from __future__ import annotations

import time
from typing import Any, Callable

WAITS = (2, 4)


def _is_rate_limited(exc: BaseException) -> bool:
    if type(exc).__name__ == "YFRateLimitError":
        return True
    msg = str(exc)
    return "Too Many Requests" in msg or "Rate limited" in msg or "429" in msg


def call_with_retry(fn: Callable[[], Any], waits: tuple[float, ...] = WAITS,
                    sleep: Callable[[float], None] = time.sleep) -> tuple[Any, bool]:
    """fn() を呼ぶ。回数制限の時だけ waits の秒数ずつ待って取り直す。

    戻り値：(結果, rate_limited)。最後まで回数制限なら (None, True)。
    回数制限でない例外はそのまま投げる（今までの扱いを変えない）。
    """
    for wait in (*waits, None):
        try:
            return fn(), False
        except Exception as exc:  # noqa: BLE001
            if not _is_rate_limited(exc):
                raise
            if wait is None:
                return None, True
            sleep(wait)
    return None, True
