import { useState, useEffect } from "react";

const KEY = "stock-advisor-watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const add = (ticker: string) => {
    setWatchlist((prev) =>
      prev.includes(ticker) ? prev : [...prev, ticker].slice(0, 10)
    );
  };

  const remove = (ticker: string) => {
    setWatchlist((prev) => prev.filter((t) => t !== ticker));
  };

  const toggle = (ticker: string) => {
    watchlist.includes(ticker) ? remove(ticker) : add(ticker);
  };

  const has = (ticker: string) => watchlist.includes(ticker);

  return { watchlist, add, remove, toggle, has };
}
