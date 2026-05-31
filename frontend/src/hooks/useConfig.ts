import { useState, useEffect } from "react";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export function useConfig() {
  const [claudeEnabled, setClaudeEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/config`)
      .then((r) => r.json())
      .then((d) => setClaudeEnabled(d.claude_enabled ?? false))
      .catch(() => setClaudeEnabled(false));
  }, []);

  return { claudeEnabled };
}
