import { useState, useEffect, useRef } from "react";
import type { StockData } from "../types";
import type { RealtimeData } from "../hooks/useRealtimePrice";

interface Props {
  data: StockData;
  realtime?: RealtimeData | null;
}

function fmt(n: number | null, digits = 0): string {
  if (n === null) return "—";
  return n.toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

function fmtVol(n: number | null): string {
  if (!n) return "—";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}億`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
  return n.toLocaleString();
}

function fmtCap(n: number | null, currency: string): string {
  if (!n) return "—";
  return currency === "JPY" ? `¥${(n / 1e8).toFixed(0)}億` : `$${(n / 1e9).toFixed(1)}B`;
}

function Week52Bar({ current, high, low }: { current: number | null; high: number | null; low: number | null }) {
  if (!current || !high || !low || high === low) return null;
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>52週安値</span><span>52週高値</span>
      </div>
      <div className="relative h-1.5 bg-gray-700 rounded-full">
        <div className="absolute h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
        <div className="absolute w-2 h-2 bg-white rounded-full -top-0.5 -translate-x-1/2 shadow" style={{ left: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{low.toLocaleString()}</span>
        <span className="text-gray-400">現在位置 {pct.toFixed(0)}%</span>
        <span>{high.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function SummaryCard({ data, realtime }: Props) {
  const displayPrice    = realtime?.price     ?? data.current_price;
  const displayChange   = realtime?.change    ?? data.change;
  const displayChangePct = realtime?.change_pct ?? data.change_pct;

  const isUp    = (displayChange ?? 0) >= 0;
  const sym     = data.currency === "JPY" ? "¥" : "$";
  const volRatio = data.volume && data.avg_volume ? (data.volume / data.avg_volume) : null;

  // Flash animation on price change
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const flashTimer   = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const prev    = prevPriceRef.current;
    const current = displayPrice;
    prevPriceRef.current = current ?? null;

    if (prev !== null && current !== null && current !== prev) {
      clearTimeout(flashTimer.current);
      setFlash(current > prev ? "up" : "down");
      flashTimer.current = setTimeout(() => setFlash(null), 800);
    }

    return () => clearTimeout(flashTimer.current);
  }, [displayPrice]);

  return (
    <div className="mb-6 space-y-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">現在値</p>
            <p className={`text-3xl font-bold font-mono transition-colors duration-500 ${
              flash === "up" ? "text-emerald-300" : flash === "down" ? "text-red-300" : "text-white"
            }`}>
              {sym}{fmt(displayPrice, 2)}
            </p>
            <p className={`text-lg font-semibold mt-1 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
              {isUp ? "▲" : "▼"} {fmt(Math.abs(displayChange ?? 0), 2)}
              <span className="text-base ml-2">({isUp ? "+" : ""}{displayChangePct?.toFixed(2)}%)</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <p className="text-xs text-gray-500">時価総額</p>
              <p className="text-white font-medium">{fmtCap(data.market_cap, data.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">出来高</p>
              <p className="text-white font-medium">
                {fmtVol(data.volume)}
                {volRatio !== null && (
                  <span className={`ml-1 text-xs ${volRatio >= 1.5 ? "text-amber-400" : volRatio <= 0.5 ? "text-blue-400" : "text-gray-500"}`}>
                    ({volRatio >= 1 ? "+" : ""}{((volRatio - 1) * 100).toFixed(0)}%vs平均)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">52週高値</p>
              <p className="text-white font-medium">{sym}{fmt(data.week52_high, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">52週安値</p>
              <p className="text-white font-medium">{sym}{fmt(data.week52_low, 0)}</p>
            </div>
          </div>
        </div>
        <Week52Bar current={displayPrice} high={data.week52_high} low={data.week52_low} />
      </div>
    </div>
  );
}
