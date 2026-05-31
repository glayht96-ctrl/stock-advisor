import { useState, useEffect } from "react";

const KEY = "stock-advisor-history";
const MAX = 8;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(history));
  }, [history]);

  const add = (ticker: string) => {
    setHistory((prev) => [ticker, ...prev.filter((t) => t !== ticker)].slice(0, MAX));
  };

  const clear = () => setHistory([]);

  return { history, add, clear };
}
