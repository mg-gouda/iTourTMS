import { test, expect } from "@playwright/test";
import {
  navigateTo,
  waitForLoaded,
  expectHeading,
  expectTableRows,
} from "../helpers";

test.describe("Contracting Module", () => {
  // ─── Dashboard ─────────────────────────────────────────────
  test("Dashboard loads with KPI cards and charts", async ({ page }) => {
    await navigateTo(page, "/contracting");
    await waitForLoaded(page);
    await expectHeading(page, "Contracting Dashboard");
    // Expect chart cards
    await expect(
      page.getByText("Contracts by Status").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Hotels ────────────────────────────────────────────────
  test("Hotels list page loads with DataTable", async ({ page }) => {
    await navigateTo(page, "/contracting/hotels");
    await waitForLoaded(page);
    await expectHeading(page, "Hotels");
    // DataTable should render (even if empty, the table element exists)
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });
  });

  test("New hotel form renders with Basic Information section", async ({
    page,
  }) => {
    await navigateTo(page, "/contracting/hotels/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Hotel");
    await expect(page.locator("form").first()).toBeVisible();
    await expect(page.getByText("Basic Information").first()).toBeVisible();
    await expect(page.getByText("Location").first()).toBeVisible();
    await expect(page.getByText("Contact").first()).toBeVisible();
  });

  // ─── Destinations ──────────────────────────────────────────
  test("Destinations list page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/destinations");
    await waitForLoaded(page);
    await expectHeading(page, "Destinations");
  });

  // ─── Markets ───────────────────────────────────────────────
  test("Markets list page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/markets");
    await waitForLoaded(page);
    await expectHeading(page, "Markets");
  });

  // ─── Tour Operators ────────────────────────────────────────
  test("Tour operators list page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/tour-operators");
    await waitForLoaded(page);
    await expectHeading(page, "Tour Operators");
  });

  test("New tour operator form renders", async ({ page }) => {
    await navigateTo(page, "/contracting/tour-operators/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Tour Operator");
    await expect(page.locator("form").first()).toBeVisible();
  });

  // ─── Contracts ─────────────────────────────────────────────
  test("Contracts list page loads with DataTable", async ({ page }) => {
    await navigateTo(page, "/contracting/contracts");
    await waitForLoaded(page);
    await expectHeading(page, "Contracts");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });
  });

  test("New contract form renders with Hotel and Contract Details sections", async ({
    page,
  }) => {
    await navigateTo(page, "/contracting/contracts/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Contract");
    await expect(page.locator("form").first()).toBeVisible();
    await expect(page.getByText("Hotel", { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText("Contract Details").first()
    ).toBeVisible();
  });

  // ─── Rates ─────────────────────────────────────────────────
  test("Rates matrix page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/rates");
    await waitForLoaded(page);
    await expectHeading(page, "Calculated Rates");
  });

  // ─── Allotments ────────────────────────────────────────────
  test("Allotments page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/allotments");
    await waitForLoaded(page);
    await expectHeading(page, "Allotments");
  });

  // ─── Stop Sales ────────────────────────────────────────────
  test("Stop sales page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/stop-sales");
    await waitForLoaded(page);
    await expectHeading(page, "Stop Sales");
  });

  // ─── Expiring Contracts ────────────────────────────────────
  test("Expiring contracts page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/expiring");
    await waitForLoaded(page);
    await expectHeading(page, "Expiring Contracts");
  });

  // ─── Import ────────────────────────────────────────────────
  test("Bulk import page loads with step wizard", async ({ page }) => {
    await navigateTo(page, "/contracting/import");
    await waitForLoaded(page);
    await expectHeading(page, "Bulk Import");
    await expect(
      page.getByText("Step 1").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Sejour import page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/import-sejour");
    await waitForLoaded(page);
    await expectHeading(page, "Import Sejour Contracts");
    await expect(
      page.getByText("Upload PDF").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Markup Rules ──────────────────────────────────────────
  test("Markup rules list page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/markups");
    await waitForLoaded(page);
    await expectHeading(page, "Markup Rules");
  });

  test("New markup rule form renders", async ({ page }) => {
    await navigateTo(page, "/contracting/markups/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Markup Rule");
    await expect(page.locator("form").first()).toBeVisible();
    await expect(
      page.getByText("Basic Information").first()
    ).toBeVisible();
  });

  // ─── Tariffs ───────────────────────────────────────────────
  test("Tariffs list page loads with DataTable", async ({ page }) => {
    await navigateTo(page, "/contracting/tariffs");
    await waitForLoaded(page);
    await expectHeading(page, "Tariffs");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });
  });

  // ─── Rate Simulator ───────────────────────────────────────
  test("Rate simulator page loads with form fields", async ({ page }) => {
    await navigateTo(page, "/contracting/rate-simulator");
    await waitForLoaded(page);
    await expectHeading(page, "Rate Simulator");
    // Verify key form controls exist
    await expect(page.getByText("Contract").first()).toBeVisible();
    await expect(page.getByText("Check-in").first()).toBeVisible();
    await expect(page.getByText("Check-out").first()).toBeVisible();
    await expect(page.getByText("Adults").first()).toBeVisible();
    await expect(page.getByText("Booking Date").first()).toBeVisible();
    // Simulate button should be present
    await expect(
      page.getByRole("button", { name: /Simulate/i }).first()
    ).toBeVisible();
    // Add Child button
    await expect(
      page.getByRole("button", { name: /Add Child/i }).first()
    ).toBeVisible();
  });

  // ─── Templates ─────────────────────────────────────────────
  test("Contract templates page loads", async ({ page }) => {
    await navigateTo(page, "/contracting/templates");
    await waitForLoaded(page);
    await expectHeading(page, "Contract Templates");
  });

  // ─── Reports ───────────────────────────────────────────────
  test("Contract summary report loads", async ({ page }) => {
    await navigateTo(page, "/contracting/reports/contract-summary");
    await waitForLoaded(page);
    await expectHeading(page, "Contract Summary");
  });

  test("Rate comparison report loads", async ({ page }) => {
    await navigateTo(page, "/contracting/reports/rate-comparison");
    await waitForLoaded(page);
    await expectHeading(page, "Rate Comparison");
  });

  test("Season coverage report loads", async ({ page }) => {
    await navigateTo(page, "/contracting/reports/season-coverage");
    await waitForLoaded(page);
    await expectHeading(page, "Season Coverage");
  });

  test("Seasonal offers report loads", async ({ page }) => {
    await navigateTo(page, "/contracting/reports/seasonal-offers");
    await waitForLoaded(page);
    await expectHeading(page, "Seasonal Offers");
  });

  test("EBD conditions report loads", async ({ page }) => {
    await navigateTo(page, "/contracting/reports/ebd-conditions");
    await waitForLoaded(page);
    await expectHeading(page, "EBD Conditions");
  });

  test("Allotment utilization report loads", async ({ page }) => {
    await navigateTo(page, "/contracting/reports/allotment-utilization");
    await waitForLoaded(page);
    await expectHeading(page, "Allotment Utilization");
  });

  // ─── No Console Errors on Key Pages ───────────────────────
  test("No uncaught errors on contracts list", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/contracting/contracts");
    await waitForLoaded(page);
    expect(errors).toHaveLength(0);
  });

  test("No uncaught errors on hotels list", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/contracting/hotels");
    await waitForLoaded(page);
    expect(errors).toHaveLength(0);
  });

  test("No uncaught errors on rate simulator", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/contracting/rate-simulator");
    await waitForLoaded(page);
    expect(errors).toHaveLength(0);
  });
});
