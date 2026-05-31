import { useState, useRef, useEffect, type FormEvent } from "react";
import { useSearchHistory } from "../hooks/useSearchHistory";

interface Props {
  onSearch: (ticker: string) => void;
  loading?: boolean;
}

const PRESETS = [
  { label: "トヨタ",      ticker: "7203.T" },
  { label: "ソフトバンクG", ticker: "9984.T" },
  { label: "Apple",      ticker: "AAPL"   },
  { label: "NVIDIA",     ticker: "NVDA"   },
  { label: "Sony",       ticker: "6758.T" },
  { label: "Tesla",      ticker: "TSLA"   },
];

export function SearchBar({ onSearch, loading }: Props) {
  const [value, setValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const { history, add, clear } = useSearchHistory();
  const ref = useRef<HTMLDivElement>(null);

  // 外クリックでドロップダウンを閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowHistory(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    add(t);
    setShowHistory(false);
    setValue("");
    onSearch(t);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch(value);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div ref={ref} className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => history.length > 0 && setShowHistory(true)}
              placeholder="銘柄コード　例: 7203.T　AAPL"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
            {value && (
              <button type="button" onClick={() => setValue("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-lg">×</button>
            )}
          </div>
          <button type="submit" disabled={loading || !value.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 text-black font-bold px-5 py-3 rounded-xl transition-colors text-sm">
            {loading ? "..." : "分析"}
          </button>
        </form>

        {/* 検索履歴ドロップダウン */}
        {showHistory && history.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
              <span className="text-xs text-gray-500">最近の検索</span>
              <button onClick={clear} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">クリア</button>
            </div>
            {history.map((ticker) => (
              <button key={ticker} onClick={() => handleSearch(ticker)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2">
                <span className="text-gray-600 text-xs">🕐</span>
                {ticker}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* プリセット */}
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {PRESETS.map((p) => (
          <button key={p.ticker} onClick={() => handleSearch(p.ticker)}
            className="text-xs text-gray-400 border border-gray-700 hover:border-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg transition-colors">
            {p.label} <span className="text-gray-600">{p.ticker}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
