import { test, expect } from "@playwright/test";

/**
 * B2C Website E2E tests.
 * These test public-facing pages (no auth required).
 */
test.describe("B2C Website — Public Pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // No auth

  test("Homepage loads", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator("body")).toBeVisible();
  });

  test("Search page loads", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Hotels page loads", async ({ page }) => {
    await page.goto("/hotels");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Destinations page loads", async ({ page }) => {
    await page.goto("/destinations");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Activities page loads with booking forms", async ({ page }) => {
    await page.goto("/activities");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByText("Activities & Excursions")).toBeVisible({ timeout: 10_000 });
  });

  test("Transfers page loads with booking form", async ({ page }) => {
    await page.goto("/transfers");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByText("Airport Transfers")).toBeVisible({ timeout: 10_000 });
    // Transfer booking form should be visible
    await expect(page.getByText("Book a Transfer")).toBeVisible();
  });

  test("Packages page loads", async ({ page }) => {
    await page.goto("/packages");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Blog page loads", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("About page loads", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Contact page loads", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("FAQ page loads", async ({ page }) => {
    await page.goto("/faq");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Reviews page loads", async ({ page }) => {
    await page.goto("/reviews");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("My bookings login page loads", async ({ page }) => {
    await page.goto("/my-bookings/login");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  // ─── B2B Partner Portal (Public) ───────────────────────────
  test("B2B login page loads", async ({ page }) => {
    await page.goto("/b2b/login");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByText("Tour Operator Portal")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  // ─── Booking Flow ──────────────────────────────────────────
  test("Booking page loads (requires search params)", async ({ page }) => {
    await page.goto("/booking");
    await page.waitForLoadState("networkidle").catch(() => {});
    // Without params it may show an error or redirect — that's expected
  });
});

test.describe("B2C Website — CMS Admin Pages", () => {
  // These use auth state (dashboard pages)

  test("B2C Site hub page loads with all sections", async ({ page }) => {
    await page.goto("/b2c-site");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByText("B2C Website")).toBeVisible({ timeout: 10_000 });
    // Check all section cards
    await expect(page.getByText("Branding & Theme")).toBeVisible();
    await expect(page.getByText("Hero Slides")).toBeVisible();
    await expect(page.getByText("Pages")).toBeVisible();
    await expect(page.getByText("Blog Posts")).toBeVisible();
    await expect(page.getByText("FAQ")).toBeVisible();
    await expect(page.getByText("Testimonials")).toBeVisible();
    await expect(page.getByText("Contact Inquiries")).toBeVisible();
    await expect(page.getByText("Newsletter")).toBeVisible();
    await expect(page.getByText("Markup Rules")).toBeVisible();
  });

  test("Branding page loads", async ({ page }) => {
    await page.goto("/b2c-site/branding");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByText("Branding").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Hero slides page loads", async ({ page }) => {
    await page.goto("/b2c-site/hero-slides");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("CMS pages management loads", async ({ page }) => {
    await page.goto("/b2c-site/pages");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Blog management loads", async ({ page }) => {
    await page.goto("/b2c-site/blog");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("FAQ management loads", async ({ page }) => {
    await page.goto("/b2c-site/faq");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Testimonials management loads", async ({ page }) => {
    await page.goto("/b2c-site/testimonials");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Contact inquiries page loads", async ({ page }) => {
    await page.goto("/b2c-site/inquiries");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("Newsletter page loads", async ({ page }) => {
    await page.goto("/b2c-site/newsletter");
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  test("B2C markup rules page loads", async ({ page }) => {
    await page.goto("/b2c-site/markup");
    await page.waitForLoadState("networkidle").catch(() => {});
  });
});
