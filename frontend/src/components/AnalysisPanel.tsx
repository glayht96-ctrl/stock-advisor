import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  ticker: string;
  claudeEnabled: boolean | null;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export function AnalysisPanel({ ticker, claudeEnabled }: Props) {
  const [analysis, setAnalysis]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const run = () => {
    // 前回の SSE があれば閉じる
    esRef.current?.close();
    setAnalysis("");
    setLoading(true);
    setError(null);

    const es = new EventSource(`${BASE_URL}/stock/${ticker}/analysis/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        es.close();
        setLoading(false);
        return;
      }
      try {
        const { text } = JSON.parse(e.data) as { text: string };
        setAnalysis(prev => (prev ?? "") + text);
      } catch {
        // JSON parse error — ignore partial chunk
      }
    };

    es.onerror = () => {
      es.close();
      setLoading(false);
      if (!analysis && analysis !== "") setError("分析エラーが発生しました");
    };
  };

  const reset = () => {
    esRef.current?.close();
    setAnalysis(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">🤖 AI 総合分析</h2>
          {claudeEnabled === false && (
            <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">APIキー未設定</span>
          )}
          {claudeEnabled === true && (
            <span className="text-xs bg-violet-950 text-violet-400 border border-violet-800 px-2 py-0.5 rounded-full">
              Claude {claudeEnabled ? "有効" : ""}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {analysis && !loading && (
            <button onClick={reset}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              クリア
            </button>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="text-xs bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {loading && (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "分析中..." : analysis ? "再分析" : "分析する"}
          </button>
        </div>
      </div>

      {/* 初期ガイド */}
      {analysis === null && !loading && !error && (
        <p className="text-xs text-gray-600">
          {claudeEnabled
            ? "「分析する」を押すと Gemini がテクニカル指標・ニュースをリアルタイムで総合分析します"
            : ".env に GEMINI_API_KEY を設定すると AI 分析が有効になります（未設定でも簡易分析を表示できます）"}
        </p>
      )}

      {/* エラー */}
      {error && <p className="text-xs text-red-400">⚠️ {error}</p>}

      {/* 結果（ストリーミング表示） */}
      {(analysis !== null || loading) && (
        <div id="analysis-panel-content" className="prose prose-sm prose-invert max-w-none text-gray-200 leading-relaxed">
          <ReactMarkdown
            components={{
              p:      ({ children }) => <p className="mb-2 text-sm text-gray-200">{children}</p>,
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              h1:     ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-3">{children}</h1>,
              h2:     ({ children }) => <h2 className="text-sm font-bold text-gray-100 mb-1 mt-3">{children}</h2>,
              ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
              ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
              li:     ({ children }) => <li className="text-sm text-gray-200">{children}</li>,
            }}
          >
            {analysis ?? ""}
          </ReactMarkdown>
          {loading && (
            <span className="inline-block w-1 h-4 bg-violet-400 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      )}
    </div>
  );
}
