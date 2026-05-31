import { useState } from "react";
import { useAlerts } from "../hooks/useAlerts";
import type { AlertIndicator, AlertDirection } from "../hooks/useAlerts";

interface Props {
  ticker: string;
}

type Tab = "settings" | "history";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AlertPanel({ ticker }: Props) {
  const { alerts, addAlert, removeAlert, history, newCount, clearHistory, clearNewCount, requestPermission } = useAlerts();
  const [tab, setTab] = useState<Tab>("settings");
  const [form, setForm] = useState({
    ticker,
    indicator: "RSI" as AlertIndicator,
    threshold: 70,
    direction: "above" as AlertDirection,
  });

  const switchToHistory = () => {
    setTab("history");
    clearNewCount();
  };

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

  const dirColor = (d: AlertDirection) => d === "above" ? "text-red-400" : "text-emerald-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      {/* タブヘッダー */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setTab("settings")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "settings"
              ? "bg-gray-700 text-white"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
          }`}
        >
          アラート設定
        </button>
        <button
          onClick={switchToHistory}
          className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "history"
              ? "bg-gray-700 text-white"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
          }`}
        >
          履歴
          {newCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </button>
      </div>

      {/* ── 設定タブ ── */}
      {tab === "settings" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))}
              placeholder="銘柄 (例: AAPL)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 w-32 focus:outline-none focus:border-emerald-600"
            />
            <select
              value={form.indicator}
              onChange={e => setForm(f => ({ ...f, indicator: e.target.value as AlertIndicator }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
            >
              <option value="RSI">RSI</option>
              <option value="price">株価</option>
            </select>
            <select
              value={form.direction}
              onChange={e => setForm(f => ({ ...f, direction: e.target.value as AlertDirection }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
            >
              <option value="above">以上 (≥)</option>
              <option value="below">以下 (≤)</option>
            </select>
            <input
              type="number"
              value={form.threshold}
              onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white w-24 focus:outline-none focus:border-emerald-600"
            />
            <button
              onClick={handleAdd}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
            >
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
                  </div>
                  <button
                    onClick={() => removeAlert(a.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none ml-3"
                  >
                    ×
                  </button>
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
              <button
                onClick={clearHistory}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
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
