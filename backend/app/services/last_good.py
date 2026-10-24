"""前に取れた値を覚えておき、Yahoo に断られた時に「◯時点の値」として返す（B208 の A・2026-10-24）。

- remember(kind, ticker, result)：取れた結果を as_of（取れた時刻）つきで 7 日覚える
- recall(kind, ticker)：覚えている結果を status "stale"・as_of つきで返す。無ければ None
覚える所はプロセスの中（services/cache）。Render の無料プランは眠ると消えるので、B（家の PC の前取り）で補う。
"""
from __future__ import annotations

import time
from typing import Any

from app.services import cache as _cache

KEEP_SECONDS = 7 * 24 * 3600


def _key(kind: str, ticker: str) -> str:
    return f"last_good:{kind}:{ticker}"


def remember(kind: str, ticker: str, result: dict[str, Any]) -> None:
    _cache.set(_key(kind, ticker), {**result, "as_of": time.strftime("%Y-%m-%d %H:%M")}, ttl_seconds=KEEP_SECONDS)


def recall(kind: str, ticker: str) -> dict[str, Any] | None:
    got = _cache.get(_key(kind, ticker))
    if not got:
        return None
    return {**got, "status": "stale"}
