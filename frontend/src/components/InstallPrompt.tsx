import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem("pwa-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl flex items-center gap-3 z-50 animate-fade-in">
      <span className="text-2xl shrink-0">📈</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">ホーム画面に追加</p>
        <p className="text-xs text-gray-400 mt-0.5">Stock Advisorをアプリとして使えます</p>
      </div>
      <button
        onClick={install}
        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 font-medium"
      >
        追加
      </button>
      <button
        onClick={dismiss}
        className="text-gray-500 hover:text-gray-300 text-xl leading-none shrink-0 ml-1"
      >
        ×
      </button>
    </div>
  );
}
