import { useState } from "react";
import type { StockData } from "../types";

interface Props {
  stock: StockData;
}

export function ReportButton({ stock }: Props) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import("jspdf"),
        import("html2canvas").then(m => m.default),
      ]);

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const sym  = stock.currency === "JPY" ? "¥" : "$";
      const sign = (stock.change_pct ?? 0) >= 0 ? "+" : "";
      const now  = new Date().toLocaleString("ja-JP");

      // ─── ヘッダー ───────────────────────────────────────
      pdf.setFillColor(17, 24, 39); // gray-900
      pdf.rect(0, 0, pageW, 50, "F");

      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text(stock.name, margin, y + 8);

      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175); // gray-400
      pdf.text(stock.ticker, margin, y + 15);

      pdf.setFontSize(13);
      pdf.setTextColor(52, 211, 153); // emerald-400
      pdf.text(
        `${sym}${stock.current_price?.toLocaleString() ?? "-"}  ${sign}${stock.change_pct?.toFixed(2) ?? "-"}%`,
        margin,
        y + 23,
      );

      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(`出力日時: ${now}`, margin, y + 30);

      y = 55;

      // ─── チャートキャプチャ ──────────────────────────────
      const chartEl = document.getElementById("chart-container") as HTMLElement | null;
      if (chartEl) {
        const canvas = await html2canvas(chartEl, {
          backgroundColor: "#111827",
          scale: 1.5,
          useCORS: true,
          logging: false,
        });
        const ratio  = canvas.height / canvas.width;
        const imgH   = Math.min(contentW * ratio, 75);
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, contentW, imgH);
        y += imgH + 6;
      }

      // ─── テクニカル指標 ──────────────────────────────────
      pdf.setFontSize(11);
      pdf.setTextColor(209, 213, 219); // gray-300
      pdf.text("テクニカル指標", margin, y);
      y += 5;

      pdf.setFontSize(8.5);
      pdf.setTextColor(156, 163, 175);
      const ind = stock.indicators;
      const bb  = ind.bollinger;
      const cells: [string, string][] = [
        ["RSI(14)",    ind.rsi_14?.toFixed(1)    ?? "-"],
        ["MACD hist",  ind.macd.histogram?.toFixed(3) ?? "-"],
        ["SMA20",      ind.sma_20?.toLocaleString()   ?? "-"],
        ["SMA50",      ind.sma_50?.toLocaleString()   ?? "-"],
        ["SMA200",     ind.sma_200?.toLocaleString()  ?? "-"],
        ["EMA20",      ind.ema_20?.toLocaleString()   ?? "-"],
        ["BB上限",     bb.upper?.toLocaleString()     ?? "-"],
        ["BB下限",     bb.lower?.toLocaleString()     ?? "-"],
      ];
      const colW = contentW / 4;
      cells.forEach(([label, val], i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        pdf.text(`${label}: ${val}`, margin + col * colW, y + row * 5);
      });
      y += Math.ceil(cells.length / 4) * 5 + 5;

      // 区切り線
      pdf.setDrawColor(55, 65, 81); // gray-700
      pdf.line(margin, y, pageW - margin, y);
      y += 5;

      // ─── AI分析テキスト ──────────────────────────────────
      const analysisText = document.getElementById("analysis-panel-content")?.textContent?.trim();
      if (analysisText) {
        pdf.setFontSize(11);
        pdf.setTextColor(209, 213, 219);
        pdf.text("AI 総合分析", margin, y);
        y += 5;

        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        const lines = pdf.splitTextToSize(analysisText, contentW) as string[];
        const lineH = 4.2;
        for (const line of lines) {
          if (y + lineH > pageH - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += lineH;
        }
      }

      pdf.save(`${stock.ticker}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF生成エラー:", e);
      alert("PDF生成に失敗しました。コンソールを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={generate}
      disabled={loading}
      title="分析画面をPDF出力"
      className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-500 hover:border-blue-600 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? "生成中..." : "PDF出力"}
    </button>
  );
}
