import { useEffect } from "react";
import { fetchStock } from "../lib/api";
import { useWatchlist } from "./useWatchlist";
import type { StockData } from "../types";

// モジュールレベルキャッシュ（全コンポーネント間で共有）
const _cache = new Map<string, StockData>();
const _inProgress = new Set<string>();

/** プリフェッチ済みデータを取得（なければ undefined） */
export function getPrefetchedStock(ticker: string): StockData | undefined {
  return _cache.get(ticker);
}

/** ウォッチリスト銘柄をバックグラウンドでプリフェッチするフック */
export function usePrefetch(): void {
  const { watchlist } = useWatchlist();

  useEffect(() => {
    watchlist.forEach((ticker) => {
      if (_cache.has(ticker) || _inProgress.has(ticker)) return;
      _inProgress.add(ticker);
      fetchStock(ticker, "1y")
        .then((data) => { _cache.set(ticker, data); })
        .catch(() => {})
        .finally(() => { _inProgress.delete(ticker); });
    });
  }, [watchlist]);
}
