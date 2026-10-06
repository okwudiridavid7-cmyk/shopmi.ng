import { defineConfig, devices } from "@playwright/test";

const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";

/**
 * Runs against the local dev stack (pnpm dev). Accounts come from
 * apps/api/scripts/e2e-tokens.ts via e2e/global-setup.ts.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
