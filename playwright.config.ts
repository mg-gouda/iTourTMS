import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for iTourTMS.
 *
 * Prerequisites:
 *   1. `pnpm docker:up` — start PostgreSQL, PgBouncer, Redis
 *   2. `pnpm dev` — start the Next.js dev server on port 3000
 *   3. Ensure a seeded database with test user exists
 *
 * Run:
 *   npx playwright test              — run all tests headless
 *   npx playwright test --headed     — run with browser visible
 *   npx playwright test --ui         — interactive UI mode
 *   npx playwright test --project=chromium -- e2e/finance  — run specific module
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // sequential to avoid DB conflicts
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: process.env.CI
    ? {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined, // Expect dev server already running locally
});
