import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:5173";

// ── helpers ─────────────────────────────────────────────────────────────────

async function waitForStreamingText(
  page: Page,
  selector: string,
  minLen = 30,
  timeout = 60_000
) {
  await page.waitForFunction(
    ({ sel, min }) => {
      const el = document.querySelector(sel);
      return el && (el.textContent?.trim().length ?? 0) >= min;
    },
    { sel: selector, min: minLen },
    { timeout }
  );
}

// ── 1. Home screen ───────────────────────────────────────────────────────────

test("1 - home screen loads", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await expect(page.locator("h1", { hasText: "Stock Advisor" })).toBeVisible();
  await expect(page.locator("text=日本株・米国株")).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/01-home.png" });
});

// ── 2. AAPL analysis + LIVE badge ────────────────────────────────────────────

test("2 - AAPL analysis page with LIVE badge", async ({ page }) => {
  await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });

  // Stock data loads
  await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "e2e-screenshots/02a-aapl-loading.png" });

  // LIVE badge appears after WebSocket connects & delivers first payload
  await expect(page.locator("text=LIVE")).toBeVisible({ timeout: 45_000 });
  await page.screenshot({ path: "e2e-screenshots/02b-aapl-live.png" });
});

// ── 3. AI analysis streaming ─────────────────────────────────────────────────

test("3 - AI analysis streams text", async ({ page }) => {
  await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });

  // Click "分析する"
  await page.locator("button", { hasText: "分析する" }).click();

  // Streaming content appears inside the panel
  await waitForStreamingText(page, "#analysis-panel-content", 30, 60_000);
  const content = await page.locator("#analysis-panel-content").innerText();
  expect(content.trim().length).toBeGreaterThan(30);
  await page.screenshot({ path: "e2e-screenshots/03-ai-streaming.png" });
});

// ── 4. Q&A chat ──────────────────────────────────────────────────────────────

test("4 - Q&A chat returns response", async ({ page }) => {
  await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });

  // Fill the Q&A input
  const input = page.locator("input[placeholder*='質問']").or(
    page.locator("textarea[placeholder*='質問']")
  ).first();
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.fill("RSIは今どう見る？");
  await input.press("Enter");

  // A reply bubble containing meaningful text appears
  await page.waitForFunction(() => {
    // Look for any assistant / model message element
    const all = [...document.querySelectorAll("div.bg-gray-800 p, .prose p, [class*='chat'] p")];
    return all.some(el => (el.textContent?.trim().length ?? 0) > 10);
  }, { timeout: 45_000 });

  await page.screenshot({ path: "e2e-screenshots/04-qa-response.png" });
});

// ── 5. Screener + AI analysis ────────────────────────────────────────────────

test("5 - screener with 売られすぎ preset and AI analysis", async ({ page }) => {
  await page.goto(`${BASE}/#screener`, { waitUntil: "networkidle" });
  await expect(page.locator("text=銘柄スクリーナー")).toBeVisible({ timeout: 10_000 });

  // Apply preset
  await page.locator("button", { hasText: "売られすぎ" }).click();
  await page.screenshot({ path: "e2e-screenshots/05a-screener-preset.png" });

  // Run screening (100 stocks — may take a while)
  await page.locator("button", { hasText: "スクリーニング実行" }).click();

  await page.waitForFunction(
    () =>
      document.body.innerText.includes("銘柄ヒット") ||
      document.body.innerText.includes("見つかりませんでした"),
    { timeout: 150_000 }
  );
  await page.screenshot({ path: "e2e-screenshots/05b-screener-results.png" });

  const bodyText = await page.evaluate(() => document.body.innerText);
  const hitMatch = bodyText.match(/(\d+)\s*銘柄ヒット/);
  const hitCount = parseInt(hitMatch?.[1] ?? "0");

  // AI analysis button (always rendered when results > 0)
  if (hitCount > 0) {
    await page.locator("button", { hasText: "AI解説" }).click();
    await waitForStreamingText(page, ".bg-gray-800\\/60, .whitespace-pre-wrap", 20, 60_000);
    await page.screenshot({ path: "e2e-screenshots/05c-screener-ai.png" });
  } else {
    // RSI<=30 might not exist in current market; screener still ran
    test.info().annotations.push({ type: "note", description: "0 hits for RSI<=30 today — market not oversold" });
  }

  // Either way the screener ran successfully
  expect(bodyText).toMatch(/銘柄ヒット|見つかりませんでした/);
});

