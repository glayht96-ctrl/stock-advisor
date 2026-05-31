import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: "on",
    video: "off",
    launchOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] },
  },
});
