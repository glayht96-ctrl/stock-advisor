import { useState, useEffect } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface ShortData {
  ticker: string;
  short_ratio: number | null;
  short_percent_of_float: number | null;
  shares_short: number | null;
  shares_short_prior_month: number | null;
  mom_change_pct: number | null;
  label: "高" | "中" | "低";
}

interface Props { ticker: string }

function Gauge({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 30); // 30%以上はMAX表示
  const width   = Math.round((clamped / 30) * 100);
  const color   = pct > 10 ? "#f87171" : pct > 5 ? "#fbbf24" : "#10b981";
  return (
    <div className="relative h-2.5 bg-gray-800 rounded-full overflow-hidden w-full">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Sk({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-800 rounded animate-pulse ${className}`} />;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ShortPanel({ ticker }: Props) {
  const [data,    setData]    = useState<ShortData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/short/${ticker}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <Sk className="h-4 w-32 mb-3" />
        <div className="space-y-2">{[1,2,3].map(i=><Sk key={i} className="h-5"/>)}</div>
      </div>
    );
  }

  if (!data) return null;

  const labelColor = data.label === "高" ? "text-red-400 bg-red-950 border-red-800"
                   : data.label === "中" ? "text-amber-400 bg-amber-950 border-amber-800"
                   : "text-emerald-400 bg-emerald-950 border-emerald-800";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          📉 空売り残高
        </h2>
        {data.label && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${labelColor}`}>
            空売り {data.label}
          </span>
        )}
      </div>

      {/* ゲージ */}
      {data.short_percent_of_float != null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">空売り比率（浮動株比）</span>
            <span className={`font-mono font-bold ${
              data.short_percent_of_float > 10 ? "text-red-400" :
              data.short_percent_of_float > 5  ? "text-amber-400" : "text-emerald-400"
            }`}>{data.short_percent_of_float.toFixed(1)}%</span>
          </div>
          <Gauge pct={data.short_percent_of_float} />
          <div className="flex justify-between text-[9px] text-gray-700 mt-0.5">
            <span>0%</span><span>低 5%</span><span>中 10%</span><span>高 30%+</span>
          </div>
        </div>
      )}

      {/* メトリクス */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 rounded-lg p-2">
          <p className="text-gray-500">売り日数（Days to Cover）</p>
          <p className="text-gray-200 font-mono font-bold mt-0.5">
            {data.short_ratio != null ? `${data.short_ratio}日` : "—"}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <p className="text-gray-500">空売り株数</p>
          <p className="text-gray-200 font-mono font-bold mt-0.5">{fmt(data.shares_short)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <p className="text-gray-500">前月株数</p>
          <p className="text-gray-200 font-mono mt-0.5">{fmt(data.shares_short_prior_month)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <p className="text-gray-500">前月比</p>
          <p className={`font-mono font-bold mt-0.5 ${
            data.mom_change_pct == null ? "text-gray-400" :
            data.mom_change_pct > 0    ? "text-red-400" : "text-emerald-400"
          }`}>
            {data.mom_change_pct != null
              ? `${data.mom_change_pct > 0 ? "+" : ""}${data.mom_change_pct}%`
              : "—"}
          </p>
        </div>
      </div>

      {data.label === "高" && (
        <p className="mt-2 text-xs text-red-400 bg-red-950/50 border border-red-900/50 rounded-lg px-3 py-1.5">
          ⚠️ ショート注意：空売り比率が高く、ショートスクイーズのリスクがあります
        </p>
      )}
    </div>
  );
}
