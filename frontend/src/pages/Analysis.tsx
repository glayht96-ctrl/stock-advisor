import { useState, useEffect } from "react";
import { useStock } from "../hooks/useStock";
import { useNews } from "../hooks/useNews";
import { useWatchlist } from "../hooks/useWatchlist";
import { useConfig } from "../hooks/useConfig";
import { useRealtimePrice } from "../hooks/useRealtimePrice";
import { useTheme } from "../hooks/useTheme";
import { useStockMemos } from "../hooks/useStockMemos";
import { SummaryCard } from "../components/SummaryCard";
import { StockChart } from "../components/StockChart";
import { SubChart } from "../components/SubChart";
import { TechnicalPanel } from "../components/TechnicalPanel";
import { AnalysisPanel } from "../components/AnalysisPanel";
import { QAChat } from "../components/QAChat";
import { NewsPanel } from "../components/NewsPanel";
import { AlertPanel } from "../components/AlertPanel";
import { BacktestPanel } from "../components/BacktestPanel";
import { ReportButton } from "../components/ReportButton";
import { SearchBar } from "../components/SearchBar";
import { EarningsCalendar } from "../components/EarningsCalendar";
import { RelatedStocks }   from "../components/RelatedStocks";
import type { Period } from "../types";

interface Props {
  ticker: string;
  onBack: () => void;
  serverReady?: boolean;
}

