import { useState, useEffect, useCallback } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

interface Props {
  autoLoad?: boolean;
}

async function* readSSE(url: string) {
  const resp = await fetch(url);
  if (!resp.ok) return;
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const d = line.slice(6);
        if (d === "[DONE]") return;
        try { const p = JSON.parse(d); if (p.text) yield p.text as string; } catch {}
      }
    }
  }
}

export function MorningReport({ autoLoad = false }: Props) {
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loaded,    setLoaded]    = useState(false);

  const load = useCallback(async (force = false) => {
    if (loading) return;
    setLoading(true);
    setText("");
    try {
      const url = `${BASE_URL}/morning-report/stream${force ? "?force=true" : ""}`;
      for await (const chunk of readSSE(url)) {
        setText(t => t + chunk);
      }
      setLoaded(true);
    } catch {}
    setLoading(false);
  }, [loading]);

  useEffect(() => {
    if (autoLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // マークダウン風テキストを整形表示
  const renderText = (t: string) => {
    return t.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <p key={i} className="font-bold text-white mt-3 mb-1 text-sm">
            {line.slice(3)}
          </p>
        );
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <p key={i} className="text-gray-300 pl-3 text-xs before:content-['•'] before:mr-2 before:text-gray-500">
            {line.slice(2)}
          </p>
        );
      }
      if (!line.trim()) return <br key={i} />;
      return <p key={i} className="text-gray-300 text-xs leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-xl mb-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h2 className="text-sm font-semibold text-gray-200">今日の相場レポート</h2>
          {loaded && !loading && (
            <span className="text-[10px] text-gray-600">（1時間キャッシュ）</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(loaded || loading) && (
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
            >
              {loading ? "生成中..." : "🔄 更新"}
            </button>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            {collapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {!collapsed && (
        <div className="px-4 py-3">
          {!text && !loading && !loaded && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 mb-3">
                AIが主要指数・ニュースを分析して今日の相場概況を生成します
              </p>
              <button
                onClick={() => load(false)}
                className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                📊 レポートを生成
              </button>
            </div>
          )}

          {loading && !text && (
            <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
              <span className="inline-block w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>相場データを収集してレポートを生成中...</span>
            </div>
          )}

          {text && (
            <div className="space-y-0.5">
              {renderText(text)}
              {loading && (
                <span className="inline-block w-1.5 h-3.5 bg-emerald-500 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
