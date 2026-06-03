import { useState } from "react";

const KEY = "stock-advisor-memos";

type Memos = Record<string, string>;  // ticker → memo text

function load(): Memos {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

function save(memos: Memos) {
  localStorage.setItem(KEY, JSON.stringify(memos));
}

export function useStockMemos() {
  const [memos, setMemos] = useState<Memos>(load);

  const getMemo = (ticker: string) => memos[ticker] ?? "";

  const setMemo = (ticker: string, text: string) => {
    setMemos(prev => {
      const next = { ...prev };
      if (text.trim()) {
        next[ticker] = text;
      } else {
        delete next[ticker];
      }
      save(next);
      return next;
    });
  };

  const hasMemo = (ticker: string) => !!memos[ticker]?.trim();

  const tickersWithMemos = Object.keys(memos).filter(t => memos[t]?.trim());

  return { getMemo, setMemo, hasMemo, tickersWithMemos };
}
