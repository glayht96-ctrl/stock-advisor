import { useState, useEffect, useCallback } from "react";
import { fetchNews } from "../lib/api";
import type { NewsData } from "../types";

export function useNews(ticker: string | null) {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNews(ticker);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
