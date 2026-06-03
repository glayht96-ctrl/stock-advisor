import { useState, useRef } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface Article {
  title: string;
  url: string;
  summary: string;
  published_at: string | null;
  source: string;
}

interface RelatedTicker {
  ticker: string;
  name: string;
  name_ja?: string;
  reason: string;
}

interface SearchResult {
  q: string;
  articles: Article[];
  related_tickers: RelatedTicker[];
}

interface Props {
  onNavigate: (ticker: string) => void;
  onBack: () => void;
}

const EXAMPLES = ["AI半導体", "円安 輸出", "EV 電池", "金利上昇 銀行", "NVIDIA 決算"];

export function NewsSearch({ onNavigate, onBack }: Props) {
  const [query,   setQuery]   = useState("");
  const [result,  setResult]  = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const abortRef = useRef<AbortController>();

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch(
        `${BASE_URL}/search/news?q=${encodeURIComponent(q.trim())}`,
        { signal: abortRef.current.signal }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: SearchResult = await resp.json();
      setResult(data);
    } catch (e: any) {
      if (e.name !== "AbortError") setError("検索に失敗しました");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm shrink-0">
            ← 戻る
          </button>
          <h1 className="font-bold text-white">📰 ニュースから銘柄を探す</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* 検索入力 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch(query)}
            placeholder="キーワードを入力　例: AI半導体 / 円安 / EV電池"
            className="flex-1 bg-gray-900 border border-gray-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-colors"
          />
          <button
            onClick={() => doSearch(query)}
            disabled={loading || !query.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-medium transition-colors text-sm"
          >
            {loading ? "検索中..." : "検索"}
          </button>
        </div>

        {/* 例 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {EXAMPLES.map(ex => (
            <button key={ex}
              onClick={() => { setQuery(ex); doSearch(ex); }}
              className="text-xs text-gray-400 border border-gray-700 hover:border-emerald-600 hover:text-emerald-400 px-3 py-1.5 rounded-lg transition-colors">
              {ex}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* 関連銘柄 */}
        {result && result.related_tickers.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              🔗 AI が特定した関連銘柄
            </h2>
            <div className="flex flex-wrap gap-2">
              {result.related_tickers.map((t, i) => (
                <button key={i}
                  onClick={() => onNavigate(t.ticker)}
                  className="flex flex-col items-start bg-gray-900 border border-emerald-900 hover:border-emerald-600 rounded-xl px-3 py-2.5 transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">{t.ticker}</span>
                    <span className="text-xs text-gray-400">{t.name_ja || t.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-0.5 text-left">{t.reason}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 記事一覧 */}
        {result && result.articles.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              📰 ニュース記事（{result.articles.length}件）
            </h2>
            <div className="space-y-3">
              {result.articles.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-200 leading-snug flex-1">{a.title}</p>
                    <span className="text-gray-600 shrink-0 text-xs mt-0.5">↗</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{a.source}</span>
                    {a.published_at && (
                      <span className="text-[10px] text-gray-700">{a.published_at.slice(0, 16)}</span>
                    )}
                  </div>
                  {a.summary && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{a.summary.replace(/<[^>]+>/g, "")}</p>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {result && result.articles.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">
            「{result.q}」のニュースが見つかりませんでした
          </p>
        )}
      </main>
    </div>
  );
}
