import { useState, useEffect } from "react";

const KEY = "stock-advisor-history-v2";
const MAX = 10;

export interface HistoryEntry {
  ticker:  string;
  name_ja: string;
  name_en: string;
  market:  string;
  sector:  string;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // 旧フォーマット（string[]）との互換性
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed.map((t: string) => ({
          ticker: t, name_ja: t, name_en: t, market: "", sector: ""
        }));
      }
      return parsed;
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(history));
  }, [history]);

  const add = (input: string | HistoryEntry) => {
    const entry: HistoryEntry = typeof input === "string"
      ? { ticker: input, name_ja: input, name_en: input, market: "", sector: "" }
      : input;
    setHistory(prev => [
      entry,
      ...prev.filter(e => e.ticker !== entry.ticker)
    ].slice(0, MAX));
  };

  const clear = () => setHistory([]);

  return { history, add, clear };
}
