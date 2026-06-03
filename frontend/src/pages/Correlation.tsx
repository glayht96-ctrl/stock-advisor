import { useState, useRef } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface CorrMatrix { [t1: string]: { [t2: string]: number | null } }
interface CorrPair   { t1: string; t2: string; corr: number }

interface CorrResult {
  tickers: string[];
  matrix: CorrMatrix;
  top_positive: CorrPair[];
  top_negative: CorrPair[];
}

interface Props {
  onNavigate: (ticker: string) => void;
  onBack: () => void;
}

const PRESETS = [
  { label: "GAFAM",       tickers: ["AAPL","MSFT","GOOGL","AMZN","META"] },
  { label: "AI半導体",    tickers: ["NVDA","AMD","TSM","INTC","AVGO"] },
  { label: "日米自動車",  tickers: ["7203.T","7267.T","7201.T","F","GM"] },
  { label: "日米銀行",    tickers: ["8306.T","8411.T","JPM","BAC","GS"] },
];

const PERIODS = [
  { label: "1ヶ月", value: "1mo" },
  { label: "3ヶ月", value: "3mo" },
  { label: "6ヶ月", value: "6mo" },
  { label: "1年",   value: "1y"  },
];

function corrColor(v: number | null, isSelf: boolean): string {
  if (isSelf) return "#1f2937";  // 自己相関は暗め
  if (v == null) return "#111827";
  const h = v > 0 ? 142 : 0;
  const s = Math.abs(v) * 65 + 10;
  const l = 12 + (1 - Math.abs(v)) * 22;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function corrTextColor(v: number | null): string {
  if (v == null) return "#6b7280";
  return Math.abs(v) > 0.5 ? "#f9fafb" : "#9ca3af";
}

async function* readSSE(url: string, body: string) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!resp.ok) return;
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const d = line.slice(6);
        if (d === "[DONE]") return;
        try { const p = JSON.parse(d); if (p.text) yield p.text as string; } catch {}
      }
    }
  }
}

export function Correlation({ onNavigate, onBack }: Props) {
  const [inputText,  setInputText]  = useState("AAPL,NVDA,MSFT,7203.T");
  const [period,     setPeriod]     = useState("1y");
  const [result,     setResult]     = useState<CorrResult | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [aiText,     setAiText]     = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const abortRef = useRef<AbortController>();

  const parseTickers = () =>
    inputText.split(/[,\s\n]+/).map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 8);

  const doCorrelate = async () => {
    const tickers = parseTickers();
    if (tickers.length < 2) { setError("2銘柄以上入力してください"); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    setAiText("");
    try {
      const resp = await fetch(`${BASE_URL}/correlate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers, period }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${resp.status}`);
      }
      setResult(await resp.json());
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message || "相関計算に失敗しました");
    }
    setLoading(false);
  };

  const doAIAnalysis = async () => {
    if (!result || aiLoading) return;
    setAiLoading(true);
    setAiText("");
    try {
      const body = JSON.stringify({ tickers: result.tickers, period });
      for await (const chunk of readSSE(`${BASE_URL}/correlate/analyze`, body)) {
        setAiText(t => t + chunk);
      }
    } catch {}
    setAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm shrink-0">
            ← 戻る
          </button>
          <h1 className="font-bold text-white">🔗 銘柄相関分析</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 入力エリア */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium">銘柄コード（カンマ区切り、最大8つ）</label>
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    period === p.value ? "bg-emerald-500 text-black font-bold" : "text-gray-500 hover:text-gray-300"
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doCorrelate()}
              placeholder="AAPL, NVDA, 7203.T ..."
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
            />
            <button
              onClick={doCorrelate}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "計算中..." : "計算"}
            </button>
          </div>
          {/* プリセット */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {PRESETS.map(p => (
              <button key={p.label}
                onClick={() => { setInputText(p.tickers.join(",")); }}
                className="text-xs text-gray-500 border border-gray-700 hover:border-emerald-700 hover:text-emerald-400 px-2 py-1 rounded transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {result && (
          <>
            {/* ヒートマップ */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">相関係数ヒートマップ</h2>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span className="w-3 h-3 rounded" style={{background: "hsl(142, 65%, 20%)"}} />
                  <span>正相関</span>
                  <span className="w-3 h-3 rounded bg-gray-700" />
                  <span>無相関</span>
                  <span className="w-3 h-3 rounded" style={{background: "hsl(0, 65%, 20%)"}} />
                  <span>逆相関</span>
                </div>
              </div>
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="w-20 p-1 text-gray-600" />
                    {result.tickers.map(t => (
                      <th key={t} className="p-1 text-gray-400 font-mono text-[10px] text-center w-16">
                        {t.replace(".T", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.tickers.map(t1 => (
                    <tr key={t1}>
                      <td className="p-1 text-gray-400 font-mono text-[10px] text-right pr-2">
                        {t1.replace(".T", "")}
                      </td>
                      {result.tickers.map(t2 => {
                        const v = result.matrix[t1]?.[t2] ?? null;
                        const isSelf = t1 === t2;
                        return (
                          <td key={t2}
                            style={{
                              backgroundColor: corrColor(v, isSelf),
                              color: corrTextColor(v),
                            }}
                            className="p-1 text-center w-16 h-10 rounded-sm font-mono text-[10px] font-bold"
                          >
                            {isSelf ? "—" : v != null ? v.toFixed(2) : "N/A"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 上位ペア */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 border border-emerald-900/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-emerald-400 mb-2">🔗 一緒に動く銘柄</h3>
                {result.top_positive.length === 0
                  ? <p className="text-xs text-gray-600">データなし</p>
                  : result.top_positive.map((p, i) => (
                    <div key={i} className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <button onClick={() => onNavigate(p.t1)} className="text-emerald-400 hover:underline font-mono">{p.t1}</button>
                        <span className="text-gray-600">×</span>
                        <button onClick={() => onNavigate(p.t2)} className="text-emerald-400 hover:underline font-mono">{p.t2}</button>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-300">r={p.corr.toFixed(3)}</span>
                    </div>
                  ))
                }
              </div>
              <div className="bg-gray-900 border border-red-900/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-red-400 mb-2">↔ 逆に動く銘柄</h3>
                {result.top_negative.length === 0
                  ? <p className="text-xs text-gray-600">データなし</p>
                  : result.top_negative.map((p, i) => (
                    <div key={i} className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <button onClick={() => onNavigate(p.t1)} className="text-red-400 hover:underline font-mono">{p.t1}</button>
                        <span className="text-gray-600">×</span>
                        <button onClick={() => onNavigate(p.t2)} className="text-red-400 hover:underline font-mono">{p.t2}</button>
                      </div>
                      <span className="text-xs font-mono font-bold text-red-300">r={p.corr.toFixed(3)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* AI解説 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">AI 相関解説</h2>
                <button
                  onClick={doAIAnalysis}
                  disabled={aiLoading}
                  className="text-xs bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 border border-purple-800 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  {aiLoading ? "分析中..." : aiText ? "再生成" : "AIで解説"}
                </button>
              </div>
              {aiText ? (
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {aiText}
                  {aiLoading && <span className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-0.5 align-middle" />}
                </div>
              ) : aiLoading ? (
                <p className="text-xs text-gray-500 animate-pulse">相関関係を分析中...</p>
              ) : (
                <p className="text-xs text-gray-600">「AIで解説」ボタンを押すと Gemini が相関関係を分析します</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
