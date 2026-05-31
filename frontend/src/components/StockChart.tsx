import { useState, useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, LineChart, Line,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import type { PricePoint, Period, ChartType } from "../types";

interface Props {
  prices: PricePoint[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  currency: string;
}

const PERIODS: { label: string; value: Period }[] = [
  { label: "1ヶ月", value: "1mo" },
  { label: "3ヶ月", value: "3mo" },
  { label: "6ヶ月", value: "6mo" },
  { label: "1年",   value: "1y"  },
  { label: "2年",   value: "2y"  },
];

// ローソク足カスタム Shape
const CandleShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || height == null || height === 0) return null;

  const { open, close, high, low } = payload as PricePoint;
  if (open == null || close == null || high == null || low == null) return null;
  if (high === low) return null;

  const isUp   = close >= open;
  const color  = isUp ? "#10b981" : "#f87171";
  const cx     = x + width / 2;
  const bw     = Math.max(width * 0.65, 2);
  const range  = high - low;

  const py = (v: number) => y + height - ((v - low) / range) * height;

  const pOpen  = py(open);
  const pClose = py(close);
  const pBodyT = Math.min(pOpen, pClose);
  const pBodyB = Math.max(pOpen, pClose);
  const bodyH  = Math.max(pBodyB - pBodyT, 1);

  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={pBodyT} stroke={color} strokeWidth={1} />
      <rect x={cx - bw / 2} y={pBodyT} width={bw} height={bodyH} fill={color} />
      <line x1={cx} x2={cx} y1={pBodyB} y2={y + height} stroke={color} strokeWidth={1} />
    </g>
  );
};

const OhlcTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PricePoint;
  const sym = currency === "JPY" ? "¥" : "$";
  const fmt = (v: number) => `${sym}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs space-y-0.5">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-gray-100">始: <span className="font-mono">{fmt(d.open)}</span></p>
      <p className="text-emerald-400">高: <span className="font-mono">{fmt(d.high)}</span></p>
      <p className="text-red-400">安: <span className="font-mono">{fmt(d.low)}</span></p>
      <p className="text-blue-400">終: <span className="font-mono font-bold">{fmt(d.close)}</span></p>
      <p className="text-gray-500 mt-1">出来高: {d.volume.toLocaleString()}</p>
    </div>
  );
};

const LineTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PricePoint;
  const sym = currency === "JPY" ? "¥" : "$";
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-emerald-400 font-bold">終値: {sym}{d.close.toLocaleString()}</p>
      <p className="text-gray-300">始: {sym}{d.open.toLocaleString()} / 高: {sym}{d.high.toLocaleString()} / 安: {sym}{d.low.toLocaleString()}</p>
      <p className="text-gray-500">出来高: {d.volume.toLocaleString()}</p>
    </div>
  );
};

const xFmt = (v: string) => {
  const d = new Date(v);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

interface ToggleButtonProps {
  label: string;
  active: boolean;
  color: string;
  dashed?: boolean;
  onClick: () => void;
}

function ToggleButton({ label, active, color, dashed, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium border ${
        active
          ? `${color} border-opacity-60`
          : "text-gray-600 border-transparent hover:text-gray-400 hover:bg-gray-800"
      }`}
    >
      {dashed ? <span style={{ textDecoration: "underline dotted" }}>{label}</span> : label}
    </button>
  );
}

