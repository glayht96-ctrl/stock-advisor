import { useState } from "react";

const BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface BacktestResult {
  ticker: string;
  buy_date: string;
  sell_date: string;
  buy_price: number;
  sell_price: number;
  investment: number;
  shares: number;
  profit_loss: number;
  profit_loss_pct: number;
  period_days: number;
  annualized_return: number;
}

interface Props {
  ticker: string;
  currency: string;
}

export function BacktestPanel({ ticker, currency }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [buyDate, setBuyDate]   = useState("2024-01-01");
  const [sellDate, setSellDate] = useState(today);
  const [amount, setAmount]     = useState("10000");
  const [result, setResult]     = useState<BacktestResult | null>(null);
  const [comment, setComment]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const sym = currency === "JPY" ? "¥" : "$";

  const runBacktest = async () => {
    setError(null);
    setResult(null);
    setComment("");
    setLoading(true);
    try {
      const params = new URLSearchParams({
        buy_date: buyDate,
        sell_date: sellDate,
        amount,
      });
      const res = await fetch(`${BASE_URL}/backtest/${ticker}?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data: BacktestResult = await res.json();
      setResult(data);
      fetchComment(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchComment = async (r: BacktestResult) => {
    setCommentLoading(true);
    setComment("");
    try {
      const params = new URLSearchParams({
        buy_date: r.buy_date,
        sell_date: r.sell_date,
        profit_loss_pct: String(r.profit_loss_pct),
      });
      const res = await fetch(`${BASE_URL}/backtest/${ticker}/comment?${params}`);
      if (!res.ok) return;

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") { setCommentLoading(false); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) setComment(prev => prev + parsed.text);
          } catch {}
        }
      }
    } catch {
      // silently fail
    } finally {
      setCommentLoading(false);
    }
  };

  const pctColor = (v: number) => v >= 0 ? "text-emerald-400" : "text-red-400";
  const sign = (v: number) => v >= 0 ? "+" : "";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">バックテスト</h2>

      {/* フォーム */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">購入日</label>
          <input type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">売却日</label>
          <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">投資金額 ({sym})</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1"
            className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600" />
        </div>
        <button onClick={runBacktest} disabled={loading}
          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-5 py-1.5 rounded-lg transition-colors font-medium">
          {loading ? "計算中..." : "計算"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">⚠️ {error}</p>}

      {/* 結果カード */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">損益額</p>
              <p className={`text-lg font-bold font-mono ${pctColor(result.profit_loss)}`}>
                {sign(result.profit_loss)}{sym}{Math.abs(result.profit_loss).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">投資額: {sym}{result.investment.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">損益率</p>
              <p className={`text-lg font-bold font-mono ${pctColor(result.profit_loss_pct)}`}>
                {sign(result.profit_loss_pct)}{result.profit_loss_pct.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{result.period_days}日間</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">年率換算</p>
              <p className={`text-lg font-bold font-mono ${pctColor(result.annualized_return)}`}>
                {sign(result.annualized_return)}{result.annualized_return.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-600 mt-0.5">年率リターン</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>購入: {result.buy_date} @ {sym}{result.buy_price.toLocaleString()}</span>
            <span>売却: {result.sell_date} @ {sym}{result.sell_price.toLocaleString()}</span>
            <span>保有株数: {result.shares.toFixed(4)}</span>
          </div>

          {/* Gemini コメント */}
          {(comment || commentLoading) && (
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs font-semibold text-gray-400 mb-2">AI 相場振り返り</p>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {comment}
                {commentLoading && <span className="inline-block w-1 h-3 bg-violet-400 ml-0.5 animate-pulse" />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
