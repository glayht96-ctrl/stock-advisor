import React, { useState, useEffect, useRef } from "react";
import { Home }     from "./pages/Home";
import { Analysis } from "./pages/Analysis";
import { Portfolio } from "./pages/Portfolio";
import { Screener }  from "./pages/Screener";
import { Heatmap }   from "./pages/Heatmap";
import { InstallPrompt } from "./components/InstallPrompt";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { usePrefetch } from "./hooks/usePrefetch";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

// ── ウォームアップバナー（非ブロッキング） ──────────────────────────
type WarmupStatus = "idle" | "slow" | "ready" | "error";

function WarmupBanner({ status, onRetry }: { status: WarmupStatus; onRetry: () => void }) {
  if (status === "idle" || status === "ready") return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm ${
      status === "error"
        ? "bg-red-950 border-b border-red-800 text-red-300"
        : "bg-amber-950/95 border-b border-amber-800 text-amber-300"
    }`}>
      {status === "slow" && (
        <>
          <span className="inline-block w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>サーバー起動中...少々お待ちください（初回アクセス最大30秒）</span>
        </>
      )}
      {status === "error" && (
        <>
          <span>⚠️ サーバーへの接続に失敗しました</span>
          <button
            onClick={onRetry}
            className="text-xs bg-red-800 hover:bg-red-700 px-2 py-0.5 rounded transition-colors"
          >
            再試行
          </button>
        </>
      )}
    </div>
  );
}

function App() {
  const [ticker,       setTicker]       = useState<string | null>(null);
  const [warmupStatus, setWarmupStatus] = useState<WarmupStatus>("idle");
  const slowTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { add } = useSearchHistory();

  // ウォッチリスト銘柄をバックグラウンドでプリフェッチ
  usePrefetch();

  // ── バックエンドウォームアップ ─────────────────────────────────
  const runWarmup = () => {
    let cancelled = false;
    clearTimeout(slowTimerRef.current);

    // 3秒後に "slow" バナーを表示
    slowTimerRef.current = setTimeout(() => {
      if (!cancelled) setWarmupStatus("slow");
    }, 3000);

    // /health でバックエンド確認
    fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(35000) })
      .then(res => {
        if (cancelled) return;
        clearTimeout(slowTimerRef.current);
        if (res.ok) {
          setWarmupStatus("ready");
          // バックエンドが起動したらウォッチリストをサーバー側でもプリウォーム
          const watchlist: string[] = JSON.parse(
            localStorage.getItem("stock-advisor-watchlist") || "[]"
          );
          if (watchlist.length > 0) {
            fetch(`${BASE_URL}/warmup?tickers=${encodeURIComponent(watchlist.join(","))}`).catch(() => {});
          }
        } else {
          setWarmupStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(slowTimerRef.current);
          setWarmupStatus("error");
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(slowTimerRef.current);
    };
  };

  useEffect(() => {
    return runWarmup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ハッシュルーティング ───────────────────────────────────────
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "").trim().toUpperCase();
      setTicker(hash || null);
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleSearch = (t: string) => {
    add(t);
    window.location.hash = `#${t}`;
    setTicker(t);
  };

  const handleBack = () => {
    window.location.hash = "";
    setTicker(null);
  };

  const serverReady = warmupStatus === "ready" || warmupStatus === "idle";

  // ── ページルーティング ───────────────────────────────────────
  let page: React.ReactNode;
  if (ticker === "PORTFOLIO") page = <Portfolio onBack={handleBack} />;
  else if (ticker === "SCREENER") page = <Screener onNavigate={handleSearch} onBack={handleBack} />;
  else if (ticker === "HEATMAP") page = <Heatmap onNavigate={handleSearch} onBack={handleBack} />;
  else if (ticker) page = <Analysis ticker={ticker} onBack={handleBack} serverReady={serverReady} />;
  else page = <Home onSearch={handleSearch} />;

  return (
    <>
      {/* 非ブロッキングウォームアップバナー */}
      <WarmupBanner
        status={warmupStatus}
        onRetry={() => { setWarmupStatus("idle"); runWarmup(); }}
      />
      {/* バナー分だけ上にパディング */}
      <div className={warmupStatus === "slow" || warmupStatus === "error" ? "pt-9" : ""}>
        {page}
      </div>
      <InstallPrompt />
    </>
  );
}

export default App;
