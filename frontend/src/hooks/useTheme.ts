import { useState, useEffect } from "react";

type Theme = "dark" | "light";

const KEY = "stock-advisor-theme";

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") return stored;
    return getSystemTheme();
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // システム設定変更に追従（初回のみ、手動設定がない場合）
  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) return;                    // 手動設定済みなら追従しない
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      const next: Theme = e.matches ? "dark" : "light";
      setThemeState(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  const resetToSystem = () => {
    localStorage.removeItem(KEY);
    setThemeState(getSystemTheme());
  };

  return { theme, toggle, setTheme, resetToSystem, isDark: theme === "dark" };
}
