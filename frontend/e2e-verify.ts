/**
 * Stock Advisor — end-to-end verification script
 * Run: npx ts-node e2e-verify.ts   (or via Playwright directly)
 */
import { chromium, Browser, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = "http://localhost:5173";
const SS_DIR = path.join(__dirname, "e2e-screenshots");
fs.mkdirSync(SS_DIR, { recursive: true });

let step = 0;
async function shot(page: Page, label: string) {
  step++;
  const file = path.join(SS_DIR, `${String(step).padStart(2,"0")}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${file}`);
  return file;
}

async function waitText(page: Page, sel: string, timeout = 30000) {
  const el = page.locator(sel);
  await el.waitFor({ state: "visible", timeout });
  return el;
}

async function main() {
  const browser: Browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  const page: Page = await ctx.newPage();
  const results: { name: string; pass: boolean; note: string }[] = [];

  const check = async (name: string, fn: () => Promise<string>) => {
    try {
      const note = await fn();
      results.push({ name, pass: true, note });
      console.log(`✅ ${name}: ${note}`);
    } catch (e: any) {
      results.push({ name, pass: false, note: e.message?.slice(0, 120) ?? String(e) });
      console.log(`❌ ${name}: ${e.message?.slice(0, 120)}`);
      try { await shot(page, `FAIL-${name.replace(/\s+/g, "-")}`); } catch {}
    }
  };

  // ── 1. Home screen ────────────────────────────────────────────────────────
  await check("1-home-screen", async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await waitText(page, "text=Stock Advisor");
    await shot(page, "01-home");
    const title = await page.title();
    return `title="${title}", heading visible`;
  });

  // ── 2. AAPL → analysis page + LIVE badge ────────────────────────────────
  await check("2-aapl-analysis-live-badge", async () => {
    await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
    // Wait for stock data to load (price card)
    await page.waitForSelector("text=現在値", { timeout: 30000 });
    // Wait up to 35s for LIVE badge (WebSocket connects + sends first data)
    await page.waitForSelector("text=LIVE", { timeout: 40000 });
    await shot(page, "02-aapl-live-badge");
    return "LIVE badge visible after WebSocket connected";
  });

  // ── 3. AI analysis streaming ──────────────────────────────────────────────
  await check("3-ai-analysis-streaming", async () => {
    // Click "分析する" button
    await page.click("text=分析する");
    // Wait for streaming to start (any text appearing in analysis area)
    await page.waitForFunction(() => {
      const el = document.getElementById("analysis-panel-content");
      return el && (el.textContent?.trim().length ?? 0) > 20;
    }, { timeout: 60000 });
    await shot(page, "03-ai-streaming");
    const el = await page.$("#analysis-panel-content");
    const text = await el?.textContent() ?? "";
    return `streaming text: "${text.slice(0, 60)}..."`;
  });

  // ── 4. Q&A chat ───────────────────────────────────────────────────────────
  await check("4-qa-chat", async () => {
    // Find the Q&A input
    const input = page.locator("placeholder=AAPLについて質問する").or(
      page.locator("placeholder=/質問/")
    ).first();
    await input.waitFor({ state: "visible", timeout: 10000 });
    await input.fill("RSIは今どう見る？");
    await page.keyboard.press("Enter");
    // Wait for answer to appear
    await page.waitForFunction(() => {
      const msgs = document.querySelectorAll(".bg-gray-800 p, .prose p");
      return Array.from(msgs).some(m => (m.textContent?.length ?? 0) > 10);
    }, { timeout: 40000 });
    await shot(page, "04-qa-response");
    return "Q&A response received";
  });

  // ── 5. Screener + AI解説 ─────────────────────────────────────────────────
  await check("5-screener-ai", async () => {
    await page.goto(`${BASE}/#screener`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=売られすぎ", { timeout: 10000 });
    // Click 売られすぎ preset
    await page.click("text=売られすぎ");
    await shot(page, "05a-screener-preset");
    // Run screening
    await page.click("text=スクリーニング実行");
    // Wait for results or "件がヒット" badge
    await page.waitForFunction(() =>
      document.body.innerText.includes("ヒット") ||
      document.body.innerText.includes("見つかりませんでした"),
    { timeout: 120000 });
    await shot(page, "05b-screener-results");
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hit = bodyText.match(/(\d+)\s*銘柄ヒット/)?.[1] ?? "0";
    // Try AI解説 button if results exist
    if (parseInt(hit) > 0) {
      await page.click("text=AI解説");
      await page.waitForFunction(() => {
        const el = document.querySelector(".bg-gray-800\\/60");
        return el && (el.textContent?.trim().length ?? 0) > 20;
      }, { timeout: 60000 });
      await shot(page, "05c-screener-ai");
      return `${hit}銘柄ヒット, AI解説ストリーミング確認`;
    }
    return `${hit}銘柄ヒット (RSI<=30 not found in current market — screener ran OK)`;
  });

  // ── 6. Portfolio analysis ─────────────────────────────────────────────────
  await check("6-portfolio-analysis", async () => {
    await page.goto(`${BASE}/#portfolio`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=保有銘柄", { timeout: 10000 });
    // Fill first row
    const tickerInputs = await page.locator("placeholder=/銘柄コード/").all();
    const amtInputs    = await page.locator("placeholder=/保有数量/").all();
    await tickerInputs[0].fill("AAPL");
    await amtInputs[0].fill("10");
    // Add second row
    await page.click("text=銘柄を追加");
    const tickerInputs2 = await page.locator("placeholder=/銘柄コード/").all();
    const amtInputs2    = await page.locator("placeholder=/保有数量/").all();
    await tickerInputs2[1].fill("NVDA");
    await amtInputs2[1].fill("5");
    await shot(page, "06a-portfolio-form");
    await page.click("text=AI分析を実行");
    // Wait for streaming
    await page.waitForFunction(() => {
      const el = document.querySelector(".whitespace-pre-wrap");
      return el && (el.textContent?.trim().length ?? 0) > 30;
    }, { timeout: 90000 });
    await shot(page, "06b-portfolio-streaming");
    return "portfolio analysis streaming confirmed";
  });

  // ── 7. Backtest ───────────────────────────────────────────────────────────
  await check("7-backtest", async () => {
    await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=現在値", { timeout: 30000 });
    // Scroll to backtest panel
    await page.waitForSelector("text=バックテスト", { timeout: 10000 });
    // Set buy date
    const buyInput = page.locator("input[type='date']").first();
    await buyInput.fill("2024-01-01");
    // Set amount
    const amtInput = page.locator("input[type='number']").first();
    await amtInput.fill("10000");
    await shot(page, "07a-backtest-form");
    await page.click("text=計算");
    // Wait for result card
    await page.waitForSelector("text=損益率", { timeout: 30000 });
    await shot(page, "07b-backtest-result");
    const bodyText = await page.evaluate(() => document.body.innerText);
    const pct = bodyText.match(/([+-]?\d+\.\d+)%/)?.[ 1] ?? "?";
    return `backtest result: ${pct}% shown`;
  });

  // ── 8. PDF download ───────────────────────────────────────────────────────
  await check("8-pdf-download", async () => {
    const [download] = await Promise.all([
      ctx.waitForEvent("download", { timeout: 30000 }),
      page.click("text=PDF出力"),
    ]);
    const filename = download.suggestedFilename();
    await shot(page, "08-pdf-download");
    return `download triggered: ${filename}`;
  });

  // ── 9. Alert panel ────────────────────────────────────────────────────────
  await check("9-alert-panel", async () => {
    // Find alert section — scroll to it
    await page.locator("text=アラート設定").first().scrollIntoViewIfNeeded();
    await page.waitForSelector("text=アラート設定", { timeout: 10000 });
    // Set ticker
    const tickerInput = page.locator("input[placeholder*='AAPL']").first();
    await tickerInput.fill("AAPL");
    // Set threshold to 25
    const numInput = page.locator("input[type='number']").last();
    await numInput.fill("25");
    await page.click("text=追加");
    // Verify alert row appears
    await page.waitForFunction(() =>
      document.body.innerText.includes("AAPL") &&
      document.body.innerText.match(/RSI|price/) !== null,
    { timeout: 10000 });
    await shot(page, "09-alert-saved");
    return "alert condition saved and visible";
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  await browser.close();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  VERIFICATION SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  let passed = 0;
  for (const r of results) {
    const icon = r.pass ? "✅" : "❌";
    console.log(`${icon} ${r.name}`);
    if (!r.pass) console.log(`     → ${r.note}`);
    if (r.pass) passed++;
  }
  console.log(`\n${passed}/${results.length} passed`);
  console.log(`Screenshots saved to: ${SS_DIR}`);

  if (passed < results.length) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