// ── スケルトンプリミティブ ──────────────────────────────────────────
function Sk({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-800 rounded animate-pulse ${className}`} />;
}

function SkeletonSummary() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-4 mb-3">
        <Sk className="h-7 w-32" />
        <Sk className="h-5 w-16" />
      </div>
      <div className="flex gap-6">
        <Sk className="h-10 w-36" />
        <Sk className="h-6 w-20 self-center" />
      </div>
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[1,2,3,4].map(i => <Sk key={i} className="h-12" />)}
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <Sk className="h-4 w-24 mb-4" />
      <Sk className="h-56 w-full" />
      <div className="flex gap-2 mt-3">
        {[1,2,3,4,5].map(i => <Sk key={i} className="h-7 w-14" />)}
      </div>
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 space-y-3">
      <Sk className="h-4 w-32 mb-4" />
      {[1,2,3].map(i => (
        <div key={i} className="flex justify-between items-center">
          <Sk className="h-4 w-24" />
          <Sk className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

function SkeletonNews() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 space-y-4">
      <Sk className="h-4 w-20 mb-2" />
      {[1,2,3].map(i => (
        <div key={i} className="space-y-2">
          <Sk className="h-4 w-full" />
          <Sk className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// フェードインユーティリティ
function fade(visible: boolean) {
  return `transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`;
}

export function Analysis({ ticker, onBack, serverReady = true }: Props) {
  const [period, setPeriod] = useState<Period>("1y");
  const { data: stock, loading: stockLoading, error: stockError } = useStock(ticker, period);
  const { data: news, loading: newsLoading } = useNews(ticker);
  const { has, toggle } = useWatchlist();
  const { claudeEnabled } = useConfig();
  const { data: realtime, status: liveStatus } = useRealtimePrice(ticker);
  const { isDark, toggle: toggleTheme } = useTheme();
  const { getMemo, setMemo } = useStockMemos();
  const [memo, setMemoLocal] = useState(() => getMemo(ticker));
  const inWatchlist = has(ticker);

  // ── プログレッシブ表示フェーズ ─────────────────────────────────
  // 0: データなし  1: SummaryCard  2: Chart  3: 全パネル
  const [renderPhase, setRenderPhase] = useState(0);

  useEffect(() => {
    if (!stock) { setRenderPhase(0); return; }
    setRenderPhase(1);                                      // SummaryCard 即表示
    const t1 = setTimeout(() => setRenderPhase(2), 150);   // Chart
    const t2 = setTimeout(() => setRenderPhase(3), 350);   // Technical + Analysis + News
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [stock?.ticker]); // ticker が変わるたびにリセット

  const sym = stock?.currency === "JPY" ? "¥" : "$";
  const displayPrice     = realtime?.price      ?? stock?.current_price;
  const displayChangePct = realtime?.change_pct ?? stock?.change_pct;
  const displayChange    = realtime?.change     ?? stock?.change;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm shrink-0">
            ← 戻る
          </button>
          {stock ? (
            <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-white text-lg truncate">{stock.name}</span>
                <span className="text-gray-500 text-sm shrink-0">({stock.ticker})</span>
              </div>
              {displayPrice !== null && displayPrice !== undefined && (
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-xl font-mono font-bold">
                    {sym}{displayPrice.toLocaleString()}
                  </span>
                  <span className={`text-sm font-medium ${(displayChange ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {(displayChange ?? 0) >= 0 ? "▲" : "▼"}{displayChangePct?.toFixed(2)}%
                  </span>
                  {liveStatus === "connected" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
              )}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button onClick={toggleTheme}
                  title={isDark ? "ライトモードに切替" : "ダークモードに切替"}
                  className="text-lg text-gray-500 hover:text-gray-300 transition-colors">
                  {isDark ? "☀️" : "🌙"}
                </button>
                <ReportButton stock={stock} />
                <button
                  onClick={() => toggle(ticker)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    inWatchlist
                      ? "border-yellow-500 text-yellow-400 hover:bg-yellow-950"
                      : "border-gray-700 text-gray-500 hover:border-yellow-600 hover:text-yellow-500"
                  }`}
                >
                  {inWatchlist ? "★ ウォッチ中" : "☆ ウォッチ"}
                </button>
              </div>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">{ticker}</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-0">
        {/* 別銘柄切替 */}
        <div className="mb-6">
          <SearchBar onSearch={(t) => { window.location.hash = `#${t}`; }} loading={stockLoading} />
        </div>

        {/* エラー表示 */}
        {stockError && !stock && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-6 text-center mb-6">
            <p className="text-red-400 font-medium">⚠️ {stockError}</p>
            {!serverReady && (
              <p className="text-amber-400 text-sm mt-2">
                サーバー起動中の可能性があります。バナーが消えてから再度お試しください。
              </p>
            )}
            <p className="text-gray-500 text-sm mt-2">
              銘柄コードを確認してください（日本株は末尾に .T、または 4桁数字のみで自動補完）
            </p>
          </div>
        )}

        {/* ─── スケルトンUI（データなし＆ローディング中） ─── */}
        {stockLoading && !stock && (
          <>
            <SkeletonSummary />
            <SkeletonChart />
            <SkeletonPanel />
            <SkeletonNews />
          </>
        )}

        {/* ─── プログレッシブ表示（データあり） ─── */}
        {stock && (
          <>
            {/* フェーズ1: SummaryCard */}
            <div className={fade(renderPhase >= 1)}>
              <SummaryCard data={stock} realtime={realtime} />
              <EarningsCalendar tickers={[ticker]}
                onNavigate={(t) => { window.location.hash = `#${t}`; }} />
              <RelatedStocks ticker={ticker}
                onNavigate={(t) => { window.location.hash = `#${t}`; }} />
            </div>

            {/* フェーズ2: チャート */}
            <div className={fade(renderPhase >= 2)}>
              <div id="chart-container">
                <StockChart prices={stock.prices} period={period} onPeriodChange={setPeriod} currency={stock.currency} />
              </div>
              <SubChart rsiData={stock.rsi_series} macdData={stock.macd_series} />
            </div>

            {/* フェーズ3: テクニカル・分析・アラート・メモ・Q&A */}
            <div className={fade(renderPhase >= 3)}>
              <TechnicalPanel
                indicators={stock.indicators}
                currentPrice={displayPrice ?? stock.current_price}
                currency={stock.currency}
                patterns={stock.price_patterns}
              />
              <AlertPanel ticker={ticker} />
              <BacktestPanel ticker={ticker} currency={stock.currency} />
              <AnalysisPanel
                ticker={ticker}
                claudeEnabled={claudeEnabled}
                indicators={stock.indicators}
                pricePatterns={stock.price_patterns}
              />

              {/* 銘柄メモ */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  📝 銘柄メモ
                </h2>
                <textarea
                  value={memo}
                  onChange={e => {
                    setMemoLocal(e.target.value);
                    setMemo(ticker, e.target.value);
                  }}
                  placeholder={`${ticker} に関するメモを自由に記入...`}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:border-emerald-600 transition-colors"
                />
                {memo.trim() && (
                  <p className="text-[10px] text-gray-600 mt-1">自動保存済み（localStorage）</p>
                )}
              </div>
              <QAChat ticker={ticker} claudeEnabled={claudeEnabled} />
            </div>
          </>
        )}

        {/* ニュース（独立非同期・フェーズ3 と同タイミング） */}
        {(news || newsLoading) && (
          <div className={fade(renderPhase >= 3 || newsLoading)}>
            {newsLoading && !news ? (
              <SkeletonNews />
            ) : (
              <NewsPanel
                ticker={ticker}
                data={news ?? { ticker, articles: [], total: 0, overall_sentiment: null }}
                loading={newsLoading}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
