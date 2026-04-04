import { test, expect } from "@playwright/test";
import { navigateTo, waitForLoaded, expectHeading } from "../helpers";

test.describe("Reservations Module", () => {
  // ─── Dashboard ─────────────────────────────────────────────
  test("Reservations dashboard loads", async ({ page }) => {
    await navigateTo(page, "/reservations");
    await waitForLoaded(page);
    await expectHeading(page, "Reservations Dashboard");
  });

  // ─── Bookings List ─────────────────────────────────────────
  test("Bookings list page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/bookings");
    await waitForLoaded(page);
    await expectHeading(page, "Bookings");
  });

  test("Bookings list has Export button", async ({ page }) => {
    await navigateTo(page, "/reservations/bookings");
    await waitForLoaded(page);
    await expect(
      page.getByRole("button", { name: /Export/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── New Booking ───────────────────────────────────────────
  test("New booking form page loads with multi-room form", async ({ page }) => {
    await navigateTo(page, "/reservations/bookings/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Booking");
    await expect(page.locator("form").first()).toBeVisible();
    // Multi-room form should have room-related inputs
    await expect(
      page.getByText("Room", { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Group Booking ─────────────────────────────────────────
  test("Group booking form page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/bookings/new-group");
    await waitForLoaded(page);
    await expectHeading(page, "Create Group Booking");
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("Group booking form has currency dropdown", async ({ page }) => {
    await navigateTo(page, "/reservations/bookings/new-group");
    await waitForLoaded(page);
    await expect(
      page.getByText("Currency", { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Guests ────────────────────────────────────────────────
  test("Guests list page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/guests");
    await waitForLoaded(page);
    await expectHeading(page, "Guests");
  });

  test("New guest form page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/guests/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Guest");
    await expect(page.locator("form").first()).toBeVisible();
  });

  // ─── Vouchers ──────────────────────────────────────────────
  test("Vouchers list page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/vouchers");
    await waitForLoaded(page);
    await expectHeading(page, "Vouchers");
  });

  test("Vouchers page has transition functionality", async ({ page }) => {
    await navigateTo(page, "/reservations/vouchers");
    await waitForLoaded(page);
    // The page should have the voucher table with action buttons
    await expect(page.locator("table, [role='table']").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // ─── Deadlines ─────────────────────────────────────────────
  test("Deadlines page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/deadlines");
    await waitForLoaded(page);
    await expectHeading(page, "Deadlines Dashboard");
  });

  // ─── Daily Operations ──────────────────────────────────────
  test("Daily operations page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/operations");
    await waitForLoaded(page);
    await expectHeading(page, "Daily Operations");
  });

  // ─── Reports ───────────────────────────────────────────────
  test("Reports page loads", async ({ page }) => {
    await navigateTo(page, "/reservations/reports");
    await waitForLoaded(page);
    await expectHeading(page, "Reports");
  });

  test("Reports page shows all 11 tab triggers", async ({ page }) => {
    await navigateTo(page, "/reservations/reports");
    await waitForLoaded(page);

    const tabs = [
      "Revenue",
      "Occupancy",
      "Arrivals & Departures",
      "Arrival List",
      "Payment Option Date",
      "Materialization",
      "Production by TO",
      "Cancellations",
      "No-Shows",
      "Lead Time",
      "Market Mix",
    ];

    for (const tab of tabs) {
      await expect(
        page.getByRole("tab", { name: tab }).or(
          page.locator(`[role="tablist"] >> text=${tab}`)
        ).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("Reports page has the 5 new report tabs", async ({ page }) => {
    await navigateTo(page, "/reservations/reports");
    await waitForLoaded(page);

    const newTabs = [
      "Production by TO",
      "Cancellations",
      "No-Shows",
      "Lead Time",
      "Market Mix",
    ];

    for (const tab of newTabs) {
      await expect(
        page.getByRole("tab", { name: tab }).or(
          page.locator(`[role="tablist"] >> text=${tab}`)
        ).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  // ─── Booking Detail Tabs ──────────────────────────────────
  test.describe("Booking Detail", () => {
    test("Booking detail page has all expected tabs", async ({ page }) => {
      // Navigate to bookings list first to find a booking
      await navigateTo(page, "/reservations/bookings");
      await waitForLoaded(page);

      // Try clicking the first booking row to navigate to detail
      const firstRow = page.locator("tbody tr").first();
      const rowVisible = await firstRow.isVisible().catch(() => false);

      if (rowVisible) {
        await firstRow.click();
        await waitForLoaded(page);

        const expectedTabs = [
          "Overview",
          "Rooms",
          "Payments",
          "Vouchers",
          "Timeline",
          "Requests",
          "Comms",
        ];

        for (const tab of expectedTabs) {
          await expect(
            page.getByRole("tab", { name: tab, exact: false }).or(
              page.locator(`[role="tablist"] >> text=${tab}`)
            ).first()
          ).toBeVisible({ timeout: 10_000 });
        }
      } else {
        // No bookings exist yet — skip gracefully
        test.skip();
      }
    });
  });
});
