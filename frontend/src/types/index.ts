export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  ema20?: number | null;
}

export interface RsiPoint {
  date: string;
  rsi: number | null;
}

export interface MacdPoint {
  date: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface MacdData {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface BollingerData {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface Indicators {
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  ema_20: number | null;
  rsi_14: number | null;
  macd: MacdData;
  bollinger: BollingerData;
}

export interface StockData {
  ticker: string;
  name: string;
  currency: string;
  current_price: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  market_cap: number | null;
  week52_high: number | null;
  week52_low: number | null;
  avg_volume: number | null;
  prices: PricePoint[];
  indicators: Indicators;
  rsi_series: RsiPoint[];
  macd_series: MacdPoint[];
}

export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  published_at: string | null;
  source: string;
  lang: string;
  sentiment: "positive" | "negative" | "neutral" | null;
  full_text?: string | null;
}

export interface NewsData {
  ticker: string;
  articles: NewsArticle[];
  total: number;
  overall_sentiment: string | null;
}

export type Period = "1mo" | "3mo" | "6mo" | "1y" | "2y";
export type ChartType = "line" | "candle";
