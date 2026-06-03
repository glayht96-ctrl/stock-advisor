import { useState } from "react";
import { SearchBar }       from "../components/SearchBar";
import { ComparePanel }    from "../components/ComparePanel";
import { DiscoverPanel }   from "../components/DiscoverPanel";
import { EarningsCalendar } from "../components/EarningsCalendar";
import { MorningReport }   from "../components/MorningReport";
import { useWatchlist }    from "../hooks/useWatchlist";
import { useTheme }        from "../hooks/useTheme";
import { useStockMemos }   from "../hooks/useStockMemos";

interface Props {
  onSearch: (ticker: string) => void;
  loading?: boolean;
}

type HomeTab = "discover" | "heatmap" | "screener";

const MARKET_PRESETS = [
  { label: "日経平均", ticker: "^N225",  flag: "🇯🇵" },
  { label: "S&P 500",  ticker: "^GSPC",  flag: "🇺🇸" },
  { label: "NASDAQ",   ticker: "^IXIC",  flag: "🇺🇸" },
  { label: "為替USD/JPY", ticker: "JPY=X", flag: "💱" },
];

const TABS: { id: HomeTab; label: string; icon: string }[] = [
  { id: "discover",  label: "注目銘柄",       icon: "🔥" },
  { id: "heatmap",   label: "ヒートマップ",   icon: "📊" },
  { id: "screener",  label: "スクリーナー",   icon: "🔍" },
];

