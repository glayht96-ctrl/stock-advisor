import type { StockData, NewsData, Period } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchStock(
  ticker: string,
  period: Period = "1y",
  interval: string = "1d"
): Promise<StockData> {
  const res = await fetch(
    `${BASE_URL}/stock/${ticker}?period=${period}&interval=${interval}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchNews(
  ticker: string,
  limit: number = 20
): Promise<NewsData> {
  const res = await fetch(`${BASE_URL}/news/${ticker}?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
