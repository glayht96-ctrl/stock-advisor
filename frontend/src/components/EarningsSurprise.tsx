import { useState, useEffect } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface Quarter {
  period: string;
  date: string;
  eps_actual: number | null;
  eps_estimate: number | null;
  surprise_pct: number | null;
}

interface SurpriseData {
  ticker: string;
  quarters: Quarter[];
  consecutive_beats: number;
}

interface Props { ticker: string }

function Sk({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-800 rounded animate-pulse ${className}`} />;
}

const SurpriseTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Quarter;
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs space-y-1">
      <p className="text-gray-400 font-mono">{d.period}</p>
      {d.eps_estimate != null && <p className="text-gray-300">予想EPS: <span className="font-mono">{d.eps_estimate}</span></p>}
      {d.eps_actual   != null && <p className="text-emerald-400">実績EPS: <span className="font-mono font-bold">{d.eps_actual}</span></p>}
      {d.surprise_pct != null && (
        <p className={d.surprise_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
          サプライズ: {d.surprise_pct >= 0 ? "+" : ""}{d.surprise_pct.toFixed(1)}%
        </p>
      )}
    </div>
  );
};

export function EarningsSurprise({ ticker }: Props) {
  const [data,      setData]      = useState<SurpriseData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [showAI,    setShowAI]    = useState(false);
  const [aiText,    setAiText]    = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/earnings/surprise/${ticker}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticker]);

  const startAIStream = async () => {
    if (aiLoading) return;
    setShowAI(true);
    setAiText("");
    setAiLoading(true);
    try {
      const resp = await fetch(`${BASE_URL}/earnings/surprise/${ticker}/stream`);
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
            if (d === "[DONE]") break;
            try { const p = JSON.parse(d); if (p.text) setAiText(t => t + p.text); } catch {}
          }
        }
      }
    } catch {}
    setAiLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <Sk className="h-4 w-32 mb-4" />
        <Sk className="h-40 w-full" />
      </div>
    );
  }

  if (!data || !data.quarters.length) return null;

  const chartData = data.quarters.map(q => ({
    ...q,
    label: q.period.slice(0, 7),
  }));

  const hasSurprise = chartData.some(q => q.surprise_pct != null);
  const hasEstimate = chartData.some(q => q.eps_estimate != null);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            📊 決算サプライズ
          </h2>
          {data.consecutive_beats > 1 && (
            <span className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
              {data.consecutive_beats}連続 Beat
            </span>
          )}
        </div>
        <button
          onClick={startAIStream}
          disabled={aiLoading}
          className="text-xs bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 border border-purple-800 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {aiLoading ? "分析中..." : "AI解説"}
        </button>
      </div>

      {/* EPS チャート */}
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 9 }} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 9 }} width={40} />
          <Tooltip content={<SurpriseTooltip />} />
          <ReferenceLine y={0} stroke="#374151" />
          {hasEstimate && (
            <Bar dataKey="eps_estimate" name="予想EPS" fill="#374151" maxBarSize={16} isAnimationActive={false} />
          )}
          <Bar dataKey="eps_actual" name="実績EPS" maxBarSize={16} isAnimationActive={false}>
            {chartData.map((q, i) => (
              <Cell key={i} fill={
                q.surprise_pct == null ? "#10b981" :
                q.surprise_pct >= 0    ? "#10b981" : "#f87171"
              } />
            ))}
          </Bar>
          {hasSurprise && (
            <Line type="monotone" dataKey="surprise_pct" name="サプライズ%" stroke="#fbbf24"
              strokeWidth={1.5} dot={{ r: 3 }} connectNulls yAxisId={1}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* サプライズ率バッジ列 */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {chartData.slice(-6).map((q, i) => (
          q.surprise_pct != null && (
            <span key={i} className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              q.surprise_pct >= 0
                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                : "bg-red-950 text-red-400 border-red-800"
            }`}>
              {q.label} {q.surprise_pct >= 0 ? "+" : ""}{q.surprise_pct.toFixed(1)}%
            </span>
          )
        ))}
      </div>

      {/* AI解説 */}
      {showAI && (
        <div className="mt-3 bg-gray-800 rounded-lg p-3 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {aiText || (aiLoading ? <span className="animate-pulse">解説を生成中...</span> : "")}
        </div>
      )}
    </div>
  );
}