export function Home({ onSearch, loading }: Props) {
  const { watchlist, remove }         = useWatchlist();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { hasMemo }                   = useStockMemos();
  const [activeTab, setActiveTab]     = useState<HomeTab>("discover");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <span className="text-2xl">📈</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Stock Advisor</h1>
            <p className="text-xs text-gray-600 mt-0.5">日本株・米国株 テクニカル分析 &amp; AI</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button onClick={() => onSearch("NEWS-SEARCH")}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors hidden sm:block">
              📰 ニュース検索
            </button>
            <button onClick={() => onSearch("CORRELATION")}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors hidden sm:block">
              🔗 相関分析
            </button>
            <button onClick={() => onSearch("PORTFOLIO")}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors hidden sm:block">
              📊 ポートフォリオ
            </button>
            <button onClick={toggleTheme} title={isDark ? "ライトモード" : "ダークモード"}
              className="text-lg text-gray-500 hover:text-gray-300 transition-colors">
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      {/* ヒーロー検索 */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 px-4 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mb-3">
            日米 1,200銘柄 対応
          </p>
          <h2 className="text-2xl font-bold text-white mb-6">
            銘柄名・ティッカーで検索
          </h2>
          <SearchBar onSearch={onSearch} loading={loading} autoFocus />

          {/* ツールショートカット */}
          <div className="flex flex-wrap gap-2 justify-center mt-4 sm:hidden">
            <button onClick={() => onSearch("NEWS-SEARCH")}
              className="text-xs text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg">
              📰 ニュース検索
            </button>
            <button onClick={() => onSearch("CORRELATION")}
              className="text-xs text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg">
              🔗 相関分析
            </button>
          </div>

          {/* 主要指数ショートカット */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {MARKET_PRESETS.map((p) => (
              <button key={p.ticker} onClick={() => onSearch(p.ticker)}
                className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700 hover:border-emerald-600 hover:text-emerald-400 px-3 py-1.5 rounded-lg transition-colors">
                <span>{p.flag}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 朝の相場レポート */}
        <MorningReport />

        {/* ウォッチリスト */}
        {watchlist.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">★ ウォッチリスト</h2>
              <span className="text-xs text-gray-600">{watchlist.length}銘柄</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {watchlist.map((ticker) => (
                <div key={ticker} className="bg-gray-900 border border-yellow-900/50 rounded-xl overflow-hidden flex group hover:border-yellow-700 transition-colors">
                  <button onClick={() => onSearch(ticker)}
                    className="flex-1 text-left px-3 py-3 hover:bg-yellow-950/20 transition-colors">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold text-yellow-300 group-hover:text-yellow-200">{ticker}</p>
                      {hasMemo(ticker) && <span className="text-[10px]">📝</span>}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">タップで分析</p>
                  </button>
                  <button onClick={() => remove(ticker)}
                    className="px-2.5 text-gray-700 hover:text-gray-400 transition-colors text-base leading-none">×</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 決算カレンダー（ウォッチリストがある場合のみ） */}
        {watchlist.length > 0 && (
          <EarningsCalendar tickers={watchlist} onNavigate={onSearch} compact />
        )}

        {/* メインコンテンツ — タブ */}
        <section>
          {/* タブバー */}
          <div className="flex items-center gap-1 border-b border-gray-800 mb-4">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-emerald-500 text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          {activeTab === "discover" && (
            <DiscoverPanel onNavigate={onSearch} />
          )}

          {activeTab === "heatmap" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                日米163銘柄をセクター別に色分け表示します。
                <span className="text-gray-600 text-xs block mt-1">
                  初回は60〜90秒の読み込みがあります（バックグラウンド処理）
                </span>
              </p>
              <button onClick={() => { window.location.hash = "#heatmap"; }}
                className="w-full bg-gray-900 border border-gray-700 hover:border-orange-600 rounded-xl px-5 py-6 text-left transition-colors group">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🔥</span>
                  <div>
                    <p className="text-base font-semibold text-gray-200 group-hover:text-orange-300 transition-colors">
                      セクター別ヒートマップを開く
                    </p>
                    <p className="text-xs text-gray-600 mt-1">騰落率で色分け・時価総額比例セルサイズ・日米切替</p>
                  </div>
                  <span className="ml-auto text-gray-600 group-hover:text-orange-400 text-xl transition-colors">→</span>
                </div>
              </button>
              {/* ミニプレビュー */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "半導体装置", pct: "+8.94%", color: "bg-emerald-700" },
                  { label: "Technology", pct: "+2.10%", color: "bg-emerald-900" },
                  { label: "自動車",     pct: "-1.20%", color: "bg-red-900" },
                  { label: "Energy",     pct: "-0.40%", color: "bg-gray-700" },
                ].map(s => (
                  <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                    <p className="text-xs text-white/80 font-medium">{s.label}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{s.pct}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "screener" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                RSI・MACD・SMA等の条件で日米724銘柄をフィルタリング
              </p>
              <button onClick={() => { window.location.hash = "#screener"; }}
                className="w-full bg-gray-900 border border-gray-700 hover:border-violet-600 rounded-xl px-5 py-6 text-left transition-colors group">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🔍</span>
                  <div>
                    <p className="text-base font-semibold text-gray-200 group-hover:text-violet-300 transition-colors">
                      銘柄スクリーナーを開く
                    </p>
                    <p className="text-xs text-gray-600 mt-1">日米724銘柄対象・32並列高速処理・プリセット4種</p>
                  </div>
                  <span className="ml-auto text-gray-600 group-hover:text-violet-400 text-xl transition-colors">→</span>
                </div>
              </button>
              {/* プリセット */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "売られすぎ",  desc: "RSI ≤ 30",        icon: "📉" },
                  { label: "強気転換",    desc: "MACD hist > 0",   icon: "📈" },
                  { label: "上昇トレンド", desc: "価格 > SMA50",   icon: "🚀" },
                  { label: "買われすぎ",  desc: "RSI ≥ 70",        icon: "⚠️" },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => { window.location.hash = "#screener"; }}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2.5 text-left transition-colors">
                    <div className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-200">{p.label}</p>
                        <p className="text-[10px] text-gray-500">{p.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 銘柄比較 */}
        <section>
          <ComparePanel onNavigate={onSearch} />
        </section>

        {/* フッター */}
        <p className="text-xs text-gray-700 text-center pb-4">
          ※ 個人利用専用。投資は自己責任で。
        </p>
      </div>
    </div>
  );
}
