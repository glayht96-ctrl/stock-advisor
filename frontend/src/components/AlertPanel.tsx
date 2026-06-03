import { useState } from "react";
import { useAlerts } from "../hooks/useAlerts";
import type { AlertIndicator, AlertDirection } from "../hooks/useAlerts";

interface Props { ticker: string }
type Tab = "settings" | "history";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";
const LINE_KEY  = "line-notify-token";
const LINE_ON   = "line-notify-enabled";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function loadLineToken() {
  return localStorage.getItem(LINE_KEY) || "";
}
function loadLineEnabled() {
  return localStorage.getItem(LINE_ON) === "true";
}

export function AlertPanel({ ticker }: Props) {
  const { alerts, addAlert, removeAlert, history, newCount,
          clearHistory, clearNewCount, requestPermission } = useAlerts();
  const [tab,         setTab]         = useState<Tab>("settings");
  const [form,        setForm]        = useState({
    ticker, indicator: "RSI" as AlertIndicator,
    threshold: 70, direction: "above" as AlertDirection,
  });
  const [lineToken,   setLineToken]   = useState(loadLineToken);
  const [lineEnabled, setLineEnabled] = useState(loadLineEnabled);
  const [showLine,    setShowLine]    = useState(false);
  const [testStatus,  setTestStatus]  = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const switchToHistory = () => { setTab("history"); clearNewCount(); };

  const handleAdd = () => {
    if (!form.ticker.trim()) return;
    requestPermission();
    addAlert({
      ticker: form.ticker.trim().toUpperCase(),
      indicator: form.indicator,
      threshold: form.threshold,
      direction: form.direction,
    });
  };

  const saveLineToken = (token: string) => {
    setLineToken(token);
    localStorage.setItem(LINE_KEY, token);
  };

  const toggleLine = (on: boolean) => {
    setLineEnabled(on);
    localStorage.setItem(LINE_ON, String(on));
  };

  const sendTest = async () => {
    if (!lineToken) { setTestStatus("トークンを入力してください"); return; }
    setTestLoading(true);
    setTestStatus(null);
    try {
      const res = await fetch(`${BASE_URL}/alert/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_token: lineToken }),
      });
      const d = await res.json();
      setTestStatus(d.success ? "✅ テスト通知を送信しました" : `❌ ${d.message}`);
    } catch {
      setTestStatus("❌ 通信エラー");
    } finally {
      setTestLoading(false);
    }
  };

  const dirColor = (d: AlertDirection) =>
    d === "above" ? "text-red-400" : "text-emerald-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      {/* タブヘッダー */}
      <div className="flex items-center gap-1 mb-4">
        <button onClick={() => setTab("settings")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "settings" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
          アラート設定
        </button>
        <button onClick={switchToHistory}
          className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "history" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
          履歴
          {newCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </button>
        <button onClick={() => setShowLine(s => !s)}
          className={`ml-auto px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            lineEnabled ? "bg-green-900 text-green-300 border border-green-700" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
          LINE通知 {lineEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {/* ── LINE通知設定パネル ── */}
      {showLine && (
        <div className="bg-gray-800 rounded-lg p-3 mb-4 space-y-3">
          <p className="text-xs font-semibold text-gray-300">LINE Notify 設定</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-20 shrink-0">トークン</label>
            <input
              type="password"
              value={lineToken}
              onChange={e => saveLineToken(e.target.value)}
              placeholder="LINE Notifyトークンを貼り付け"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-600"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lineEnabled}
                onChange={e => toggleLine(e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
              <span className="text-xs text-gray-400">アラート発火時にLINE通知を送る</span>
            </label>
            <button onClick={sendTest} disabled={testLoading}
              className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors">
              {testLoading ? "送信中..." : "テスト送信"}
            </button>
          </div>
          {testStatus && (
            <p className="text-xs text-gray-300">{testStatus}</p>
          )}
          <p className="text-[10px] text-gray-600">
            LINE Notifyトークンは <span className="text-blue-400">notify-bot.line.me/en/manage</span> で発行できます
          </p>
        </div>
      )}

      {/* ── 設定タブ ── */}
      {tab === "settings" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input type="text" value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))}
              placeholder="銘柄 (例: AAPL)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 w-32 focus:outline-none focus:border-emerald-600"/>
            <select value={form.indicator}
              onChange={e => setForm(f => ({ ...f, indicator: e.target.value as AlertIndicator }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600">
              <option value="RSI">RSI</option>
              <option value="price">株価</option>
            </select>
            <select value={form.direction}
              onChange={e => setForm(f => ({ ...f, direction: e.target.value as AlertDirection }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600">
              <option value="above">以上 (≥)</option>
              <option value="below">以下 (≤)</option>
            </select>
            <input type="number" value={form.threshold}
              onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white w-24 focus:outline-none focus:border-emerald-600"/>
            <button onClick={handleAdd}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">
              追加
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className="text-gray-600 text-xs">アラートなし。条件を設定すると30秒ごとにチェックします。</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-white">{a.ticker}</span>
                    <span className="text-gray-400">{a.indicator}</span>
                    <span className={dirColor(a.direction)}>
                      {a.direction === "above" ? "≥" : "≤"} {a.threshold}
                    </span>
                    {lineEnabled && <span className="text-[10px] text-green-500">LINE有効</span>}
                  </div>
                  <button onClick={() => removeAlert(a.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none ml-3">×</button>
                </div>
              ))}
            </div>
          )}

          {Notification.permission === "denied" && (
            <p className="text-xs text-yellow-600 mt-3">
              ブラウザ通知が拒否されています。ブラウザの設定から通知を許可してください。
            </p>
          )}
        </>
      )}

      {/* ── 履歴タブ ── */}
      {tab === "history" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">{history.length} 件の発火履歴</p>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                履歴をクリア
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-gray-600 text-xs">履歴なし。アラートが発火するとここに記録されます。</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2 text-xs">
                  <span className="font-bold text-white shrink-0">{h.ticker}</span>
                  <span className="text-gray-400 shrink-0">{h.condition}</span>
                  <span className="text-emerald-400 font-mono shrink-0">={h.value.toFixed(2)}</span>
                  <span className="text-gray-600 ml-auto shrink-0">{fmtDate(h.triggeredAt)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
