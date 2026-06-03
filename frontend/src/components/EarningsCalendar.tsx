import { useState, useEffect } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface EarningsItem {
  ticker:           string;
  name:             string;
  earnings_date:    string;
  days_until:       number;
  eps_estimate:     number | null;
  revenue_estimate: number | null;
}

interface Props {
  tickers: string[];
  onNavigate?: (ticker: string) => void;
  compact?: boolean;  // ホーム画面用ミニ表示
}

function urgencyBadge(days: number) {
  if (days <= 3)  return "bg-red-900/60 text-red-300 border border-red-700";
  if (days <= 7)  return "bg-amber-900/60 text-amber-300 border border-amber-700";
  if (days <= 14) return "bg-yellow-900/40 text-yellow-300 border border-yellow-700";
  return "bg-gray-800 text-gray-400 border border-gray-700";
}

function CalendarGrid({ items, onNavigate }: { items: EarningsItem[]; onNavigate?: (t: string) => void }) {
  const byDate: Record<string, EarningsItem[]> = {};
  for (const item of items) {
    if (!byDate[item.earnings_date]) byDate[item.earnings_date] = [];
    byDate[item.earnings_date].push(item);
  }

  return (
    <div className="space-y-3">
      {Object.entries(byDate).map(([date, its]) => (
        <div key={date}>
          <p className="text-xs text-gray-500 font-semibold mb-1">{date}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {its.map(it => (
              <button key={it.ticker} onClick={() => onNavigate?.(it.ticker)}
                className="bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-left transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{it.ticker}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${urgencyBadge(it.days_until)}`}>
                    {it.days_until === 0 ? "今日" : `あと${it.days_until}日`}
                    {it.days_until <= 7 ? " 🔔" : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{it.name}</p>
                {it.eps_estimate !== null && (
                  <p className="text-[10px] text-gray-600 mt-0.5">EPS予想: {it.eps_estimate}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ items, onNavigate }: { items: EarningsItem[]; onNavigate?: (t: string) => void }) {
  return (
    <div className="divide-y divide-gray-800">
      {items.map(it => (
        <button key={it.ticker} onClick={() => onNavigate?.(it.ticker)}
          className="w-full flex items-center gap-3 py-2.5 hover:bg-gray-800/50 transition-colors text-left px-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{it.ticker}</span>
              {it.days_until <= 7 && <span className="text-xs">🔔</span>}
            </div>
            <p className="text-xs text-gray-500 truncate">{it.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">{it.earnings_date}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${urgencyBadge(it.days_until)}`}>
              {it.days_until === 0 ? "今日" : `あと${it.days_until}日`}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function EarningsCalendar({ tickers, onNavigate, compact = false }: Props) {
  const [items,   setItems]   = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [view,    setView]    = useState<"list" | "calendar">("list");

  useEffect(() => {
    if (!tickers.length) return;
    setLoading(true);
    fetch(`${BASE_URL}/earnings/calendar?tickers=${tickers.join(",")}`)
      .then(r => r.json())
      .then(d => setItems(d.earnings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tickers.join(",")]);

  if (compact) {
    // ホーム画面ミニウィジェット
    const soon = items.filter(i => i.days_until <= 30);
    if (!soon.length && !loading) return null;
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📅 今後の決算</p>
        {loading ? (
          <div className="h-8 bg-gray-800 rounded animate-pulse" />
        ) : (
          <div className="space-y-1">
            {soon.slice(0, 5).map(it => (
              <button key={it.ticker} onClick={() => onNavigate?.(it.ticker)}
                className="w-full flex items-center justify-between hover:bg-gray-800 rounded px-2 py-1 transition-colors">
                <span className="text-xs text-white font-medium">{it.ticker}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${urgencyBadge(it.days_until)}`}>
                  {it.days_until === 0 ? "今日" : `${it.days_until}日後`}{it.days_until <= 7 ? " 🔔" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Analysis.tsx 内フル表示
  if (!loading && !items.length) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          📅 決算カレンダー
        </h2>
        {items.length > 0 && (
          <div className="flex gap-1">
            {(["list","calendar"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  view === v ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                {v === "list" ? "リスト" : "カレンダー"}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse"/>)}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-xs text-gray-600">直近30日以内の決算予定が見つかりません。</p>
      )}

      {!loading && items.length > 0 && (
        view === "list"
          ? <ListView  items={items} onNavigate={onNavigate} />
          : <CalendarGrid items={items} onNavigate={onNavigate} />
      )}
    </div>
  );
}
