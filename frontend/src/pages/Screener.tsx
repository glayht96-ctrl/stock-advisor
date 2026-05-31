import { useState, useRef } from "react";

const BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

type Operator  = "gt" | "lt" | "gte" | "lte";
type Indicator = "rsi" | "macd_hist" | "price" | "sma20" | "sma50" | "sma200" | "price_vs_sma50";
type MarketTab = "all" | "US" | "JP";

interface Condition {
  indicator: Indicator;
  operator: Operator;
  value: number;
}

interface ScreenResult {
  ticker: string;
  name: string;
  current_price: number | null;
  change_pct: number | null;
  currency: string;
  sector: string;
  market: string;
  rsi: number | null;
  macd_hist: number | null;
  sma20: number | null;
  sma50: number | null;
}

const INDICATOR_LABELS: Record<Indicator, string> = {
  rsi:            "RSI",
  macd_hist:      "MACDヒスト",
  price:          "株価",
  sma20:          "SMA20",
  sma50:          "SMA50",
  sma200:         "SMA200",
  price_vs_sma50: "株価 vs SMA50差",
};

const OPERATOR_LABELS: Record<Operator, string> = {
  gt:  "> 超過",
  lt:  "< 未満",
  gte: "≥ 以上",
  lte: "≤ 以下",
};

const PRESETS: { label: string; desc: string; conditions: Condition[] }[] = [
  {
    label: "売られすぎ",
    desc: "RSI ≤ 30",
    conditions: [{ indicator: "rsi", operator: "lte", value: 30 }],
  },
  {
    label: "強気転換",
    desc: "MACDヒスト > 0",
    conditions: [{ indicator: "macd_hist", operator: "gt", value: 0 }],
  },
  {
    label: "上昇トレンド",
    desc: "株価 > SMA50",
    conditions: [{ indicator: "price_vs_sma50", operator: "gt", value: 0 }],
  },
  {
    label: "買われすぎ",
    desc: "RSI ≥ 70",
    conditions: [{ indicator: "rsi", operator: "gte", value: 70 }],
  },
];

interface Props {
  onNavigate: (ticker: string) => void;
  onBack: () => void;
}

