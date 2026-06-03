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

export interface CrossEvent {
  date: string;
  type: "GC" | "DC";
  from_line: string;
  to_line: string;
}

export interface VolumeSpikeDay {
  date: string;
  volume: number;
  ratio: number;
}

export interface PricePatterns {
  trend_5d: "up" | "down" | "flat" | null;
  trend_20d: "up" | "down" | "flat" | null;
  trend_60d: "up" | "down" | "flat" | null;
  return_5d: number | null;
  return_20d: number | null;
  return_60d: number | null;
  new_high_20d: boolean;
  new_low_20d: boolean;
  golden_crosses: CrossEvent[];
  dead_crosses: CrossEvent[];
  volume_spikes: VolumeSpikeDay[];
  bb_squeeze: boolean;
  bb_bandwidth_pct: number | null;
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
  price_patterns: PricePatterns | null;
}

export type Period   = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y";
export type Interval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo";
export type ChartType = "line" | "candle";
