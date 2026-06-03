import React, { useState, useEffect, useRef } from "react";
import { Home }     from "./pages/Home";
import { Analysis } from "./pages/Analysis";
import { Portfolio } from "./pages/Portfolio";
import { Screener }  from "./pages/Screener";
import { Heatmap }   from "./pages/Heatmap";
import { InstallPrompt } from "./components/InstallPrompt";
import { useSearchHistory } from "./hooks/useSearchHistory";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

// ── バックエンドウォームアップ状態 ─────────────────────────────────
type WarmupStatus = "warming" | "slow" | "ready" | "error";

function WarmupScreen({ status }: { status: WarmupStatus }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
      {/* ロゴ */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-4xl">📈</span>
        <div>
          <h1 className="text-2xl font-bold leading-none">Stock Advisor</h1>
          <p className="text-xs text-gray-500 mt-1">日本株・米国株 テクニカル分析 & AI見立て</p>
        </div>
      </div>

      {/* スピナー */}
      <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"
           style={{ borderWidth: 3 }} />

      {/* メッセージ */}
      {status === "warming" && (
        <p className="text-sm text-gray-400 animate-pulse">サーバー起動中...</p>
      )}
      {status === "slow" && (
        <div className="text-center space-y-2">
          <p className="text-sm text-amber-400 font-medium">
            初回アクセスのため起動中です（最大30秒）
          </p>
          <p className="text-xs text-gray-600">
            Render 無料プランのコールドスタートです。しばらくお待ちください。
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="text-center space-y-2">
          <p className="text-sm text-red-400">サーバーへの接続に失敗しました</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors mt-2"
          >
            再試行
          </button>
        </div>
      )}

      {/* スケルトン（ホーム画面の輪郭） */}
      <div className="w-full max-w-2xl mt-10 space-y-3 opacity-20">
        <div className="h-10 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function App() {
  const [ticker,       setTicker]       = useState<string | null>(null);
  const [warmupStatus, setWarmupStatus] = useState<WarmupStatus>("warming");
  const slowTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { add } = useSearchHistory();

  // ── バックエンドウォームアップ ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    // 3秒後に "slow" メッセージへ切り替え
    slowTimerRef.current = setTimeout(() => {
      if (!cancelled) setWarmupStatus("slow");
    }, 3000);

    const warmup = async () => {
      try {
        const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(35000) });
        if (cancelled) return;
        if (res.ok) {
          clearTimeout(slowTimerRef.current);
          setWarmupStatus("ready");
        } else {
          setWarmupStatus("error");
        }
      } catch {
        if (!cancelled) setWarmupStatus("error");
      }
    };

    warmup();
    return () => {
      cancelled = true;
      clearTimeout(slowTimerRef.current);
    };
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

  // ウォームアップ中はスケルトン画面
  if (warmupStatus === "warming" || warmupStatus === "slow") {
    return (
      <>
        <WarmupScreen status={warmupStatus} />
        <InstallPrompt />
      </>
    );
  }

  // エラー時もスケルトン画面（再試行ボタン付き）
  if (warmupStatus === "error") {
    return (
      <>
        <WarmupScreen status="error" />
        <InstallPrompt />
      </>
    );
  }

  // ── ページルーティング ───────────────────────────────────────
  let page: React.ReactNode;
  if (ticker === "PORTFOLIO") page = <Portfolio onBack={handleBack} />;
  else if (ticker === "SCREENER") page = <Screener onNavigate={handleSearch} onBack={handleBack} />;
  else if (ticker === "HEATMAP") page = <Heatmap onNavigate={handleSearch} onBack={handleBack} />;
  else if (ticker) page = <Analysis ticker={ticker} onBack={handleBack} />;
  else page = <Home onSearch={handleSearch} />;

  return (
    <>
      {page}
      <InstallPrompt />
    </>
  );
}

export default App;
