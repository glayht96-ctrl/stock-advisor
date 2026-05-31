import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

type Tab = "rsi" | "macd";

interface RsiPoint { date: string; rsi: number | null; }
interface MacdPoint { date: string; macd: number | null; signal: number | null; histogram: number | null; }

interface SubChartProps {
  rsiData: RsiPoint[];
  macdData: MacdPoint[];
}

const TooltipRsi = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-amber-400">RSI: {payload[0]?.value?.toFixed(1)}</p>
    </div>
  );
};

const TooltipMacd = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const get = (key: string) => payload.find((p: any) => p.dataKey === key);
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {get("histogram") && <p style={{ color: (get("histogram").value ?? 0) >= 0 ? "#10b981" : "#f87171" }}>Hist: {get("histogram").value?.toFixed(2)}</p>}
      {get("macd") && <p className="text-blue-400">MACD: {get("macd").value?.toFixed(2)}</p>}
      {get("signal") && <p className="text-orange-400">Signal: {get("signal").value?.toFixed(2)}</p>}
    </div>
  );
};

const HistBar = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!height) return null;
  return <rect x={x} y={value >= 0 ? y : y + height} width={width} height={Math.abs(height)}
    fill={value >= 0 ? "#10b981" : "#f87171"} opacity={0.8} />;
};

const xFmt = (v: string) => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; };

export function SubChart({ rsiData, macdData }: SubChartProps) {
  const [tab, setTab] = useState<Tab>("rsi");

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">サブチャート</h2>
        <div className="flex gap-1">
          {(["rsi", "macd"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors font-medium ${
                tab === t ? "bg-amber-500 text-black" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {tab === "rsi" && (
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={rsiData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={xFmt} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={[0, 100]} width={35} />
            <Tooltip content={<TooltipRsi />} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={30} stroke="#3b82f6" strokeDasharray="4 4" />
            <ReferenceLine y={50} stroke="#4b5563" strokeDasharray="2 2" />
            <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {tab === "macd" && (
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={macdData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={xFmt} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} width={45} />
            <Tooltip content={<TooltipMacd />} />
            <ReferenceLine y={0} stroke="#4b5563" />
            <Bar dataKey="histogram" shape={<HistBar />} />
            <Line type="monotone" dataKey="macd" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="signal" stroke="#fb923c" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
        {tab === "rsi" && (<><span className="text-red-500">─ 70 買われすぎ</span><span className="text-blue-500">─ 30 売られすぎ</span></>)}
        {tab === "macd" && (<><span className="text-blue-400">─ MACD</span><span className="text-orange-400">─ Signal</span><span className="text-emerald-400">█(+)</span><span className="text-red-400">█(−)</span></>)}
      </div>
    </div>
  );
}
