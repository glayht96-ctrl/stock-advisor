import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Indicators, PricePatterns } from "../types";

interface Props {
  ticker: string;
  claudeEnabled: boolean | null;
  indicators?: Indicators | null;
  pricePatterns?: PricePatterns | null;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

// ── クライアントサイドでテクニカルスコアを計算 ─────────────────────────────
function computeTechScore(ind?: Indicators | null): number {
  if (!ind) return 50;
  let s = 50;
  const { rsi_14, macd, sma_20, sma_50, sma_200 } = ind;
  if (rsi_14 !== null && rsi_14 !== undefined) {
    if (rsi_14 > 70) s -= 10;
    else if (rsi_14 < 30) s += 10;
    else if (rsi_14 > 60) s += 5;
    else if (rsi_14 < 40) s -= 5;
  }
  if (macd.histogram !== null && macd.histogram !== undefined)
    s += macd.histogram > 0 ? 8 : -8;
  // SMA alignment bonus
  if (sma_20 !== null && sma_50 !== null && sma_200 !== null) {
    if (sma_20 > sma_50 && sma_50 > sma_200) s += 10;
    else if (sma_20 < sma_50 && sma_50 < sma_200) s -= 10;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

function computeMomScore(pat?: PricePatterns | null): number {
  if (!pat) return 50;
  let s = 50;
  s += Math.min(15, Math.max(-15, (pat.return_5d  ?? 0) * 2));
  s += Math.min(12, Math.max(-12, (pat.return_20d ?? 0) * 0.7));
  s += Math.min(8,  Math.max(-8,  (pat.return_60d ?? 0) * 0.3));
  if (pat.new_high_20d) s += 5;
  if (pat.new_low_20d)  s -= 5;
  const gcCount = pat.golden_crosses?.length ?? 0;
  const dcCount = pat.dead_crosses?.length ?? 0;
  if (gcCount > dcCount) s += 6;
  if (dcCount > gcCount) s -= 6;
  if ((pat.volume_spikes?.length ?? 0) > 0) s += 3;
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ── AI 出力テキストをセクションに分割 ────────────────────────────────────
interface Section { title: string; body: string }
function parseSections(text: string): Section[] {
  const lines  = text.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.replace(/^## /, "").trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections.length > 0 ? sections : [{ title: "", body: text }];
}

// ── セクションアイコン ────────────────────────────────────────────────────
function sectionIcon(title: string): string {
  if (title.includes("テクニカル")) return "📊";
  if (title.includes("ニュース")) return "📰";
  if (title.includes("総合")) return "🎯";
  if (title.includes("注目")) return "⚡";
  return "•";
}

// ── スコアゲージ ─────────────────────────────────────────────────────────
function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 60 ? "bg-emerald-500" : score <= 40 ? "bg-red-500" : "bg-yellow-500";
  const textColor = score >= 60 ? "text-emerald-400" : score <= 40 ? "text-red-400" : "text-yellow-400";
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-xs font-bold ${textColor}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const mdComponents = {
  p:      ({ children }: any) => <p className="mb-2 text-sm text-gray-200 leading-relaxed">{children}</p>,
  strong: ({ children }: any) => <strong className="text-white font-semibold">{children}</strong>,
  h1:     ({ children }: any) => <h1 className="text-base font-bold text-white mb-2 mt-3">{children}</h1>,
  h2:     ({ children }: any) => <h2 className="text-sm font-bold text-gray-100 mb-1 mt-3">{children}</h2>,
  ul:     ({ children }: any) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
  ol:     ({ children }: any) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
  li:     ({ children }: any) => <li className="text-sm text-gray-200">{children}</li>,
};

export function AnalysisPanel({ ticker, claudeEnabled, indicators, pricePatterns }: Props) {
  const [analysis,    setAnalysis]    = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [structured,  setStructured]  = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const techScore = computeTechScore(indicators);
  const momScore  = computeMomScore(pricePatterns);
  const totalScore = Math.round(techScore * 0.5 + momScore * 0.5);
  const verdict = totalScore >= 60 ? "強気" : totalScore <= 40 ? "弱気" : "中立";
  const verdictColor = totalScore >= 60 ? "text-emerald-400 bg-emerald-950 border-emerald-800"
                     : totalScore <= 40 ? "text-red-400 bg-red-950 border-red-800"
                     : "text-yellow-400 bg-yellow-950 border-yellow-800";

  const run = () => {
    esRef.current?.close();
    setAnalysis("");
    setLoading(true);
    setError(null);
    setStructured(false);

    const es = new EventSource(`${BASE_URL}/stock/${ticker}/analysis/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        es.close();
        setLoading(false);
        setStructured(true);
        return;
      }
      try {
        const { text } = JSON.parse(e.data) as { text: string };
        setAnalysis(prev => (prev ?? "") + text);
      } catch {}
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
    setStructured(false);
  };

  const sections = analysis ? parseSections(analysis) : [];
  const hasStructure = structured && sections.length > 1;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">🤖 AI 総合分析</h2>
          {claudeEnabled === false && (
            <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">APIキー未設定</span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {analysis && !loading && (
            <button onClick={reset} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              クリア
            </button>
          )}
          <button
            onClick={run} disabled={loading}
            className="text-xs bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {loading && <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "分析中..." : analysis ? "再分析" : "分析する"}
          </button>
        </div>
      </div>

      {/* スコアゲージ（indicators がある場合に常時表示） */}
      {indicators && (
        <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">テクニカルスコア</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${verdictColor}`}>{verdict}</span>
            <span className="text-xs text-gray-400 ml-auto font-mono">{totalScore}/100</span>
          </div>
          <div className="flex gap-3">
            <ScoreGauge score={techScore}  label="テクニカル" />
            <ScoreGauge score={momScore}   label="モメンタム" />
          </div>
        </div>
      )}

      {/* 初期ガイド */}
      {analysis === null && !loading && !error && (
        <p className="text-xs text-gray-600">
          {claudeEnabled
            ? "「分析する」を押すと Gemini がテクニカル指標・ニュース・価格パターンをリアルタイムで総合分析します"
            : ".env に GEMINI_API_KEY を設定すると AI 分析が有効になります"}
        </p>
      )}

      {error && <p className="text-xs text-red-400">⚠️ {error}</p>}

      {/* 分析結果 */}
      {(analysis !== null || loading) && (
        <>
          {hasStructure ? (
            /* 4セクション構造化表示 */
            <div className="space-y-3">
              {sections.map((sec, i) => (
                <div key={i} className="bg-gray-800/40 rounded-lg p-3">
                  {sec.title && (
                    <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-1.5">
                      <span>{sectionIcon(sec.title)}</span>
                      <span>{sec.title}</span>
                    </h3>
                  )}
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown components={mdComponents}>{sec.body.trim()}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ストリーミング中はそのまま表示 */
            <div className="prose prose-sm prose-invert max-w-none text-gray-200 leading-relaxed">
              <ReactMarkdown components={mdComponents}>{analysis ?? ""}</ReactMarkdown>
              {loading && (
                <span className="inline-block w-1 h-4 bg-violet-400 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
