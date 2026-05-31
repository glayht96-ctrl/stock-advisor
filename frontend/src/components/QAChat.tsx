import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

interface Props {
  ticker: string;
  claudeEnabled: boolean | null;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export function QAChat({ ticker, claudeEnabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ticker が変わったら会話をリセット
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [ticker]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);

    // ユーザーメッセージを追加
    const newMessages = [...messages, { role: "user" as const, text: q }];
    setMessages(newMessages);

    // AI 返答のプレースホルダー（ストリーミング中）
    setMessages(prev => [...prev, { role: "assistant", text: "", streaming: true }]);

    // 会話履歴（最新のユーザー発言の一つ前まで）を整形
    const history = newMessages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.text,
    }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BASE_URL}/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, question: q, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { reader.cancel(); break; }
          try {
            const { text } = JSON.parse(data) as { text: string };
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = { ...last, text: last.text + text };
              return updated;
            });
          } catch {
            // JSON parse error — ignore
          }
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", text: "通信エラーが発生しました" };
        return updated;
      });
    } finally {
      // streaming フラグを落とす
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
        return updated;
      });
      setLoading(false);
    }
  };

  const PRESETS = [
    "RSIは今どう見る？",
    "MACDのシグナルは？",
    "移動平均との位置関係は？",
    "ボリンジャーバンドは？",
    "直近の注目ポイントは？",
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">💬 銘柄Q&A</h2>
          {claudeEnabled === false && (
            <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">簡易モード</span>
          )}
          {claudeEnabled === true && (
            <span className="text-xs bg-violet-950 text-violet-400 border border-violet-800 px-2 py-0.5 rounded-full">Claude 有効</span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            履歴クリア
          </button>
        )}
      </div>

      {/* プリセット（初回のみ表示） */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="text-xs text-gray-400 border border-gray-700 hover:border-violet-500 hover:text-violet-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* メッセージ一覧 */}
      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1 scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[85%] bg-violet-600 text-white rounded-xl px-4 py-2.5 text-sm">
                  {m.text}
                </div>
              ) : (
                <div className="max-w-[90%] bg-gray-800 text-gray-200 rounded-xl px-4 py-2.5 text-sm leading-relaxed">
                  {m.text ? (
                    <>
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p:      ({ children }) => <p className="mb-1.5 text-sm text-gray-200 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                            ul:     ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1.5">{children}</ul>,
                            ol:     ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1.5">{children}</ol>,
                            li:     ({ children }) => <li className="text-sm text-gray-200">{children}</li>,
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                      {m.streaming && (
                        <span className="inline-block w-1 h-3.5 bg-violet-400 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 animate-pulse">考え中...</span>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* 入力エリア */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`${ticker}について質問する...`}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          送信
        </button>
      </div>
    </div>
  );
}
