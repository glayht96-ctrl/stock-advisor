"""インクリメンタルサーチ — 1200銘柄から高速部分一致検索（キャッシュ不要）"""
from fastapi import APIRouter
from app.data.tickers import TICKER_INFO

router = APIRouter()


def _score(ticker: str, info: dict, q: str) -> int:
    """マッチスコア（低いほど優先）"""
    t       = ticker.lower()
    name_ja = info.get("name_ja", "").lower()
    name_en = info.get("name_en", "").lower()
    if t == q:                                    return 0
    if t.startswith(q):                           return 1
    if name_ja.startswith(q):                     return 2
    if name_en.lower().startswith(q):             return 3
    if q in t:                                    return 4
    if q in name_ja:                              return 5
    if q in name_en.lower():                      return 6
    return 99


@router.get("/")
def search_tickers(q: str = ""):
    q = q.strip()
    if len(q) < 1:
        return {"results": []}

    q_lower = q.lower()
    matched: list[tuple[int, dict]] = []

    for ticker, info in TICKER_INFO.items():
        name_ja = info.get("name_ja", "")
        name_en = info.get("name_en", "")
        if (q_lower in ticker.lower()
                or q_lower in name_ja.lower()
                or q_lower in name_en.lower()):
            score = _score(ticker, info, q_lower)
            matched.append((score, {
                "ticker":  ticker,
                "name_ja": name_ja,
                "name_en": name_en,
                "sector":  info.get("sector", "-"),
                "market":  info.get("market", "-"),
            }))

    matched.sort(key=lambda x: x[0])
    return {"results": [r for _, r in matched[:20]]}


@router.get("/related")
def related_tickers(ticker: str = ""):
    """同セクター・同市場の関連銘柄（最大5件）"""
    ticker = ticker.upper().strip()
    if not ticker:
        return {"results": []}

    base = TICKER_INFO.get(ticker, {})
    sector = base.get("sector", "")
    market = base.get("market", "")
    if not sector:
        return {"results": []}

    results = []
    # featured=True を優先して並べる
    for featured in (True, False):
        for t, info in TICKER_INFO.items():
            if t == ticker:
                continue
            if info.get("sector") == sector and info.get("market") == market:
                if info.get("featured", False) == featured:
                    results.append({
                        "ticker":  t,
                        "name_ja": info.get("name_ja", t),
                        "name_en": info.get("name_en", t),
                        "sector":  sector,
                        "market":  market,
                    })
            if len(results) >= 5:
                break
        if len(results) >= 5:
            break

    return {"results": results[:5]}
