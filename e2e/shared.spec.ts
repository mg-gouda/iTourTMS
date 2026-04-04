import { test, expect } from "@playwright/test";
import { navigateTo, waitForLoaded, expectHeading } from "./helpers";

test.describe("Shared / Settings", () => {
  test("Settings page loads with tabs", async ({ page }) => {
    await navigateTo(page, "/settings");
    await waitForLoaded(page);
    await expect(page.getByText("Settings").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Login page loads (unauthenticated)", async ({ page }) => {
    // Clear auth state for this test
    await page.context().clearCookies();
    await page.goto("/login");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test("Unauthenticated access redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/finance");
    await page.waitForURL("**/login**", { timeout: 10_000 });
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test("API health check", async ({ page }) => {
    const res = await page.request.get("/api/health");
    expect(res.ok()).toBeTruthy();
  });
});
