import { useState, useEffect, useRef } from "react";

const BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE = BASE_URL.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

export type LiveStatus = "connecting" | "connected" | "disconnected";

export interface RealtimeData {
  ticker: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  timestamp: string;
}

export function useRealtimePrice(ticker: string) {
  const [data,   setData]   = useState<RealtimeData | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const activeRef    = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    const connect = () => {
      if (!activeRef.current) return;
      setStatus("connecting");

      const ws = new WebSocket(`${WS_BASE}/ws/${ticker}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (activeRef.current) setStatus("connected");
      };

      ws.onmessage = (e) => {
        if (!activeRef.current) return;
        try {
          const parsed: RealtimeData = JSON.parse(e.data);
          if (parsed.price !== undefined) {
            setData(parsed);
            setStatus("connected");
          }
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
      wsRef.current?.close();
    };
  }, [ticker]);

  return { data, status };
}
