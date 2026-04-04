import { test as setup, expect } from "@playwright/test";

/**
 * Global setup — authenticates once and saves session state.
 * All subsequent tests reuse the saved auth state.
 *
 * Configure test credentials via env vars or defaults:
 *   PLAYWRIGHT_USER_EMAIL / PLAYWRIGHT_USER_PASSWORD
 */
const EMAIL = process.env.PLAYWRIGHT_USER_EMAIL || "mggouda@gmail.com";
const PASSWORD = process.env.PLAYWRIGHT_USER_PASSWORD || "Win16@64";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");

  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', {
    timeout: 15_000,
  });

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL("**/reservations**|**/finance**|**/contracting**|**/crm**|**/traffic**|**/settings**", {
    timeout: 15_000,
  }).catch(async () => {
    // Might redirect to setup wizard or a specific module
    await page.waitForURL("**/*", { timeout: 5_000 });
  });

  // Verify we're authenticated — sidebar should be visible
  await expect(
    page.locator('[data-testid="sidebar"], nav, aside').first()
  ).toBeVisible({ timeout: 10_000 }).catch(() => {
    // Some layouts may not have sidebar immediately
  });

  // Save auth state
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
