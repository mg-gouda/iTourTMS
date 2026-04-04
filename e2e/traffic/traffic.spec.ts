import { test, expect } from "@playwright/test";
import { navigateTo, waitForLoaded, expectHeading } from "../helpers";

test.describe("Traffic Module", () => {
  // ─── Dashboard ─────────────────────────────────────────────
  test("Traffic dashboard loads", async ({ page }) => {
    await navigateTo(page, "/traffic");
    await waitForLoaded(page);
    await expectHeading(page, "Traffic");
  });

  // ─── Jobs ──────────────────────────────────────────────────
  test("Jobs list loads with Export button", async ({ page }) => {
    await navigateTo(page, "/traffic/jobs");
    await waitForLoaded(page);
    await expectHeading(page, "Traffic Jobs");
    await expect(page.getByText("Export Excel")).toBeVisible();
    await expect(page.getByText("New Job")).toBeVisible();
  });

  test("New job form loads", async ({ page }) => {
    await navigateTo(page, "/traffic/jobs/new");
    await waitForLoaded(page);
    await expect(page.locator("form").first()).toBeVisible();
  });

  // ─── Dispatch ──────────────────────────────────────────────
  test("Dispatch console loads with assignment capability", async ({ page }) => {
    await navigateTo(page, "/traffic/dispatch");
    await waitForLoaded(page);
    await expectHeading(page, "Dispatch Console");
    await expect(page.getByText("Lock")).toBeVisible();
    await expect(page.getByText("Unlock")).toBeVisible();
    await expect(page.getByText("Export PDF")).toBeVisible();
  });

  // ─── Flights ───────────────────────────────────────────────
  test("Flights list loads", async ({ page }) => {
    await navigateTo(page, "/traffic/flights");
    await waitForLoaded(page);
    await expectHeading(page, "Flights");
  });

  test("New flight form loads", async ({ page }) => {
    await navigateTo(page, "/traffic/flights/new");
    await waitForLoaded(page);
  });

  // ─── Vehicles ──────────────────────────────────────────────
  test("Vehicles list loads", async ({ page }) => {
    await navigateTo(page, "/traffic/vehicles");
    await waitForLoaded(page);
    await expectHeading(page, "Vehicles");
  });

  test("New vehicle form loads", async ({ page }) => {
    await navigateTo(page, "/traffic/vehicles/new");
    await waitForLoaded(page);
  });

  // ─── Vehicle Types ─────────────────────────────────────────
  test("Vehicle types page loads", async ({ page }) => {
    await navigateTo(page, "/traffic/vehicle-types");
    await waitForLoaded(page);
    await expectHeading(page, "Vehicle Types");
  });

  // ─── Drivers ───────────────────────────────────────────────
  test("Drivers list loads", async ({ page }) => {
    await navigateTo(page, "/traffic/drivers");
    await waitForLoaded(page);
    await expectHeading(page, "Drivers");
  });

  test("New driver form loads", async ({ page }) => {
    await navigateTo(page, "/traffic/drivers/new");
    await waitForLoaded(page);
  });

  // ─── Reps ──────────────────────────────────────────────────
  test("Reps list loads", async ({ page }) => {
    await navigateTo(page, "/traffic/reps");
    await waitForLoaded(page);
    await expectHeading(page, "Reps");
  });

  // ─── Guest Bookings ────────────────────────────────────────
  test("Guest bookings list loads", async ({ page }) => {
    await navigateTo(page, "/traffic/guest-bookings");
    await waitForLoaded(page);
    await expectHeading(page, "Guest Bookings");
  });

  test("New guest booking form loads", async ({ page }) => {
    await navigateTo(page, "/traffic/guest-bookings/new");
    await waitForLoaded(page);
  });

  // ─── Pricing ───────────────────────────────────────────────
  test("Pricing page loads with Add button", async ({ page }) => {
    await navigateTo(page, "/traffic/pricing");
    await waitForLoaded(page);
    await expectHeading(page, "Price Items");
    await expect(page.getByText("Add Price Item")).toBeVisible();
  });

  // ─── Supplier Prices ───────────────────────────────────────
  test("Supplier prices loads with Add button", async ({ page }) => {
    await navigateTo(page, "/traffic/supplier-prices");
    await waitForLoaded(page);
    await expectHeading(page, "Supplier Trip Prices");
    await expect(page.getByText("Add Price")).toBeVisible();
  });

  // ─── Partner Overrides ─────────────────────────────────────
  test("Partner overrides loads with Add button", async ({ page }) => {
    await navigateTo(page, "/traffic/partner-overrides");
    await waitForLoaded(page);
    await expectHeading(page, "Partner Price Overrides");
    await expect(page.getByText("Add Override")).toBeVisible();
  });

  // ─── Configuration ─────────────────────────────────────────
  test("Zones page loads", async ({ page }) => {
    await navigateTo(page, "/traffic/zones");
    await waitForLoaded(page);
    await expectHeading(page, "Zones");
  });

  test("Airports page loads", async ({ page }) => {
    await navigateTo(page, "/traffic/airports");
    await waitForLoaded(page);
    await expectHeading(page, "Airports");
  });

  test("Settings page loads", async ({ page }) => {
    await navigateTo(page, "/traffic/settings");
    await waitForLoaded(page);
    await expectHeading(page, "Traffic Settings");
  });

  // ─── Reports ───────────────────────────────────────────────
  test("Daily dispatch report loads", async ({ page }) => {
    await navigateTo(page, "/traffic/reports/daily-dispatch");
    await waitForLoaded(page);
    await expectHeading(page, "Daily Dispatch");
  });

  test("Job stats report loads", async ({ page }) => {
    await navigateTo(page, "/traffic/reports/job-stats");
    await waitForLoaded(page);
    await expectHeading(page, "Job Statistics");
  });

  test("Driver performance report loads with Export button", async ({ page }) => {
    await navigateTo(page, "/traffic/reports/driver-performance");
    await waitForLoaded(page);
    await expectHeading(page, "Driver Performance");
    await expect(page.getByText("Export Excel")).toBeVisible();
  });

  test("Revenue by service report loads", async ({ page }) => {
    await navigateTo(page, "/traffic/reports/revenue-by-service");
    await waitForLoaded(page);
    await expectHeading(page, "Revenue by Service");
  });
});