// ── 6. Portfolio analysis ────────────────────────────────────────────────────

test("6 - portfolio analysis streams", async ({ page }) => {
  await page.goto(`${BASE}/#portfolio`, { waitUntil: "networkidle" });
  await expect(page.locator("text=保有銘柄")).toBeVisible({ timeout: 10_000 });

  const tickerInputs = page.locator("input[placeholder*='銘柄コード']");
  const amtInputs    = page.locator("input[placeholder*='保有数量']");

  await tickerInputs.nth(0).fill("AAPL");
  await amtInputs.nth(0).fill("10");

  // Add second ticker
  await page.locator("text=銘柄を追加").click();
  await tickerInputs.nth(1).fill("NVDA");
  await amtInputs.nth(1).fill("5");
  await page.screenshot({ path: "e2e-screenshots/06a-portfolio-form.png" });

  await page.locator("button", { hasText: "AI分析を実行" }).click();

  await waitForStreamingText(page, ".whitespace-pre-wrap", 30, 90_000);
  await page.screenshot({ path: "e2e-screenshots/06b-portfolio-result.png" });
});

// ── 7. Backtest ──────────────────────────────────────────────────────────────

test("7 - backtest AAPL 2024-01-01 $10000", async ({ page }) => {
  await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("text=バックテスト")).toBeVisible({ timeout: 10_000 });

  // Fill buy date
  const dateInputs = page.locator("input[type='date']");
  await dateInputs.first().fill("2024-01-01");

  // Fill amount — find the ¥/$ labelled input
  const numInputs = page.locator("input[type='number']");
  // Amount input is the first number input inside BacktestPanel
  await numInputs.first().fill("10000");
  await page.screenshot({ path: "e2e-screenshots/07a-backtest-form.png" });

  await page.locator("button", { hasText: "計算" }).click();

  await expect(page.locator("text=損益率")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("text=年率換算")).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "e2e-screenshots/07b-backtest-result.png" });

  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText).toMatch(/[+-]?\d+\.\d+%/);
});

// ── 8. PDF download ──────────────────────────────────────────────────────────

test("8 - PDF report download", async ({ page, context }) => {
  await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.locator("button", { hasText: "PDF出力" }).click(),
  ]);

  const suggestedName = download.suggestedFilename();
  expect(suggestedName).toMatch(/\.pdf$/i);
  await page.screenshot({ path: "e2e-screenshots/08-pdf-download.png" });
});

// ── 9. Alert panel ───────────────────────────────────────────────────────────

test("9 - alert panel saves condition", async ({ page }) => {
  await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });

  // Scroll to alert panel
  const alertHeading = page.locator("text=アラート設定").first();
  await alertHeading.scrollIntoViewIfNeeded();
  await expect(alertHeading).toBeVisible({ timeout: 10_000 });

  // Set ticker field to AAPL (may already be set)
  const tickerInput = page.locator("input[placeholder*='AAPL'], input[placeholder*='銘柄']").first();
  await tickerInput.fill("AAPL");

  // Set threshold value
  const thresholdInput = page.locator("input[type='number']").last();
  await thresholdInput.fill("25");

  await page.screenshot({ path: "e2e-screenshots/09a-alert-form.png" });

  await page.locator("button", { hasText: "追加" }).first().click();

  // Alert row should appear
  await expect(page.locator("text=≤ 25").or(page.locator("text=≥ 25"))).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: "e2e-screenshots/09b-alert-saved.png" });
});
