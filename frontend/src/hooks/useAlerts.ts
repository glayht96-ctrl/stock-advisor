import { useState, useEffect, useRef } from "react";

const BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";
const STORAGE_KEY  = "stock-alerts";
const HISTORY_KEY  = "stock-alert-history";
const MAX_HISTORY  = 50;

export type AlertIndicator = "RSI" | "price";
export type AlertDirection = "above" | "below";

export interface StockAlert {
  id: string;
  ticker: string;
  indicator: AlertIndicator;
  threshold: number;
  direction: AlertDirection;
}

export interface AlertHistory {
  id: string;
  ticker: string;
  indicator: AlertIndicator;
  condition: string;    // human-readable: "RSI ≤ 30"
  triggeredAt: string;  // ISO datetime
  value: number;
}

function loadAlerts(): StockAlert[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveAlerts(a: StockAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}

function loadHistory(): AlertHistory[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(h: AlertHistory[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

export function useAlerts() {
  const [alerts,   setAlerts]   = useState<StockAlert[]>(loadAlerts);
  const [history,  setHistory]  = useState<AlertHistory[]>(loadHistory);
  const [newCount, setNewCount] = useState(0);
  const notifiedRef = useRef<Set<string>>(new Set());

  const addAlert = (alert: Omit<StockAlert, "id">) => {
    setAlerts(prev => {
      const next = [...prev, { ...alert, id: `${Date.now()}` }];
      saveAlerts(next);
      return next;
    });
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id);
      saveAlerts(next);
      notifiedRef.current.delete(id);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    setNewCount(0);
  };

  const clearNewCount = () => setNewCount(0);

  const _pushHistory = (alert: StockAlert, value: number) => {
    const dir  = alert.direction === "above" ? "≥" : "≤";
    const entry: AlertHistory = {
      id: `${Date.now()}-${alert.id}`,
      ticker: alert.ticker,
      indicator: alert.indicator,
      condition: `${alert.indicator} ${dir} ${alert.threshold}`,
      triggeredAt: new Date().toISOString(),
      value,
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
    setNewCount(c => c + 1);
  };

  useEffect(() => {
    if (!alerts.length) return;

    const check = async () => {
      const tickers = [...new Set(alerts.map(a => a.ticker))];
      for (const ticker of tickers) {
        try {
          const res = await fetch(`${BASE_URL}/stock/${ticker}?period=1mo`);
          if (!res.ok) continue;
          const data = await res.json();
          const tickerAlerts = alerts.filter(a => a.ticker === ticker);
          for (const alert of tickerAlerts) {
            const value: number | null =
              alert.indicator === "RSI" ? data.indicators?.rsi_14 : data.current_price;
            if (value === null || value === undefined) continue;

            const triggered =
              alert.direction === "above" ? value >= alert.threshold : value <= alert.threshold;

            if (triggered && !notifiedRef.current.has(alert.id)) {
              notifiedRef.current.add(alert.id);
              const dir  = alert.direction === "above" ? "≥" : "≤";
              const body = `${alert.indicator} = ${value.toFixed(2)} (${dir} ${alert.threshold})`;
              if (Notification.permission === "granted") {
                new Notification(`${ticker} アラート発火`, { body });
              } else {
                console.info(`[Alert] ${ticker}: ${body}`);
              }
              _pushHistory(alert, value);
            } else if (!triggered) {
              notifiedRef.current.delete(alert.id);
            }
          }
        } catch {
          // silently skip
        }
      }
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestPermission = () => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  return { alerts, addAlert, removeAlert, history, newCount, clearHistory, clearNewCount, requestPermission };
}
