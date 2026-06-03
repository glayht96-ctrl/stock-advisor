import { useState, useEffect } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface HeatStock {
  ticker:     string;
  name:       string;
  change_pct: number | null;
  market_cap: number | null;
}

interface HeatSector {
  sector:         string;
  market:         string;
  avg_change_pct: number;
  stocks:         HeatStock[];
}

interface Props {
  onNavigate: (ticker: string) => void;
  onBack: () => void;
}

type MarketFilter = "all" | "JP" | "US";

function changeToBg(pct: number | null): string {
  if (pct === null) return "bg-gray-800";
  if (pct >=  3.0)  return "bg-emerald-700";
  if (pct >=  1.5)  return "bg-emerald-800";
  if (pct >=  0.5)  return "bg-emerald-900";
  if (pct >= -0.5)  return "bg-gray-700";
  if (pct >= -1.5)  return "bg-red-900";
  if (pct >= -3.0)  return "bg-red-800";
  return "bg-red-700";
}

function changeToText(pct: number | null): string {
  if (pct === null) return "text-gray-500";
  if (pct >=  0.5)  return "text-emerald-200";
  if (pct <= -0.5)  return "text-red-200";
  return "text-gray-300";
}

function fmtPct(pct: number | null): string {
  if (pct === null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function capSize(cap: number | null): number {
  if (!cap) return 60;
  const log = Math.log10(cap);
  return Math.max(48, Math.min(120, (log - 8) * 20));
}

function StockCell({ s, onNavigate }: { s: HeatStock; onNavigate: (t: string) => void }) {
  const sz = capSize(s.market_cap);
  return (
    <button
      onClick={() => onNavigate(s.ticker)}
      title={`${s.name}\n${fmtPct(s.change_pct)}`}
      className={`${changeToBg(s.change_pct)} rounded flex flex-col items-center justify-center
                  hover:opacity-80 transition-opacity border border-black/20 p-1`}
      style={{ width: sz, height: sz, minWidth: sz, minHeight: sz }}
    >
      <span className={`text-[10px] font-bold leading-none ${changeToText(s.change_pct)}`}>
        {s.ticker.replace(".T","").slice(0, 6)}
      </span>
      <span className={`text-[9px] leading-none mt-0.5 ${changeToText(s.change_pct)}`}>
        {fmtPct(s.change_pct)}
      </span>
    </button>
  );
}

export function Heatmap({ onNavigate, onBack }: Props) {
  const [sectors, setSectors]   = useState<HeatSector[]>([]);
  const [loading, setLoading]   = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [filter,  setFilter]    = useState<MarketFilter>("all");
  const [error,   setError]     = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/heatmap/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setSectors(d.sectors ?? []);
      setLastFetch(new Date().toLocaleTimeString("ja-JP"));
    } catch(e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = sectors.filter(s =>
    filter === "all" || s.market === filter
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← 戻る</button>
          <h1 className="text-lg font-bold text-white flex-1">🔥 セクター別ヒートマップ</h1>
          {lastFetch && <span className="text-xs text-gray-600">更新: {lastFetch}</span>}
          <button onClick={fetchData} disabled={loading}
            className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
            {loading ? "取得中…" : "更新"}
          </button>
        </div>
        {/* マーケットタブ */}
        <div className="max-w-6xl mx-auto flex gap-1 mt-2">
          {(["all","JP","US"] as MarketFilter[]).map(m => (
            <button key={m} onClick={() => setFilter(m)}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                filter === m ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {m === "all" ? "全体" : m === "JP" ? "日本株" : "米国株"}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && <p className="text-red-400 text-sm mb-4">⚠️ {error}</p>}

        {/* 凡例 */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-gray-500">騰落率:</span>
          {[
            { label: "+3%↑", cls: "bg-emerald-700" },
            { label: "+1.5%", cls: "bg-emerald-800" },
            { label: "+0.5%", cls: "bg-emerald-900" },
            { label: "0%付近", cls: "bg-gray-700" },
            { label: "-0.5%", cls: "bg-red-900" },
            { label: "-1.5%", cls: "bg-red-800" },
            { label: "-3%↓", cls: "bg-red-700" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${l.cls}`} />
              <span className="text-[10px] text-gray-500">{l.label}</span>
            </div>
          ))}
          <span className="text-[10px] text-gray-600 ml-2">セルサイズ ∝ 時価総額</span>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({length:9}).map((_,i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 animate-pulse h-32"/>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <p className="text-gray-600 text-sm">データがありません</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map(sec => (
              <div key={`${sec.market}::${sec.sector}`}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                {/* セクターヘッダー */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-gray-300">{sec.sector}</span>
                  <span className="text-xs text-gray-600">{sec.market}</span>
                  <span className={`ml-auto text-sm font-bold ${
                    sec.avg_change_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmtPct(sec.avg_change_pct)} <span className="text-xs text-gray-600">平均</span>
                  </span>
                </div>
                {/* セルグリッド */}
                <div className="flex flex-wrap gap-1">
                  {sec.stocks.slice(0, 60).map(s => (
                    <StockCell key={s.ticker} s={s} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
