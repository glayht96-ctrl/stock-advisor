from pydantic import BaseModel
from typing import Optional


class PricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    sma20: Optional[float] = None
    sma50: Optional[float] = None
    sma200: Optional[float] = None
    ema20: Optional[float] = None


class RsiPoint(BaseModel):
    date: str
    rsi: Optional[float]


class MacdPoint(BaseModel):
    date: str
    macd: Optional[float]
    signal: Optional[float]
    histogram: Optional[float]


class MacdData(BaseModel):
    macd: Optional[float]
    signal: Optional[float]
    histogram: Optional[float]


class BollingerData(BaseModel):
    upper: Optional[float]
    middle: Optional[float]
    lower: Optional[float]


class Indicators(BaseModel):
    sma_20: Optional[float]
    sma_50: Optional[float]
    sma_200: Optional[float]
    ema_20: Optional[float]
    rsi_14: Optional[float]
    macd: MacdData
    bollinger: BollingerData


class StockResponse(BaseModel):
    ticker: str
    name: str
    currency: str
    current_price: Optional[float]
    change: Optional[float]
    change_pct: Optional[float]
    volume: Optional[int]
    market_cap: Optional[int]
    week52_high: Optional[float] = None
    week52_low: Optional[float] = None
    avg_volume: Optional[int] = None
    prices: list[PricePoint]
    indicators: Indicators
    rsi_series: list[RsiPoint] = []
    macd_series: list[MacdPoint] = []


class NewsArticle(BaseModel):
    title: str
    summary: str
    url: str
    published_at: Optional[str]
    source: str
    lang: str
    sentiment: Optional[str] = None
    full_text: Optional[str] = None


class NewsResponse(BaseModel):
    ticker: str
    articles: list[NewsArticle]
    total: int
    overall_sentiment: Optional[str] = None
