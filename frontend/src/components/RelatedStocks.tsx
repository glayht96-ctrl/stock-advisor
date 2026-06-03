import { useState, useEffect } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface RelatedStock {
  ticker:  string;
  name_ja: string;
  name_en: string;
  sector:  string;
  market:  string;
}

interface Props {
  ticker:     string;
  onNavigate: (ticker: string) => void;
}

export function RelatedStocks({ ticker, onNavigate }: Props) {
  const [stocks, setStocks]   = useState<RelatedStock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetch(`${BASE_URL}/search/related?ticker=${encodeURIComponent(ticker)}`)
      .then(r => r.json())
      .then(d => setStocks(d.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  if (!loading && stocks.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        🔗 関連銘柄（同セクター）
      </h2>

      {loading ? (
        <div className="flex gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex-1 h-14 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {stocks.map(s => (
            <button key={s.ticker} onClick={() => onNavigate(s.ticker)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-xl px-3 py-2.5 text-left transition-colors group flex-1 min-w-[120px]">
              <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-none">
                {s.ticker}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                {s.name_ja !== s.ticker ? s.name_ja : s.name_en}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