export function StockChart({ prices, period, onPeriodChange, currency }: Props) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showSMA20,  setShowSMA20]  = useState(true);
  const [showSMA50,  setShowSMA50]  = useState(true);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA20,  setShowEMA20]  = useState(false);
  const sym = currency === "JPY" ? "¥" : "$";

  const chartData = useMemo(() =>
    prices.map((p) => ({
      ...p,
      sma20:  showSMA20  ? (p.sma20  ?? null) : undefined,
      sma50:  showSMA50  ? (p.sma50  ?? null) : undefined,
      sma200: showSMA200 ? (p.sma200 ?? null) : undefined,
      ema20:  showEMA20  ? (p.ema20  ?? null) : undefined,
    })),
    [prices, showSMA20, showSMA50, showSMA200, showEMA20]
  );

  const maxVol = Math.max(...prices.map(p => p.volume));

  const yFmt = (v: number) =>
    `${sym}${v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : v.toLocaleString()}`;

  const maLines = (
    <>
      {showSMA20  && <Line type="monotone" dataKey="sma20"  stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />}
      {showSMA50  && <Line type="monotone" dataKey="sma50"  stroke="#fb923c" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />}
      {showSMA200 && <Line type="monotone" dataKey="sma200" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />}
      {showEMA20  && <Line type="monotone" dataKey="ema20"  stroke="#c084fc" strokeWidth={1.5} dot={false} strokeDasharray="2 2" connectNulls />}
    </>
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">株価チャート</h2>
          {/* チャートタイプ */}
          <div className="flex gap-1">
            {(["line", "candle"] as ChartType[]).map((t) => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  chartType === t ? "bg-emerald-600 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                }`}>
                {t === "line" ? "折れ線" : "ローソク"}
              </button>
            ))}
          </div>
          {/* MA トグル */}
          <div className="flex gap-1 flex-wrap">
            <ToggleButton label="SMA20"  active={showSMA20}  color="bg-blue-900/60 text-blue-300 border-blue-700"   onClick={() => setShowSMA20(v => !v)} />
            <ToggleButton label="SMA50"  active={showSMA50}  color="bg-orange-900/60 text-orange-300 border-orange-700" onClick={() => setShowSMA50(v => !v)} />
            <ToggleButton label="SMA200" active={showSMA200} color="bg-red-900/60 text-red-300 border-red-700"      onClick={() => setShowSMA200(v => !v)} />
            <ToggleButton label="EMA20"  active={showEMA20}  color="bg-purple-900/60 text-purple-300 border-purple-700" dashed onClick={() => setShowEMA20(v => !v)} />
          </div>
        </div>
        {/* 期間 */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => onPeriodChange(p.value)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                period === p.value ? "bg-emerald-500 text-black font-bold" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* メインチャート */}
      <ResponsiveContainer width="100%" height={280}>
        {chartType === "line" ? (
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={xFmt} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={yFmt} domain={["auto", "auto"]} width={64} />
            <Tooltip content={<LineTooltip currency={currency} />} />
            <Line type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
            {maLines}
          </LineChart>
        ) : (
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={xFmt} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={yFmt} domain={["auto", "auto"]} width={64} />
            <Tooltip content={<OhlcTooltip currency={currency} />} />
            <Bar
              dataKey={(d: PricePoint) => [d.low, d.high]}
              isAnimationActive={false}
              shape={(props: any) => <CandleShape {...props} payload={props.payload} />}
              maxBarSize={24}
            >
              {chartData.map((p, i) => (
                <Cell key={i} fill={p.close >= p.open ? "#10b981" : "#f87171"} />
              ))}
            </Bar>
            {maLines}
          </ComposedChart>
        )}
      </ResponsiveContainer>

      {/* MA 凡例 */}
      {(showSMA20 || showSMA50 || showSMA200 || showEMA20) && (
        <div className="flex gap-4 mt-1 ml-16 text-xs text-gray-500 flex-wrap">
          {showSMA20  && <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-400 opacity-80"></span>SMA20</span>}
          {showSMA50  && <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-orange-400 opacity-80"></span>SMA50</span>}
          {showSMA200 && <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-red-400 opacity-80"></span>SMA200</span>}
          {showEMA20  && <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-purple-400 opacity-80" style={{ borderTop: "1px dashed" }}></span>EMA20</span>}
        </div>
      )}

      {/* 出来高チャート */}
      <div className="mt-2">
        <p className="text-xs text-gray-600 mb-1">出来高</p>
        <ResponsiveContainer width="100%" height={50}>
          <ComposedChart data={prices} margin={{ top: 0, right: 5, bottom: 0, left: 10 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[0, maxVol * 1.2]} />
            <Bar dataKey="volume" isAnimationActive={false} maxBarSize={24}>
              {prices.map((p, i) => (
                <Cell key={i} fill={p.close >= p.open ? "#064e3b" : "#450a0a"} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
