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


class CrossEvent(BaseModel):
    date: str
    type: str       # "GC" | "DC"
    from_line: str  # "Price" | "SMA20"
    to_line: str    # "SMA20" | "SMA50"


class VolumeSpikeDay(BaseModel):
    date: str
    volume: int
    ratio: float    # vs avg_volume


class PricePatterns(BaseModel):
    trend_5d: Optional[str] = None   # "up" | "down" | "flat"
    trend_20d: Optional[str] = None
    trend_60d: Optional[str] = None
    return_5d: Optional[float] = None
    return_20d: Optional[float] = None
    return_60d: Optional[float] = None
    new_high_20d: bool = False
    new_low_20d: bool = False
    golden_crosses: list[CrossEvent] = []
    dead_crosses: list[CrossEvent] = []
    volume_spikes: list[VolumeSpikeDay] = []
    bb_squeeze: bool = False
    bb_bandwidth_pct: Optional[float] = None


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
    price_patterns: Optional[PricePatterns] = None


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
