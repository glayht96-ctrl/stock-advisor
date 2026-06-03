import { useState, useEffect, useCallback } from "react";
import { fetchStock } from "../lib/api";
import { getPrefetchedStock } from "./usePrefetch";
import type { StockData, Period } from "../types";

export function useStock(ticker: string | null, period: Period = "1y") {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!ticker) return;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const result = await fetchStock(ticker, period);
      setData(result);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ticker, period]);

  useEffect(() => {
    if (!ticker) {
      setData(null); setLoading(false); setError(null);
      return;
    }
    // プリフェッチキャッシュがあれば即表示（1y のみ対象）
    const prefetched = period === "1y" ? getPrefetchedStock(ticker) : null;
    if (prefetched) {
      setData(prefetched);
      setLoading(false);
      setError(null);
      load(true); // バックグラウンドで最新データを取得
    } else {
      load(false);
    }
  }, [ticker, period, load]);

  const refetch = useCallback(() => load(false), [load]);
  return { data, loading, error, refetch };
}
