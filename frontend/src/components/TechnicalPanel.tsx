import type { Indicators, PricePatterns } from "../types";

interface Props {
  indicators: Indicators;
  currentPrice: number | null;
  currency: string;
  patterns?: PricePatterns | null;
}

function fmt(n: number | null, digits = 2): string {
  if (n === null) return "—";
  return n.toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

function getRsiInfo(rsi: number | null) {
  if (rsi === null) return { label: "データなし", color: "text-gray-500", bg: "bg-gray-800" };
  if (rsi >= 70) return { label: "買われすぎ", color: "text-red-400", bg: "bg-red-950" };
  if (rsi <= 30) return { label: "売られすぎ", color: "text-blue-400", bg: "bg-blue-950" };
  return { label: "中立", color: "text-gray-300", bg: "bg-gray-800" };
}

function getMacdInfo(histogram: number | null) {
  if (histogram === null) return { label: "データなし", color: "text-gray-500", bg: "bg-gray-800" };
  if (histogram > 0) return { label: "強気", color: "text-emerald-400", bg: "bg-emerald-950" };
  return { label: "弱気", color: "text-red-400", bg: "bg-red-950" };
}

function getBbInfo(price: number | null, upper: number | null, lower: number | null) {
  if (!price || !upper || !lower) return { label: "データなし", color: "text-gray-500", bg: "bg-gray-800" };
  if (price >= upper) return { label: "上限突破・過熱感", color: "text-red-400", bg: "bg-red-950" };
  if (price <= lower) return { label: "下限・反発に注意", color: "text-blue-400", bg: "bg-blue-950" };
  return { label: "バンド内", color: "text-gray-300", bg: "bg-gray-800" };
}

export function TechnicalPanel({ indicators, currentPrice, currency, patterns }: Props) {
  const sym = currency === "JPY" ? "¥" : "$";
  const rsiInfo = getRsiInfo(indicators.rsi_14);
  const macdInfo = getMacdInfo(indicators.macd.histogram);
  const bbInfo = getBbInfo(currentPrice, indicators.bollinger.upper, indicators.bollinger.lower);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        テクニカル指標
      </h2>

      {/* RSI / MACD / BB */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* RSI */}
        <div className={`${rsiInfo.bg} rounded-lg p-4 border border-gray-700`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">RSI (14)</p>
          <p className="text-2xl font-bold font-mono text-white">
            {fmt(indicators.rsi_14, 1)}
          </p>
          <p className={`text-sm font-semibold mt-1 ${rsiInfo.color}`}>{rsiInfo.label}</p>
          <p className="text-xs text-gray-600 mt-1">70↑過熱 / 30↓売られすぎ</p>
        </div>

        {/* MACD */}
        <div className={`${macdInfo.bg} rounded-lg p-4 border border-gray-700`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">MACD</p>
          <p className="text-2xl font-bold font-mono text-white">
            {indicators.macd.histogram !== null
              ? `${indicators.macd.histogram >= 0 ? "+" : ""}${fmt(indicators.macd.histogram)}`
              : "—"}
          </p>
          <p className={`text-sm font-semibold mt-1 ${macdInfo.color}`}>{macdInfo.label}</p>
          <p className="text-xs text-gray-600 mt-1">
            MACD: {fmt(indicators.macd.macd)} / Signal: {fmt(indicators.macd.signal)}
          </p>
        </div>

        {/* ボリンジャーバンド */}
        <div className={`${bbInfo.bg} rounded-lg p-4 border border-gray-700`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">ボリンジャーバンド</p>
          <p className={`text-sm font-semibold mt-1 ${bbInfo.color}`}>{bbInfo.label}</p>
          <div className="text-xs text-gray-400 mt-2 space-y-1">
            <p>上限: {sym}{fmt(indicators.bollinger.upper, 0)}</p>
            <p>中央: {sym}{fmt(indicators.bollinger.middle, 0)}</p>
            <p>下限: {sym}{fmt(indicators.bollinger.lower, 0)}</p>
          </div>
        </div>
      </div>

      {/* 移動平均 */}
      <div className="border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">移動平均</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "SMA 20", value: indicators.sma_20 },
            { label: "SMA 50", value: indicators.sma_50 },
            { label: "SMA 200", value: indicators.sma_200 },
            { label: "EMA 20", value: indicators.ema_20 },
          ].map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm font-mono font-bold text-white mt-1">
                {sym}{fmt(item.value, 0)}
              </p>
              {currentPrice && item.value && (
                <p className={`text-xs mt-1 ${currentPrice >= item.value ? "text-emerald-400" : "text-red-400"}`}>
                  {currentPrice >= item.value ? "↑上回る" : "↓下回る"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 価格パターン */}
      {patterns && (
        <div className="border-t border-gray-800 pt-4 mt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">価格パターン</p>

          {/* 騰落率 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "5日", ret: patterns.return_5d,  trend: patterns.trend_5d  },
              { label: "20日", ret: patterns.return_20d, trend: patterns.trend_20d },
              { label: "60日", ret: patterns.return_60d, trend: patterns.trend_60d },
            ].map(({ label, ret, trend }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}騰落</p>
                <p className={`text-sm font-bold font-mono ${
                  trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-400"
                }`}>
                  {ret !== null ? `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%` : "—"}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {trend === "up" ? "↑上昇" : trend === "down" ? "↓下落" : "→横ばい"}
                </p>
              </div>
            ))}
          </div>

          {/* 高値・安値更新 + BBスクイーズ */}
          <div className="flex flex-wrap gap-2 mb-3">
            {patterns.new_high_20d && (
              <span className="text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full">
                20日高値更新
              </span>
            )}
            {patterns.new_low_20d && (
              <span className="text-xs bg-red-900/50 text-red-300 border border-red-700 px-2 py-0.5 rounded-full">
                20日安値更新
              </span>
            )}
            {patterns.bb_squeeze && (
              <span className="text-xs bg-amber-900/50 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full">
                BBスクイーズ中 ({patterns.bb_bandwidth_pct?.toFixed(1)}%)
              </span>
            )}
          </div>

          {/* ゴールデン/デッドクロス */}
          {(patterns.golden_crosses.length > 0 || patterns.dead_crosses.length > 0) && (
            <div className="space-y-1 mb-3">
              {patterns.golden_crosses.slice(-3).map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">GC</span>
                  <span className="text-xs text-gray-400">{e.date} — {e.from_line} ↑ {e.to_line}</span>
                </div>
              ))}
              {patterns.dead_crosses.slice(-3).map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] bg-red-900/60 text-red-400 border border-red-800 px-1.5 py-0.5 rounded font-bold">DC</span>
                  <span className="text-xs text-gray-400">{e.date} — {e.from_line} ↓ {e.to_line}</span>
                </div>
              ))}
            </div>
          )}

          {/* 出来高急増 */}
          {patterns.volume_spikes.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">出来高急増日（平均比2倍以上）</p>
              <div className="flex flex-wrap gap-2">
                {patterns.volume_spikes.slice(-5).map((v, i) => (
                  <span key={i} className="text-xs bg-yellow-900/40 text-yellow-300 border border-yellow-800 px-2 py-0.5 rounded">
                    {v.date} ({v.ratio}倍)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
