import { useState, useRef } from "react";

const BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface PortfolioItem {
  ticker: string;
  amount: string;
}

interface Props {
  onBack: () => void;
}

export function Portfolio({ onBack }: Props) {
  const [items, setItems] = useState<PortfolioItem[]>([
    { ticker: "", amount: "" },
  ]);
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addRow = () => setItems(prev => [...prev, { ticker: "", amount: "" }]);

  const removeRow = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof PortfolioItem, value: string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleAnalyze = async () => {
    const valid = items.filter(i => i.ticker.trim() && Number(i.amount) > 0);
    if (valid.length === 0) {
      setError("銘柄と保有数量を入力してください。");
      return;
    }
    setError(null);
    setAnalysis("");
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE_URL}/portfolio/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: valid.map(i => i.ticker.trim().toUpperCase()),
          amounts: valid.map(i => Number(i.amount)),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("ストリームを開けませんでした");

      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") { setLoading(false); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) setAnalysis(prev => prev + parsed.text);
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "分析エラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm shrink-0">
            ← 戻る
          </button>
          <h1 className="font-bold text-white text-lg">ポートフォリオ一括分析</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* 入力フォーム */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">保有銘柄</h2>

          <div className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.ticker}
                  onChange={e => updateItem(idx, "ticker", e.target.value)}
                  placeholder="銘柄コード (例: AAPL, 7203.T)"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600"
                />
                <input
                  type="number"
                  value={item.amount}
                  onChange={e => updateItem(idx, "amount", e.target.value)}
                  placeholder="保有数量"
                  min="0"
                  className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600"
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeRow(idx)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={addRow}
              className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              + 銘柄を追加
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="ml-auto bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-6 py-2 rounded-lg transition-colors font-medium"
            >
              {loading ? "分析中..." : "AI分析を実行"}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-3">{error}</p>
          )}
        </div>

        {/* 分析結果 */}
        {(analysis || loading) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">分析結果</h2>
            {loading && !analysis && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                データ取得・分析中...
              </div>
            )}
            {analysis && (
              <div className="prose prose-invert prose-sm max-w-none text-gray-200 whitespace-pre-wrap leading-relaxed">
                {analysis}
                {loading && <span className="inline-block w-1 h-4 bg-emerald-400 ml-0.5 animate-pulse" />}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
