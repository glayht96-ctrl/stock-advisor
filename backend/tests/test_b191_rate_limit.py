"""B191：Yahoo の回数制限（Too Many Requests）の扱いの検査（yfinance を模したもの・外へは問い合わせない）。
流し方（backend の venv・標準の unittest）：venv\\Scripts\\python.exe -m unittest tests.test_b191_rate_limit -v
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd  # noqa: E402

from app.services import cache as _cache  # noqa: E402
from app.services import yf_retry  # noqa: E402
from app.routers import earnings, short  # noqa: E402


class YFRateLimitError(Exception):   # yfinance.exceptions.YFRateLimitError と同じ名前（型の名前で見分ける）
    def __init__(self):
        super().__init__("Too Many Requests. Rate limited. Try after a while.")


class FakeTicker:
    """info／earnings_history を、決めた回数だけ回数制限で失敗させる。"""

    def __init__(self, fail_times: int, info: dict | None = None, eh: pd.DataFrame | None = None):
        self.fail_times, self._info, self._eh, self.calls = fail_times, info or {}, eh, 0

    def _maybe_fail(self):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise YFRateLimitError()

    @property
    def info(self):
        self._maybe_fail(); return self._info

    @property
    def earnings_history(self):
        self._maybe_fail(); return self._eh

    @property
    def quarterly_earnings(self):
        return None


INFO_OK = {"symbol": "AAPL", "shortRatio": 1.5, "shortPercentOfFloat": 0.08, "sharesShort": 1000, "sharesShortPriorMonth": 800,
           **{f"k{i}": i for i in range(30)}}   # 普段の返事の形（symbol あり・項目が多い）
EH_OK = pd.DataFrame({"epsActual": [1.1, 1.3], "epsEstimate": [1.0, 1.2], "surprisePercent": [10.0, 8.3]},
                     index=pd.to_datetime(["2026-03-31", "2026-06-30"]))


class RetryTest(unittest.TestCase):
    def test_retries_only_on_rate_limit_and_gives_up_after_waits(self):
        waits = []
        calls = {"n": 0}

        def always_limited():
            calls["n"] += 1
            raise YFRateLimitError()

        value, limited = yf_retry.call_with_retry(always_limited, waits=(2, 4), sleep=waits.append)
        self.assertEqual((value, limited), (None, True))
        self.assertEqual(waits, [2, 4])        # 2 秒・4 秒待って
        self.assertEqual(calls["n"], 3)        # 最初＋2 回

    def test_other_errors_are_not_retried(self):
        with self.assertRaises(ValueError):
            yf_retry.call_with_retry(lambda: (_ for _ in ()).throw(ValueError("x")), sleep=lambda s: None)


class RouterTest(unittest.TestCase):
    def setUp(self):
        _cache.clear_all()
        self.sets = []
        real_set = _cache.set
        self.p1 = mock.patch.object(_cache, "set", side_effect=lambda k, v, ttl_seconds=300: (self.sets.append((k, ttl_seconds)), real_set(k, v, ttl_seconds)))
        self.p2 = mock.patch.object(yf_retry.time, "sleep", lambda s: None)
        self.p1.start(); self.p2.start()

    def tearDown(self):
        self.p1.stop(); self.p2.stop(); _cache.clear_all()

    def ttl_of(self, prefix):
        return [ttl for k, ttl in self.sets if k.startswith(prefix)][-1]

    def test_short_rate_limited_is_marked_and_kept_60s(self):
        with mock.patch.object(short.yf, "Ticker", lambda t: FakeTicker(fail_times=9)):
            r = short.get_short_data("AAPL")
        self.assertEqual(r["status"], "rate_limited")
        self.assertEqual(self.ttl_of("short:"), 60)    # 前は空でも 3600 秒持っていた

    def test_short_recovers_after_one_rate_limit(self):
        with mock.patch.object(short.yf, "Ticker", lambda t: FakeTicker(fail_times=1, info=INFO_OK)):
            r = short.get_short_data("AAPL")
        self.assertEqual(r["status"], "ok")
        self.assertEqual(r["shares_short"], 1000)
        self.assertEqual(self.ttl_of("short:"), 3600)

    def test_short_full_info_without_short_fields_is_marked_empty(self):
        # 日本株の形（10-24 手元：7203.T は 171 項目・symbol あり・空売りの項目なし）＝データが無い
        jp_like = {"symbol": "7203.T", **{f"k{i}": i for i in range(40)}}
        with mock.patch.object(short.yf, "Ticker", lambda t: FakeTicker(fail_times=0, info=jp_like)):
            r = short.get_short_data("7203.T")
        self.assertEqual(r["status"], "empty")
        self.assertEqual(self.ttl_of("short:"), 60)

    def test_short_degraded_info_is_marked_rate_limited(self):
        # 欠けた返事（symbol も無い・項目が少ない）＝回数制限の時に Yahoo が返す形。「データが無い」とは言わない（10-24 本番の Apple）
        with mock.patch.object(short.yf, "Ticker", lambda t: FakeTicker(fail_times=0, info={"foo": 1})):
            r = short.get_short_data("AAPL")
        self.assertEqual(r["status"], "rate_limited")
        self.assertEqual(self.ttl_of("short:"), 60)
        self.assertIsNone(_cache.get("info:AAPL"))   # 欠けた返事は覚えない

    def test_earnings_rate_limited_is_marked_and_kept_60s(self):
        with mock.patch.object(earnings.yf, "Ticker", lambda t: FakeTicker(fail_times=9)):
            r = earnings.get_earnings_surprise("AAPL")
        self.assertEqual((r["status"], r["quarters"]), ("rate_limited", []))
        self.assertEqual(self.ttl_of("earnings_surprise:"), 60)

    def test_earnings_recovers_after_one_rate_limit(self):
        with mock.patch.object(earnings.yf, "Ticker", lambda t: FakeTicker(fail_times=1, eh=EH_OK)):
            r = earnings.get_earnings_surprise("AAPL")
        self.assertEqual(r["status"], "ok")
        self.assertEqual(len(r["quarters"]), 2)
        self.assertEqual(self.ttl_of("earnings_surprise:"), 3600)


if __name__ == "__main__":
    unittest.main()
