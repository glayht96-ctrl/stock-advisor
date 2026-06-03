import { useState, useEffect, useRef } from "react";
import type { RealtimeData, LiveStatus, PriceDirection } from "../hooks/useRealtimePrice";

// ── ミニスパークライン ────────────────────────────────────────────────────
function Sparkline({ prices, isUp }: { prices: number[]; isUp: boolean }) {
  if (prices.length < 2) {
    return <span className="inline-block w-16 h-5 bg-gray-800 rounded animate-pulse" />;
  }
  const W = 64, H = 20;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices
    .map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / range) * (H - 2) - 1}`)
    .join(" ");
  const color = isUp ? "#10b981" : "#f87171";
  return (
    <svg width={W} height={H} className="inline-block align-middle">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ── LIVE 点滅インジケーター ──────────────────────────────────────────────
function LiveDot({ status }: { status: LiveStatus }) {
  const [bright, setBright] = useState(true);
  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setBright(b => !b), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === "disconnected") {
    return <span className="text-xs text-gray-500">● OFFLINE</span>;
  }
  if (status === "connecting") {
    return <span className="text-xs text-amber-500 animate-pulse">● 接続中</span>;
  }
  return (
    <span className={`text-xs font-bold transition-opacity duration-300 ${bright ? "opacity-100" : "opacity-40"} text-emerald-400`}>
      ● LIVE
    </span>
  );
}

interface Props {
  currency: string;
  data: RealtimeData | null;
  direction: PriceDirection;
  priceHistory: number[];
  liveStatus: LiveStatus;
}

export function RealtimeTicker({ currency, data, direction, priceHistory, liveStatus }: Props) {
  // フラッシュアニメーション用背景色
  const [flashBg, setFlashBg] = useState<string>("transparent");
  const flashRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (direction === "neutral") return;
    const color = direction === "up"
      ? "rgba(16,185,129,0.25)"
      : "rgba(248,113,113,0.25)";
    setFlashBg(color);
    clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setFlashBg("transparent"), 700);
    return () => clearTimeout(flashRef.current);
  }, [direction]);

  const sym    = currency === "JPY" ? "¥" : "$";
  const price  = data?.price;
  const change = data?.change;
  const pct    = data?.change_pct;
  const vol    = data?.volume;
  const ohlc   = data?.ohlc_today;

  const isUp   = (change ?? 0) >= 0;
  const fmtPrc = (v: number) => currency === "JPY"
    ? `¥${v.toLocaleString("ja-JP")}`
    : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

  const fmtVol = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString();
  };

  return (
    <div
      className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 mb-4 transition-colors duration-500"
      style={{ backgroundColor: flashBg !== "transparent" ? flashBg : undefined }}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* LIVE インジケーター */}
        <LiveDot status={liveStatus} />

        {/* 価格 */}
        <div className="flex items-baseline gap-2 min-w-0">
          {price != null ? (
            <>
              <span className="text-2xl font-mono font-bold text-white tracking-tight">
                {fmtPrc(price)}
              </span>
              <span className={`text-base font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                {isUp ? "▲" : "▼"}
                {sym}{Math.abs(change ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                {" "}({isUp ? "+" : ""}{pct?.toFixed(2)}%)
              </span>
            </>
          ) : (
            <>
              <span className="h-8 w-36 bg-gray-800 rounded animate-pulse inline-block" />
              <span className="h-5 w-20 bg-gray-800 rounded animate-pulse inline-block" />
            </>
          )}
        </div>

        {/* スパークライン */}
        <div className="shrink-0">
          <Sparkline prices={priceHistory} isUp={isUp} />
        </div>

        {/* 当日 OHLC */}
        {ohlc && (
          <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
            <span>始<span className="text-gray-200 font-mono ml-1">{fmtPrc(ohlc.open)}</span></span>
            <span>高<span className="text-emerald-400 font-mono ml-1">{fmtPrc(ohlc.high)}</span></span>
            <span>安<span className="text-red-400 font-mono ml-1">{fmtPrc(ohlc.low)}</span></span>
          </div>
        )}

        {/* 出来高 */}
        {vol != null && (
          <div className="text-xs text-gray-500 ml-auto shrink-0">
            出来高 <span className="text-gray-300 font-mono">{fmtVol(vol)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
