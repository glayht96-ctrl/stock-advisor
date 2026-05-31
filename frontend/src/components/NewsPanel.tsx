import { useState } from "react";
import type { NewsData, NewsArticle } from "../types";

interface Props {
  data: NewsData;
  loading: boolean;
  ticker: string;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "今";
    if (min < 60) return `${min}分前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}時間前`;
    return `${Math.floor(hr / 24)}日前`;
  } catch { return ""; }
}

function SentimentBadge({ sentiment }: { sentiment: NewsArticle["sentiment"] }) {
  if (!sentiment) return null;
  const map = {
    positive: { label: "↑ポジ", cls: "bg-emerald-900/60 text-emerald-300 border border-emerald-800" },
    negative: { label: "↓ネガ", cls: "bg-red-900/60 text-red-300 border border-red-800" },
    neutral:  { label: "中立",  cls: "bg-gray-800 text-gray-400 border border-gray-700" },
  };
  const info = map[sentiment];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.cls}`}>{info.label}</span>;
}

function OverallBadge({ overall }: { overall: string | null }) {
  if (!overall) return null;
  const map: Record<string, string> = {
    positive: "text-emerald-400 bg-emerald-950 border-emerald-800",
    negative: "text-red-400 bg-red-950 border-red-800",
    neutral:  "text-gray-400 bg-gray-800 border-gray-700",
  };
  const label = overall === "positive" ? "全体: ポジティブ" : overall === "negative" ? "全体: ネガティブ" : "全体: 中立";
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${map[overall] ?? map.neutral}`}>
      {label}
    </span>
  );
}

export function NewsPanel({ data, loading, ticker }: Props) {
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState<NewsData | null>(null);

  const runSentiment = async () => {
    setSentimentLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/news/${ticker}?sentiment=true&limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSentimentData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setSentimentLoading(false);
    }
  };

  const display = sentimentData ?? data;

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">関連ニュース</h2>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse mb-4">
            <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            関連ニュース <span className="text-gray-600 font-normal">({display.total}件)</span>
          </h2>
          {display.overall_sentiment && <OverallBadge overall={display.overall_sentiment} />}
        </div>
        <button
          onClick={runSentiment}
          disabled={sentimentLoading}
          className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-1.5 rounded-lg transition-colors border border-gray-700"
        >
          {sentimentLoading ? "分析中..." : "🤖 センチメント分析"}
        </button>
      </div>

      {display.articles.length === 0 ? (
        <p className="text-gray-500 text-sm">ニュースが見つかりませんでした</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {display.articles.map((article, i) => (
            <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
              className="block py-3.5 hover:bg-gray-800/40 -mx-4 px-4 transition-colors group">
              <div className="flex items-start gap-3">
                <span className="text-base mt-0.5 shrink-0">📰</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200 font-medium group-hover:text-white leading-snug line-clamp-2">
                    {article.title}
                  </p>
                  {article.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{article.summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-600">{article.source}</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-xs text-gray-600">{timeAgo(article.published_at)}</span>
                    {article.lang === "en" && (
                      <span className="text-xs text-gray-700 border border-gray-700 rounded px-1">EN</span>
                    )}
                    <SentimentBadge sentiment={article.sentiment} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
