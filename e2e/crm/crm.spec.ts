import { test, expect } from "@playwright/test";
import { navigateTo, waitForLoaded, expectHeading } from "../helpers";

test.describe("CRM Module", () => {
  // ─── Dashboard ─────────────────────────────────────────────
  test("CRM dashboard loads with KPI sections", async ({ page }) => {
    await navigateTo(page, "/crm");
    await waitForLoaded(page);
    await expectHeading(page, "CRM & Sales");
    // KPI section headings
    await expect(page.getByText("Leads & Pipeline")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Bookings")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Revenue (Confirmed & Completed)")).toBeVisible({ timeout: 5_000 });
  });

  test("CRM dashboard shows recent leads section", async ({ page }) => {
    await navigateTo(page, "/crm");
    await waitForLoaded(page);
    // Recent leads card or table should be present
    await expect(
      page.locator("text=Recent Leads").or(page.locator("text=Latest Leads")).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Leads ─────────────────────────────────────────────────
  test("Leads list page loads", async ({ page }) => {
    await navigateTo(page, "/crm/leads");
    await waitForLoaded(page);
    await expectHeading(page, "Leads");
  });

  test("Leads list has Export Excel button", async ({ page }) => {
    await navigateTo(page, "/crm/leads");
    await waitForLoaded(page);
    await expect(
      page.getByRole("button", { name: /Export Excel/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("New lead form page loads", async ({ page }) => {
    await navigateTo(page, "/crm/leads/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Lead");
    await expect(page.locator("form").first()).toBeVisible();
  });

  // ─── Pipeline ──────────────────────────────────────────────
  test("Pipeline kanban page loads", async ({ page }) => {
    await navigateTo(page, "/crm/pipeline");
    await waitForLoaded(page);
    await expectHeading(page, "Pipeline");
  });

  test("Pipeline renders kanban columns for all stages", async ({ page }) => {
    await navigateTo(page, "/crm/pipeline");
    await waitForLoaded(page);
    const stages = [
      "Prospecting",
      "Qualification",
      "Proposal",
      "Negotiation",
      "Closed Won",
      "Closed Lost",
    ];
    for (const stage of stages) {
      await expect(page.getByText(stage, { exact: false }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("New opportunity page loads", async ({ page }) => {
    await navigateTo(page, "/crm/pipeline/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Opportunity");
    await expect(page.locator("form").first()).toBeVisible();
  });

  // ─── Contacts ──────────────────────────────────────────────
  test("Contacts list page loads", async ({ page }) => {
    await navigateTo(page, "/crm/contacts");
    await waitForLoaded(page);
    await expectHeading(page, "Contacts");
  });

  test("New contact form page loads", async ({ page }) => {
    await navigateTo(page, "/crm/contacts/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Contact");
    await expect(page.locator("form").first()).toBeVisible();
  });

  // ─── Excursions ────────────────────────────────────────────
  test("Excursions list page loads", async ({ page }) => {
    await navigateTo(page, "/crm/excursions");
    await waitForLoaded(page);
    await expectHeading(page, "Excursions");
  });

  test("New excursion form page loads", async ({ page }) => {
    await navigateTo(page, "/crm/excursions/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Excursion");
    await expect(page.locator("form").first()).toBeVisible();
  });

  // ─── Suppliers ─────────────────────────────────────────────
  test("Suppliers list page loads", async ({ page }) => {
    await navigateTo(page, "/crm/suppliers");
    await waitForLoaded(page);
    await expectHeading(page, "Suppliers");
  });

  // ─── Bookings ──────────────────────────────────────────────
  test("Bookings list page loads", async ({ page }) => {
    await navigateTo(page, "/crm/bookings");
    await waitForLoaded(page);
    await expectHeading(page, "Bookings");
  });

  test("Bookings list has Export button", async ({ page }) => {
    await navigateTo(page, "/crm/bookings");
    await waitForLoaded(page);
    await expect(
      page.getByRole("button", { name: /Export/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("New booking form page loads", async ({ page }) => {
    await navigateTo(page, "/crm/bookings/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Booking");
    await expect(page.locator("form").first()).toBeVisible();
  });
});
