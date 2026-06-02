import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface DiscoverStock {
  ticker:        string;
  name:          string | null;
  current_price: number | null;
  change_pct:    number;
  currency:      string | null;
  sector:        string;
  market:        string;
  rsi:           number | null;
  volume:        number;
  avg_volume:    number;
  signals:       string[];
}

interface Props {
  onNavigate: (ticker: string) => void;
}

function signalStyle(sig: string): string {
  if (/^急(騰|落)/.test(sig))   return "bg-red-900/60 text-red-300 border border-red-800";
  if (sig.startsWith("出来高"))  return "bg-amber-900/60 text-amber-300 border border-amber-800";
  if (sig.startsWith("RSI"))    return "bg-purple-900/60 text-purple-300 border border-purple-800";
  if (/^[GD]C/.test(sig))       return "bg-blue-900/60 text-blue-300 border border-blue-800";
  if (sig.startsWith("MACD"))   return "bg-teal-900/60 text-teal-300 border border-teal-800";
  return "bg-gray-800 text-gray-400 border border-gray-700";
}

const mdComponents = {
  p:      ({ children }: any) => <p className="mb-2 text-sm text-gray-200">{children}</p>,
  strong: ({ children }: any) => <strong className="text-white font-semibold">{children}</strong>,
  h1:     ({ children }: any) => <h1 className="text-base font-bold text-white mb-2 mt-3">{children}</h1>,
  h2:     ({ children }: any) => <h2 className="text-sm font-bold text-gray-100 mb-1 mt-3">{children}</h2>,
  ul:     ({ children }: any) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
  ol:     ({ children }: any) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
  li:     ({ children }: any) => <li className="text-sm text-gray-200">{children}</li>,
};

export function DiscoverPanel({ onNavigate }: Props) {
  const [stocks,         setStocks]         = useState<DiscoverStock[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [comment,        setComment]        = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const fetchDiscover = async () => {
    setLoading(true);
    setError(null);
    setComment(null);
    try {
      const res = await fetch(`${BASE_URL}/discover/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStocks(data.results ?? []);
    } catch {
      setError("データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDiscover(); }, []);

  const fetchComment = () => {
    esRef.current?.close();
    setComment("");
    setCommentLoading(true);

    const es = new EventSource(`${BASE_URL}/discover/comment`);
    esRef.current = es;

    es.onmessage = (e) => {
      if (e.data === "[DONE]") { es.close(); setCommentLoading(false); return; }
      try {
        const { text } = JSON.parse(e.data) as { text: string };
        setComment(prev => (prev ?? "") + text);
      } catch {}
    };

    es.onerror = () => { es.close(); setCommentLoading(false); };
  };

  return (
    <section>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          🔥 本日の注目銘柄
        </h2>
        <button
          onClick={fetchDiscover}
          disabled={loading}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
        >
          {loading ? "取得中…" : "更新"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">⚠️ {error}</p>}

      {/* スケルトン */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 animate-pulse h-[88px]" />
          ))}
        </div>
      )}

      {/* 銘柄カード */}
      {!loading && stocks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {stocks.map((s) => (
            <button
              key={s.ticker}
              onClick={() => onNavigate(s.ticker)}
              className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-3 text-left transition-colors group"
            >
              {/* 行1: ティッカー + 騰落率 */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-none">
                    {s.ticker}
                  </span>
                  <span className="text-[10px] text-gray-600 font-medium">{s.market}</span>
                </div>
                <span className={`text-sm font-bold leading-none ${
                  (s.change_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {(s.change_pct ?? 0) >= 0 ? "+" : ""}{(s.change_pct ?? 0).toFixed(2)}%
                </span>
              </div>

              {/* 行2: 名称 + 現在値 */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-gray-500 truncate flex-1 mr-2">{s.name ?? "-"}</p>
                {s.current_price != null && (
                  <p className="text-[11px] text-gray-400 whitespace-nowrap">
                    {s.current_price.toLocaleString()} <span className="text-gray-600">{s.currency ?? ""}</span>
                  </p>
                )}
              </div>

              {/* シグナルバッジ */}
              {s.signals.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.signals.map((sig, i) => (
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${signalStyle(sig)}`}>
                      {sig}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && stocks.length === 0 && !error && (
        <p className="text-xs text-gray-600 mb-4">データを取得中です。しばらくお待ちください。</p>
      )}

      {/* AI コメントエリア */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400">🤖 AIに今日の相場を聞く</span>
          <button
            onClick={fetchComment}
            disabled={commentLoading || stocks.length === 0}
            className="text-xs bg-violet-700 hover:bg-violet-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {commentLoading && (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {commentLoading ? "生成中…" : comment ? "再生成" : "解説を生成"}
          </button>
        </div>

        {comment === null && !commentLoading && (
          <p className="text-xs text-gray-600">
            注目銘柄リストをもとに今日の市場動向をAIが整理します（事実ベース・投資助言なし）
          </p>
        )}

        {(comment !== null || commentLoading) && (
          <div className="prose prose-sm prose-invert max-w-none text-gray-200 leading-relaxed mt-1">
            <ReactMarkdown components={mdComponents}>{comment ?? ""}</ReactMarkdown>
            {commentLoading && (
              <span className="inline-block w-1 h-4 bg-violet-400 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
