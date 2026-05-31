import { useState } from "react";

interface CompareItem {
  ticker: string;
  name: string;
  currency: string;
  current_price: number | null;
  change_pct: number | null;
  rsi_14: number | null;
  macd_histogram: number | null;
  sma_20: number | null;
  sma_50: number | null;
  market_cap: number | null;
}

interface Props {
  onNavigate: (ticker: string) => void;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

function rsiColor(v: number | null) {
  if (!v) return "text-gray-500";
  if (v >= 70) return "text-red-400";
  if (v <= 30) return "text-blue-400";
  return "text-gray-300";
}

function macdColor(v: number | null) {
  if (!v) return "text-gray-500";
  return v > 0 ? "text-emerald-400" : "text-red-400";
}

function fmtCap(n: number | null, currency: string) {
  if (!n) return "—";
  return currency === "JPY" ? `¥${(n / 1e8).toFixed(0)}億` : `$${(n / 1e9).toFixed(1)}B`;
}

const DEFAULT_TICKERS = "AAPL,NVDA,TSLA";

export function ComparePanel({ onNavigate }: Props) {
  const [input, setInput] = useState(DEFAULT_TICKERS);
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const tickers = input.trim();
    if (!tickers) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/compare/?tickers=${encodeURIComponent(tickers)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">⚖️ 銘柄比較</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="カンマ区切り例: AAPL,NVDA,7203.T"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={run}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "..." : "比較"}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-3">⚠️ {error}</p>}

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                <th className="text-left py-2 pr-4">銘柄</th>
                <th className="text-right py-2 px-3">現在値</th>
                <th className="text-right py-2 px-3">前日比</th>
                <th className="text-right py-2 px-3">RSI</th>
                <th className="text-right py-2 px-3">MACD</th>
                <th className="text-right py-2 px-3">SMA20比</th>
                <th className="text-right py-2 pl-3">時価総額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {items.map((item) => {
                const sym = item.currency === "JPY" ? "¥" : "$";
                const sma20diff = item.current_price && item.sma_20
                  ? ((item.current_price - item.sma_20) / item.sma_20 * 100)
                  : null;
                return (
                  <tr
                    key={item.ticker}
                    onClick={() => onNavigate(item.ticker)}
                    className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-white">{item.ticker}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]">{item.name}</div>
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-white">
                      {item.current_price ? `${sym}${item.current_price.toLocaleString()}` : "—"}
                    </td>
                    <td className={`text-right py-3 px-3 font-medium ${(item.change_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {item.change_pct !== null ? `${item.change_pct >= 0 ? "+" : ""}${item.change_pct.toFixed(2)}%` : "—"}
                    </td>
                    <td className={`text-right py-3 px-3 font-mono ${rsiColor(item.rsi_14)}`}>
                      {item.rsi_14?.toFixed(1) ?? "—"}
                    </td>
                    <td className={`text-right py-3 px-3 font-mono ${macdColor(item.macd_histogram)}`}>
                      {item.macd_histogram !== null ? (item.macd_histogram >= 0 ? "+" : "") + item.macd_histogram.toFixed(2) : "—"}
                    </td>
                    <td className={`text-right py-3 px-3 font-mono text-xs ${sma20diff !== null ? (sma20diff >= 0 ? "text-emerald-400" : "text-red-400") : "text-gray-500"}`}>
                      {sma20diff !== null ? `${sma20diff >= 0 ? "+" : ""}${sma20diff.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-3 pl-3 text-gray-400">
                      {fmtCap(item.market_cap, item.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-700 mt-2">行をクリックで詳細分析へ</p>
        </div>
      )}
    </div>
  );
}
