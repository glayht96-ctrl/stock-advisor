import { SearchBar } from "../components/SearchBar";
import { ComparePanel } from "../components/ComparePanel";
import { useWatchlist } from "../hooks/useWatchlist";

interface Props {
  onSearch: (ticker: string) => void;
  loading?: boolean;
}

const MARKET_PRESETS = [
  { label: "日経平均", ticker: "^N225" },
  { label: "S&P 500",  ticker: "^GSPC"  },
  { label: "NASDAQ",   ticker: "^IXIC"  },
];

export function Home({ onSearch, loading }: Props) {
  const { watchlist, remove } = useWatchlist();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-2xl">📈</span>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">Stock Advisor</h1>
            <p className="text-xs text-gray-500 mt-0.5">日本株・米国株 テクニカル分析 &amp; AI見立て</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 検索 */}
        <section>
          <SearchBar onSearch={onSearch} loading={loading} />
        </section>

        {/* ウォッチリスト */}
        {watchlist.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">★ ウォッチリスト</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {watchlist.map((ticker) => (
                <div key={ticker} className="bg-gray-900 border border-yellow-900 rounded-xl overflow-hidden flex">
                  <button
                    onClick={() => onSearch(ticker)}
                    className="flex-1 text-left px-4 py-3 hover:bg-yellow-950/30 transition-colors"
                  >
                    <p className="text-sm font-bold text-yellow-300">{ticker}</p>
                    <p className="text-xs text-gray-600 mt-0.5">タップで分析</p>
                  </button>
                  <button
                    onClick={() => remove(ticker)}
                    className="px-3 text-gray-700 hover:text-gray-400 transition-colors text-lg leading-none"
                  >×</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 指数ショートカット */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">主要指数</h2>
          <div className="flex gap-2 flex-wrap">
            {MARKET_PRESETS.map((p) => (
              <button
                key={p.ticker}
                onClick={() => onSearch(p.ticker)}
                className="bg-gray-900 border border-gray-800 hover:border-emerald-700 text-gray-300 hover:text-emerald-300 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* ツールリンク */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { window.location.hash = "#portfolio"; }}
              className="bg-gray-900 border border-gray-800 hover:border-emerald-700 rounded-xl px-5 py-4 text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="text-sm font-semibold text-gray-200 group-hover:text-emerald-300 transition-colors">ポートフォリオ分析</p>
                  <p className="text-xs text-gray-600 mt-0.5">セクター分散・リスクをAIで分析</p>
                </div>
                <span className="ml-auto text-gray-600 group-hover:text-emerald-500 transition-colors">→</span>
              </div>
            </button>
            <button
              onClick={() => { window.location.hash = "#screener"; }}
              className="bg-gray-900 border border-gray-800 hover:border-violet-700 rounded-xl px-5 py-4 text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="text-sm font-semibold text-gray-200 group-hover:text-violet-300 transition-colors">銘柄スクリーナー</p>
                  <p className="text-xs text-gray-600 mt-0.5">RSI・MACD・SMAで銘柄フィルタリング</p>
                </div>
                <span className="ml-auto text-gray-600 group-hover:text-violet-500 transition-colors">→</span>
              </div>
            </button>
          </div>
        </section>

        {/* 銘柄比較 */}
        <section>
          <ComparePanel onNavigate={onSearch} />
        </section>

        <p className="text-xs text-gray-700 text-center pb-4">
          ※ 個人利用専用。投資は自己責任で。
        </p>
      </div>
    </div>
  );
}
