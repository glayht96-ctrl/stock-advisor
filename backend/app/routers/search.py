"""インクリメンタルサーチ — 1200銘柄から高速部分一致検索（キャッシュ不要）"""
import urllib.parse
import feedparser
from fastapi import APIRouter
from app.data.tickers import TICKER_INFO
from app.services import cache as _cache

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


@router.get("/news")
async def search_news(q: str = ""):
    """キーワードでニュースを検索し、関連銘柄を Gemini で抽出"""
    q = q.strip()
    if not q:
        return {"q": "", "articles": [], "related_tickers": []}

    cache_key = f"news_search:{q.lower()}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    # Google News RSS 検索
    articles = []
    try:
        url  = f"https://news.google.com/rss/search?q={urllib.parse.quote(q)}&hl=ja&gl=JP&ceid=JP:ja"
        feed = feedparser.parse(url)
        for e in feed.entries[:15]:
            src = ""
            try:
                src = e.source.title if hasattr(e, "source") and e.source else "Google News"
            except Exception:
                src = "Google News"
            articles.append({
                "title":        e.get("title", ""),
                "url":          e.get("link", ""),
                "summary":      e.get("summary", ""),
                "published_at": e.get("published", None),
                "source":       src,
            })
    except Exception as ex:
        print(f"[WARN] search/news RSS: {ex}")

    # Gemini で関連銘柄を抽出
    from app.services.claude_service import extract_tickers_from_news
    related_tickers = await extract_tickers_from_news(q, articles) if articles else []

    result = {"q": q, "articles": articles, "related_tickers": related_tickers}
    _cache.set(cache_key, result, ttl_seconds=600)
    return result
