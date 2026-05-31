import { useState, useEffect, useCallback } from "react";
import { fetchStock } from "../lib/api";
import type { StockData, Period } from "../types";

export function useStock(ticker: string | null, period: Period = "1y") {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStock(ticker, period);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [ticker, period]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
