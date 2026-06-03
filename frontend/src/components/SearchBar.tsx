import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { useSearchHistory, type HistoryEntry } from "../hooks/useSearchHistory";

interface SearchResult {
  ticker:  string;
  name_ja: string;
  name_en: string;
  sector:  string;
  market:  string;
}

interface Props {
  onSearch:  (ticker: string) => void;
  loading?:  boolean;
  compact?:  boolean;   // ヘッダー内の小型版
  autoFocus?: boolean;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

function MarketBadge({ market }: { market: string }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
      market === "JP"
        ? "bg-red-900/60 text-red-300"
        : market === "US"
        ? "bg-blue-900/60 text-blue-300"
        : "bg-gray-800 text-gray-500"
    }`}>
      {market || "—"}
    </span>
  );
}

function ResultCard({ result, active, onSelect }:
  { result: SearchResult; active: boolean; onSelect: () => void }) {
  return (
    <button onMouseDown={e => { e.preventDefault(); onSelect(); }}
      className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 ${
        active ? "bg-emerald-900/40" : "hover:bg-gray-800"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{result.ticker}</span>
          <MarketBadge market={result.market} />
          <span className="text-xs text-gray-500 truncate">{result.sector}</span>
        </div>
        <p className="text-xs text-gray-400 truncate">
          {result.name_ja !== result.ticker ? result.name_ja : result.name_en}
        </p>
      </div>
      <span className="text-gray-700 text-xs shrink-0">→</span>
    </button>
  );
}

function HistoryCard({ entry, active, onSelect }:
  { entry: HistoryEntry; active: boolean; onSelect: () => void }) {
  return (
    <button onMouseDown={e => { e.preventDefault(); onSelect(); }}
      className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 ${
        active ? "bg-emerald-900/40" : "hover:bg-gray-800"}`}>
      <span className="text-gray-600 text-sm shrink-0">🕐</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-300">{entry.ticker}</span>
          {entry.market && <MarketBadge market={entry.market} />}
        </div>
        {entry.name_ja && entry.name_ja !== entry.ticker && (
          <p className="text-xs text-gray-500 truncate">{entry.name_ja}</p>
        )}
      </div>
    </button>
  );
}

export function SearchBar({ onSearch, loading: _loading, compact = false, autoFocus = false }: Props) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [noResult,  setNoResult]  = useState(false);

  const { history, add, clear } = useSearchHistory();
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout>>();
  const abortRef     = useRef<AbortController>();

  // 外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // オートフォーカス
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // インクリメンタルサーチ
  const doSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSearching(true);
    setNoResult(false);
    try {
      const res  = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`,
        { signal: abortRef.current.signal });
      const data = await res.json();
      const list: SearchResult[] = data.results ?? [];
      setResults(list);
      setNoResult(list.length === 0);
      setActiveIdx(-1);
      setOpen(true);
    } catch (e: any) {
      if (e.name !== "AbortError") { setResults([]); setNoResult(true); }
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setNoResult(false);
      setSearching(false);
      setOpen(history.length > 0);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 180);
    return () => clearTimeout(debounceRef.current);
  }, [query, history.length, doSearch]);

  const handleSelect = (result: SearchResult | HistoryEntry) => {
    const ticker = result.ticker.toUpperCase();
    const entry: HistoryEntry = {
      ticker,
      name_ja: result.name_ja ?? ticker,
      name_en: (result as SearchResult).name_en ?? ticker,
      market:  result.market ?? "",
      sector:  result.sector ?? "",
    };
    add(entry);
    setQuery("");
    setOpen(false);
    setResults([]);
    onSearch(ticker);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const items = query.trim() ? results : history;
    const count = items.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        setActiveIdx(i => Math.min(i + 1, count - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < count) {
          handleSelect(query.trim() ? results[activeIdx] : history[activeIdx]);
        } else if (query.trim()) {
          // 直接ティッカーとして遷移
          const direct = query.trim().toUpperCase();
          add({ ticker: direct, name_ja: direct, name_en: direct, market: "", sector: "" });
          setQuery(""); setOpen(false); onSearch(direct);
        }
        break;
      case "Escape":
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const showHistory  = !query.trim() && history.length > 0;
  const showResults  = !!query.trim() && results.length > 0;
  const showNoResult = !!query.trim() && noResult && !searching;
  const dropdownOpen = open && (showHistory || showResults || showNoResult || searching);

  return (
    <div className={`w-full ${compact ? "" : "max-w-2xl mx-auto"}`}>
      {!compact && (
        <p className="text-[11px] text-gray-600 text-right mb-1 pr-1">
          リスト外の銘柄も直接入力+Enterで検索できます
        </p>
      )}
      <div ref={containerRef} className="relative">
        {/* 入力フォーム */}
        <div className={`flex items-center gap-2 bg-gray-900 border rounded-2xl transition-colors ${
          open ? "border-emerald-500 shadow-lg shadow-emerald-900/20" : "border-gray-700 hover:border-gray-600"
        } ${compact ? "px-3 py-2" : "px-4 py-3.5"}`}>
          {/* 検索アイコン */}
          <span className="text-gray-500 shrink-0">
            {searching
              ? <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            }
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
            onFocus={() => { setOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder={compact ? "銘柄を検索..." : "銘柄名・コードで検索　例: トヨタ / AAPL / 7203 / PLTR"}
            className={`flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none ${
              compact ? "text-sm" : "text-base"
            }`}
          />

          {/* クリアボタン */}
          {query && (
            <button type="button" onClick={() => { setQuery(""); setResults([]); setOpen(true); inputRef.current?.focus(); }}
              className="text-gray-600 hover:text-gray-400 transition-colors text-xl leading-none shrink-0">×</button>
          )}
        </div>

        {/* ドロップダウン */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
            {/* 履歴 */}
            {showHistory && (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">最近の検索</span>
                  <button onClick={clear} className="text-xs text-gray-600 hover:text-red-400 transition-colors">クリア</button>
                </div>
                {history.map((entry, i) => (
                  <HistoryCard key={entry.ticker} entry={entry} active={i === activeIdx}
                    onSelect={() => handleSelect(entry)} />
                ))}
              </>
            )}

            {/* 検索結果 */}
            {showResults && (
              <>
                <div className="px-4 py-2 border-b border-gray-800">
                  <span className="text-xs text-gray-500">{results.length}件の候補</span>
                </div>
                {results.map((r, i) => (
                  <ResultCard key={r.ticker} result={r} active={i === activeIdx}
                    onSelect={() => handleSelect(r)} />
                ))}
              </>
            )}

            {/* 検索中 */}
            {searching && query.trim() && (
              <div className="px-4 py-4 text-center">
                <span className="text-xs text-gray-500">検索中...</span>
              </div>
            )}

            {/* 該当なし */}
            {showNoResult && (
              <div className="px-4 py-4">
                <p className="text-sm text-gray-500 text-center mb-2">
                  「{query}」はリストにありません
                </p>
                <button
                  onMouseDown={e => {
                    e.preventDefault();
                    const direct = query.trim().toUpperCase();
                    add({ ticker: direct, name_ja: direct, name_en: direct, market: "", sector: "" });
                    setQuery(""); setOpen(false); onSearch(direct);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800 rounded-lg transition-colors"
                >
                  <span className="text-sm text-emerald-400 font-medium">
                    「{query.trim().toUpperCase()}」を直接検索
                  </span>
                  <span className="text-xs text-emerald-600">Enter ↵</span>
                </button>
                <p className="text-[11px] text-gray-600 mt-2 text-center">
                  2914（JT）・6367（ダイキン）・PLTR・HOOD など任意のティッカーを検索できます
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
