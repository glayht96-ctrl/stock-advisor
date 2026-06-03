import { useState, useEffect, useRef } from "react";

const BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE = BASE_URL.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

export type LiveStatus     = "connecting" | "connected" | "disconnected";
export type PriceDirection = "up" | "down" | "neutral";

export interface OhlcToday {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface RealtimeData {
  ticker: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  timestamp: string;
  ohlc_today: OhlcToday | null;
}

export function useRealtimePrice(ticker: string) {
  const [data,         setData]         = useState<RealtimeData | null>(null);
  const [status,       setStatus]       = useState<LiveStatus>("connecting");
  const [direction,    setDirection]    = useState<PriceDirection>("neutral");
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const dirTimerRef  = useRef<ReturnType<typeof setTimeout>>();
  const activeRef    = useRef(true);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current = true;

    const connect = () => {
      if (!activeRef.current) return;
      setStatus("connecting");

      const ws = new WebSocket(`${WS_BASE}/ws/${ticker}`);
      wsRef.current = ws;

      ws.onopen = () => { if (activeRef.current) setStatus("connected"); };

      ws.onmessage = (e) => {
        if (!activeRef.current) return;
        try {
          const parsed: RealtimeData = JSON.parse(e.data);
          if (parsed.price == null) return;

          setData(parsed);
          setStatus("connected");

          // 価格変化方向を検出
          const prev = prevPriceRef.current;
          if (prev !== null) {
            const dir: PriceDirection =
              parsed.price > prev ? "up" :
              parsed.price < prev ? "down" : "neutral";
            setDirection(dir);
            clearTimeout(dirTimerRef.current);
            dirTimerRef.current = setTimeout(() => setDirection("neutral"), 800);
          }
          prevPriceRef.current = parsed.price;

          // 直近10件の価格履歴
          setPriceHistory(h => [...h.slice(-9), parsed.price as number]);
        } catch {}
      };

      ws.onclose = () => {
        if (!activeRef.current) return;
        setStatus("disconnected");
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      activeRef.current = false;
      clearTimeout(reconnectRef.current);
      clearTimeout(dirTimerRef.current);
      wsRef.current?.close();
    };
  }, [ticker]);

  return { data, status, direction, priceHistory };
}
