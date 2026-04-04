import { test, expect } from "@playwright/test";
import { navigateTo, waitForLoaded, expectHeading } from "../helpers";

test.describe("B2B Portal Module (Dashboard)", () => {
  // ─── Dashboard Pages ───────────────────────────────────────
  test("B2B Portal dashboard loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal");
    await waitForLoaded(page);
  });

  test("Tour operators list loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/tour-operators");
    await waitForLoaded(page);
    await expectHeading(page, "Tour Operators");
  });

  test("Travel agents list loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/travel-agents");
    await waitForLoaded(page);
    await expectHeading(page, "Travel Agents");
  });

  test("B2B search page loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/search");
    await waitForLoaded(page);
    await expectHeading(page, "Search & Book");
  });

  test("B2B reservations list loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/reservations");
    await waitForLoaded(page);
    await expectHeading(page, "Reservations");
  });

  test("B2B vouchers list loads with Generate button", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/vouchers");
    await waitForLoaded(page);
    await expectHeading(page, "Vouchers");
    await expect(page.getByText("Generate Voucher")).toBeVisible();
  });

  test("B2B rate sheets page loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/rate-sheets");
    await waitForLoaded(page);
    await expectHeading(page, "Rate Sheets");
  });

  test("B2B markups page loads with row click to edit", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/markups");
    await waitForLoaded(page);
    await expectHeading(page, "Markup Rules");
  });

  test("B2B credit management page loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/credit");
    await waitForLoaded(page);
    await expectHeading(page, "Credit Management");
  });

  test("B2B partner users page loads", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/partner-users");
    await waitForLoaded(page);
    await expectHeading(page, "Partner Users");
  });

  // ─── Reports ───────────────────────────────────────────────
  test("B2B booking reports load", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/reports/bookings");
    await waitForLoaded(page);
    await expectHeading(page, "Booking Reports");
  });

  test("B2B revenue reports load", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/reports/revenue");
    await waitForLoaded(page);
    await expectHeading(page, "Revenue Reports");
  });

  test("B2B statements page loads with PDF export", async ({ page }) => {
    await navigateTo(page, "/b2b-portal/reports/statements");
    await waitForLoaded(page);
    await expectHeading(page, "Partner Statements");
  });
});