export function Screener({ onNavigate, onBack }: Props) {
  const [conditions, setConditions] = useState<Condition[]>([
    { indicator: "rsi", operator: "lte", value: 30 },
  ]);
  const [results,        setResults]        = useState<ScreenResult[] | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [marketTab,      setMarketTab]      = useState<MarketTab>("all");
  const [analysis,       setAnalysis]       = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  const addCondition = () =>
    setConditions(prev => [...prev, { indicator: "rsi", operator: "lte", value: 30 }]);

  const removeCondition = (i: number) =>
    setConditions(prev => prev.filter((_, idx) => idx !== i));

  const updateCondition = <K extends keyof Condition>(i: number, field: K, val: Condition[K]) =>
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const applyPreset = (p: typeof PRESETS[number]) => setConditions(p.conditions);

  const runAnalyze = async () => {
    if (!results || results.length === 0) return;
    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    setAnalysis("");
    setAnalyzeLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/screen/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions, results }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") { setAnalyzeLoading(false); return; }
          try { const p = JSON.parse(data); if (p.text) setAnalysis(a => a + p.text); } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setAnalysis("解説エラー: " + e.message);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const runScreen = async () => {
    if (!conditions.length) { setError("条件を1つ以上設定してください"); return; }
    setError(null);
    setResults(null);
    setAnalysis("");
    setAnalyzeLoading(false);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/screen/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults(data.results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pctColor = (v: number | null) =>
    v === null ? "text-gray-500" : v >= 0 ? "text-emerald-400" : "text-red-400";

  const filtered = results
    ? marketTab === "all" ? results : results.filter(r => r.market === marketTab)
    : null;

  const usCount = results?.filter(r => r.market === "US").length ?? 0;
  const jpCount = results?.filter(r => r.market === "JP").length ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm shrink-0">
            ← 戻る
          </button>
          <h1 className="font-bold text-white text-lg">銘柄スクリーナー</h1>
          <span className="text-xs text-gray-600 ml-1">日米100銘柄対象</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* プリセット */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">プリセット</h2>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-700 text-gray-300 hover:text-emerald-300 px-4 py-2 rounded-lg text-sm transition-colors">
                {p.label}
                <span className="text-gray-600 ml-1.5 text-xs">({p.desc})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 条件ビルダー */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">スクリーニング条件</h2>
          <div className="space-y-2 mb-4">
            {conditions.map((cond, i) => (
              <div key={i} className="flex gap-2 items-center flex-wrap">
                <select
                  value={cond.indicator}
                  onChange={e => updateCondition(i, "indicator", e.target.value as Indicator)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
                >
                  {Object.entries(INDICATOR_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  value={cond.operator}
                  onChange={e => updateCondition(i, "operator", e.target.value as Operator)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
                >
                  {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={cond.value}
                  onChange={e => updateCondition(i, "value", Number(e.target.value))}
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
                />
                {conditions.length > 1 && (
                  <button onClick={() => removeCondition(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none px-1">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={addCondition}
              className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors">
              + 条件を追加
            </button>
            <button onClick={runScreen} disabled={loading}
              className="ml-auto bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-6 py-2 rounded-lg transition-colors font-medium flex items-center gap-2">
              {loading && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? "スクリーニング中 (100銘柄)..." : "スクリーニング実行"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">⚠️ {error}</p>}
        </div>

        {/* 結果テーブル */}
        {filtered !== null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            {/* ヘッダー & 市場タブ */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  結果
                </h2>
                <span className="bg-emerald-900/60 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {filtered.length} 銘柄ヒット
                </span>
                {results && results.length !== filtered.length && (
                  <span className="text-xs text-gray-600">（全{results.length}件中）</span>
                )}
              </div>
              {results && results.length > 0 && (
                <div className="flex gap-1">
                  {(["all", "US", "JP"] as MarketTab[]).map(m => {
                    const count = m === "all" ? results.length : m === "US" ? usCount : jpCount;
                    return (
                      <button key={m} onClick={() => setMarketTab(m)}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors font-medium ${
                          marketTab === m
                            ? "bg-gray-700 text-white"
                            : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                        }`}>
                        {m === "all" ? "全銘柄" : m} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <p className="text-gray-600 text-sm">
                {results?.length === 0
                  ? "条件に合致する銘柄が見つかりませんでした。"
                  : "この市場フィルターでは結果がありません。"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                      <th className="pb-2 pr-3">銘柄</th>
                      <th className="pb-2 pr-3">セクター</th>
                      <th className="pb-2 pr-3 text-right">現在値</th>
                      <th className="pb-2 pr-3 text-right">前日比</th>
                      <th className="pb-2 pr-3 text-right">RSI</th>
                      <th className="pb-2 pr-3 text-right">MACD hist</th>
                      <th className="pb-2 text-right">SMA50</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const sym = r.currency === "JPY" ? "¥" : "$";
                      return (
                        <tr key={r.ticker}
                          onClick={() => onNavigate(r.ticker)}
                          className="border-b border-gray-800/50 hover:bg-gray-800/60 cursor-pointer transition-colors">
                          <td className="py-2 pr-3">
                            <p className="font-bold text-white">{r.ticker}</p>
                            <p className="text-xs text-gray-500 truncate max-w-28">{r.name}</p>
                          </td>
                          <td className="py-2 pr-3">
                            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                              {r.sector}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-gray-200">
                            {r.current_price !== null ? `${sym}${r.current_price.toLocaleString()}` : "-"}
                          </td>
                          <td className={`py-2 pr-3 text-right font-medium ${pctColor(r.change_pct)}`}>
                            {r.change_pct !== null ? `${r.change_pct >= 0 ? "+" : ""}${r.change_pct.toFixed(2)}%` : "-"}
                          </td>
                          <td className={`py-2 pr-3 text-right font-mono ${
                            r.rsi !== null && r.rsi <= 30 ? "text-emerald-400 font-bold" :
                            r.rsi !== null && r.rsi >= 70 ? "text-red-400 font-bold" : "text-gray-300"
                          }`}>
                            {r.rsi?.toFixed(1) ?? "-"}
                          </td>
                          <td className={`py-2 pr-3 text-right font-mono ${
                            r.macd_hist !== null && r.macd_hist > 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {r.macd_hist?.toFixed(3) ?? "-"}
                          </td>
                          <td className="py-2 text-right font-mono text-gray-400">
                            {r.sma50 !== null ? `${sym}${r.sma50.toLocaleString()}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* AI解説エリア */}
            {results && results.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs text-gray-500">
                    ヒット{results.length}銘柄の横断AI解説
                  </p>
                  <button
                    onClick={runAnalyze}
                    disabled={analyzeLoading}
                    className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    {analyzeLoading && (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {analyzeLoading ? "解説中..." : "🤖 AI解説"}
                  </button>
                </div>
                {(analysis || analyzeLoading) && (
                  <div className="mt-3 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-800/60 rounded-lg p-3">
                    {analysis}
                    {analyzeLoading && (
                      <span className="inline-block w-1 h-3 bg-violet-400 ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
