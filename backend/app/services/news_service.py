import asyncio
import re
import feedparser
import httpx
import yfinance as yf
from bs4 import BeautifulSoup
from email.utils import parsedate_to_datetime
from app.models.schemas import NewsArticle, NewsResponse
from app.services import cache as _cache

NEWS_TTL     = 180  # 3分
FULL_TEXT_MAX = 2000  # 本文最大取得文字数（旧1000→2000に拡張）


def is_japan_stock(ticker: str) -> bool:
    return ticker.endswith(".T")


def get_rss_sources(ticker: str, company_name: str) -> dict[str, tuple[str, str]]:
    if is_japan_stock(ticker):
        code = ticker.replace(".T", "")
        return {
            "Yahoo!ファイナンス": (
                f"https://finance.yahoo.co.jp/rss/news?code={code}", "ja"),
            "Google News（日本語）": (
                f"https://news.google.com/rss/search?q={company_name}&hl=ja&gl=JP&ceid=JP:ja", "ja"),
            "Reuters Japan": (
                "https://feeds.reuters.com/reuters/JPdomesticNews", "ja"),
            "Bloomberg Japan": (
                "https://www.bloomberg.co.jp/feeds/bbiz", "ja"),
        }
    else:
        return {
            "Google News (EN)": (
                f"https://news.google.com/rss/search?q={ticker}+stock&hl=en&gl=US&ceid=US:en", "en"),
            "Reuters": (
                "https://feeds.reuters.com/reuters/businessNews", "en"),
            "MarketWatch": (
                "https://feeds.marketwatch.com/marketwatch/topstories/", "en"),
            "CNBC": (
                "https://www.cnbc.com/id/100003114/device/rss/rss.html", "en"),
        }


def parse_date(entry) -> str | None:
    for field in ["published", "updated"]:
        val = getattr(entry, field, None)
        if val:
            try:
                return parsedate_to_datetime(val).isoformat()
            except Exception:
                return val
    return None


async def fetch_full_text(client: httpx.AsyncClient, url: str) -> tuple[str | None, int]:
    """本文取得。(text, chars) を返す。次ページも試みる。"""
    try:
        resp = await client.get(url, timeout=6.0, follow_redirects=True)
        soup = BeautifulSoup(resp.text, "html.parser")

        # メイン本文パラグラフを収集
        paragraphs = soup.find_all("p")
        text = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20)

        # FULL_TEXT_MAX に達しておらず次ページリンクがある場合は試みる
        if len(text) < FULL_TEXT_MAX:
            next_link = (
                soup.find("a", string=re.compile(r"次のページ|次へ|page 2|next", re.I))
                or soup.find("a", rel="next")
            )
            if next_link and next_link.get("href"):
                try:
                    href = next_link["href"]
                    if not href.startswith("http"):
                        from urllib.parse import urljoin
                        href = urljoin(url, href)
                    r2 = await client.get(href, timeout=5.0, follow_redirects=True)
                    soup2 = BeautifulSoup(r2.text, "html.parser")
                    extra = " ".join(
                        p.get_text(strip=True) for p in soup2.find_all("p")
                        if len(p.get_text(strip=True)) > 20
                    )
                    text = (text + " " + extra).strip()
                except Exception:
                    pass

        truncated = text[:FULL_TEXT_MAX]
        return (truncated or None, len(truncated))
    except Exception as e:
        print(f"[WARN] full_text ({url[:60]}): {e}")
        return None, 0


async def fetch_rss(
    client: httpx.AsyncClient, source_name: str, url: str, lang: str
) -> list[NewsArticle]:
    try:
        resp = await client.get(url, timeout=10.0, follow_redirects=True)
        feed = feedparser.parse(resp.text)
        articles: list[NewsArticle] = []
        for entry in feed.entries:
            title   = getattr(entry, "title",   "") or ""
            summary = getattr(entry, "summary", "") or ""
            link    = getattr(entry, "link",    "") or ""
            if not title or not link:
                continue
            summary = re.sub(r"<[^>]+>", "", summary).strip()[:300]
            articles.append(NewsArticle(
                title=title.strip(), summary=summary, url=link,
                published_at=parse_date(entry), source=source_name, lang=lang,
            ))
        return articles
    except Exception as e:
        print(f"[WARN] RSS ({source_name}): {e}")
        return []


async def get_news(
    ticker: str, limit: int = 20, with_sentiment: bool = False
) -> NewsResponse:
    cache_key = f"news:{ticker}:{limit}"
    cached = _cache.get(cache_key)
    if cached is not None and not with_sentiment:
        return cached

    # 会社名取得（キャッシュ利用）
    info_key = f"info:{ticker}"
    info = _cache.get(info_key)
    if not isinstance(info, dict):
        try:
            data = yf.Ticker(ticker).info
            info = data if isinstance(data, dict) else {}
            _cache.set(info_key, info, ttl_seconds=3600)
        except Exception:
            info = {}
    company_name = info.get("longName") or info.get("shortName") or ticker

    sources = get_rss_sources(ticker, company_name)
    async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}) as client:
        results = await asyncio.gather(*[
            fetch_rss(client, name, url, lang)
            for name, (url, lang) in sources.items()
        ])

    seen:         set[str]         = set()
    all_articles: list[NewsArticle] = []
    for batch in results:
        for a in batch:
            if a.url not in seen:
                seen.add(a.url)
                all_articles.append(a)

    all_articles.sort(key=lambda a: a.published_at or "0000", reverse=True)
    articles = all_articles[:limit]

    overall_sentiment = None
    if with_sentiment and articles:
        try:
            async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}) as ft_client:
                ft_results = await asyncio.gather(*[
                    fetch_full_text(ft_client, a.url) for a in articles
                ])
            for a, (ft, chars) in zip(articles, ft_results):
                a.full_text = ft  # type: ignore[assignment]

            from app.services.claude_service import analyze_news_sentiment
            result = await analyze_news_sentiment([
                {"url": a.url, "title": a.title, "summary": a.summary,
                 "full_text": a.full_text or ""}
                for a in articles
            ])
            sentiment_map = {r["url"]: r["sentiment"] for r in result.get("articles", [])}
            for a in articles:
                a.sentiment = sentiment_map.get(a.url)  # type: ignore[assignment]
            overall_sentiment = result.get("overall")
        except Exception as e:
            print(f"[WARN] Sentiment: {e}")

    response = NewsResponse(
        ticker=ticker, articles=articles,
        total=len(articles), overall_sentiment=overall_sentiment,
    )
    if not with_sentiment:
        _cache.set(cache_key, response, ttl_seconds=NEWS_TTL)
    return response
