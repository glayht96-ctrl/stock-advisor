import React, { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Analysis } from "./pages/Analysis";
import { Portfolio } from "./pages/Portfolio";
import { Screener } from "./pages/Screener";
import { InstallPrompt } from "./components/InstallPrompt";
import { useSearchHistory } from "./hooks/useSearchHistory";

function App() {
  const [ticker, setTicker] = useState<string | null>(null);
  const { add } = useSearchHistory();

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

  let page: React.ReactNode;
  if (ticker === "PORTFOLIO") page = <Portfolio onBack={handleBack} />;
  else if (ticker === "SCREENER") page = <Screener onNavigate={handleSearch} onBack={handleBack} />;
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
