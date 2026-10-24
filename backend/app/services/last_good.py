"""前に取れた値を覚えておき、Yahoo に断られた時に「◯時点の値」として返す（B208 の A・2026-10-24）。

- remember(kind, ticker, result)：取れた結果を as_of（取れた時刻）つきで 7 日覚える
- recall(kind, ticker)：覚えている結果を status "stale"・as_of つきで返す。無ければ None
覚える所はプロセスの中（services/cache）。Render の無料プランは眠ると消える。

B208 の B：家の PC で前もって取った値（JSON）を、環境変数 PREFETCH_URL があればそこから読み、覚えている値が無い時の補いにする。
PREFETCH_URL が無ければ何もしない（今までと同じ）。読むのは 6 時間に 1 回まで。
JSON の形：{"generated_at": "YYYY-MM-DD HH:MM", "short": {ticker: result}, "earnings_surprise": {ticker: result}}（result の status が ok の物だけ使う）
"""
from __future__ import annotations

import os
import time
from typing import Any

from app.services import cache as _cache

KEEP_SECONDS = 7 * 24 * 3600
PREFETCH_EVERY = 6 * 3600
_prefetch_loaded_at = 0.0


def _key(kind: str, ticker: str) -> str:
    return f"last_good:{kind}:{ticker}"


def remember(kind: str, ticker: str, result: dict[str, Any], as_of: str | None = None) -> None:
    _cache.set(_key(kind, ticker), {**result, "as_of": as_of or time.strftime("%Y-%m-%d %H:%M")}, ttl_seconds=KEEP_SECONDS)


def _load_prefetch() -> int:
    """PREFETCH_URL の JSON を読み、覚えている値が無い銘柄だけ補う。補った数を返す（失敗は 0・アプリは止めない）。"""
    global _prefetch_loaded_at
    url = os.environ.get("PREFETCH_URL", "").strip()
    if not url or time.time() - _prefetch_loaded_at < PREFETCH_EVERY:
        return 0
    _prefetch_loaded_at = time.time()
    try:
        import httpx

        data = httpx.get(url, timeout=10).json()
    except Exception as e:  # noqa: BLE001
        print(f"[WARN] prefetch を読めない: {type(e).__name__}")
        return 0
    n = 0
    as_of = str(data.get("generated_at") or "")
    for kind in ("short", "earnings_surprise"):
        for ticker, result in (data.get(kind) or {}).items():
            if isinstance(result, dict) and result.get("status") == "ok" and _cache.get(_key(kind, ticker)) is None:
                remember(kind, ticker, result, as_of=as_of + "（家の PC で前取り）")
                n += 1
    return n


def recall(kind: str, ticker: str) -> dict[str, Any] | None:
    got = _cache.get(_key(kind, ticker))
    if not got and _load_prefetch():
        got = _cache.get(_key(kind, ticker))
    if not got:
        return None
    return {**got, "status": "stale"}
