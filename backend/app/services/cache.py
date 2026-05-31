"""
シンプルなインメモリキャッシュ。
株価データは5分、ニュースは3分でTTL切れ。
"""
import time
from typing import Any

_store: dict[str, tuple[Any, float]] = {}


def get(key: str) -> Any | None:
    if key not in _store:
        return None
    value, expires_at = _store[key]
    if time.time() > expires_at:
        del _store[key]
        return None
    return value


def set(key: str, value: Any, ttl_seconds: int = 300) -> None:
    _store[key] = (value, time.time() + ttl_seconds)


def invalidate(key: str) -> None:
    _store.pop(key, None)


def clear_all() -> int:
    count = len(_store)
    _store.clear()
    return count


def stats() -> dict:
    now = time.time()
    alive = sum(1 for _, (_, exp) in _store.items() if exp > now)
    return {"total_keys": len(_store), "alive": alive, "expired": len(_store) - alive}
