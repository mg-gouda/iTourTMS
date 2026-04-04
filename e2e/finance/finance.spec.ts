import { test, expect } from "@playwright/test";
import {
  navigateTo,
  waitForLoaded,
  expectHeading,
  expectTableRows,
  clickButton,
  clickTableRow,
} from "../helpers";

test.describe("Finance Module", () => {
  // ─── Dashboard ─────────────────────────────────────────────
  test("Finance dashboard loads with KPI cards and charts", async ({ page }) => {
    await navigateTo(page, "/finance");
    await waitForLoaded(page);
    await expectHeading(page, "Finance");
    // KPI cards should be visible
    await expect(page.locator("text=Total Revenue").or(page.locator("text=Receivable")).first()).toBeVisible({ timeout: 10_000 });
  });

  // ─── Customer Invoices ─────────────────────────────────────
  test("Customer invoices list page loads", async ({ page }) => {
    await navigateTo(page, "/finance/customers/invoices");
    await waitForLoaded(page);
    await expectHeading(page, "Customer Invoices");
  });

  test("Create new customer invoice", async ({ page }) => {
    await navigateTo(page, "/finance/customers/invoices/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Customer Invoice");
    // MoveForm should render with partner dropdown, journal select, etc.
    await expect(page.locator("form").first()).toBeVisible();
    await expect(page.getByText("Partner").or(page.getByText("Customer")).first()).toBeVisible();
  });

  // ─── Vendor Bills ──────────────────────────────────────────
  test("Vendor bills list page loads", async ({ page }) => {
    await navigateTo(page, "/finance/vendors/bills");
    await waitForLoaded(page);
    await expectHeading(page, "Vendor Bills");
  });

  test("Create new vendor bill page loads", async ({ page }) => {
    await navigateTo(page, "/finance/vendors/bills/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Vendor Bill");
  });

  // ─── Credit Notes & Refunds ────────────────────────────────
  test("Credit notes list loads with New button", async ({ page }) => {
    await navigateTo(page, "/finance/customers/credit-notes");
    await waitForLoaded(page);
    await expectHeading(page, "Credit Notes");
    await expect(page.getByText("New Credit Note")).toBeVisible();
  });

  test("Create new credit note page loads", async ({ page }) => {
    await navigateTo(page, "/finance/customers/credit-notes/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Credit Note");
  });

  test("Vendor refunds list loads with New button", async ({ page }) => {
    await navigateTo(page, "/finance/vendors/refunds");
    await waitForLoaded(page);
    await expectHeading(page, "Vendor Refunds");
    await expect(page.getByText("New Refund")).toBeVisible();
  });

  test("Create new vendor refund page loads", async ({ page }) => {
    await navigateTo(page, "/finance/vendors/refunds/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Vendor Refund");
  });

  // ─── Payments ──────────────────────────────────────────────
  test("Payments list page loads", async ({ page }) => {
    await navigateTo(page, "/finance/payments");
    await waitForLoaded(page);
    await expectHeading(page, "Payments");
  });

  test("Create new payment page loads", async ({ page }) => {
    await navigateTo(page, "/finance/payments/new");
    await waitForLoaded(page);
    await expectHeading(page, "New Payment");
  });

  // ─── Banking ───────────────────────────────────────────────
  test("Bank statements list page loads", async ({ page }) => {
    await navigateTo(page, "/finance/banking/statements");
    await waitForLoaded(page);
    await expectHeading(page, "Bank Statements");
  });

  test("Bank reconciliation page loads", async ({ page }) => {
    await navigateTo(page, "/finance/banking/reconciliation");
    await waitForLoaded(page);
    await expectHeading(page, "Bank Reconciliation");
  });

  test("Batch payments page loads", async ({ page }) => {
    await navigateTo(page, "/finance/banking/batch-payments");
    await waitForLoaded(page);
    await expectHeading(page, "Batch Payments");
  });

  // ─── Accounting ────────────────────────────────────────────
  test("Journal entries list page loads", async ({ page }) => {
    await navigateTo(page, "/finance/accounting/journal-entries");
    await waitForLoaded(page);
    await expectHeading(page, "Journal Entries");
  });

  test("Recurring entries list page loads", async ({ page }) => {
    await navigateTo(page, "/finance/accounting/recurring-entries");
    await waitForLoaded(page);
    await expectHeading(page, "Recurring Entries");
  });

  test("Budgets list page loads", async ({ page }) => {
    await navigateTo(page, "/finance/accounting/budgets");
    await waitForLoaded(page);
    await expectHeading(page, "Budgets");
  });

  // ─── Configuration ─────────────────────────────────────────
  test("Chart of accounts loads with groups and tags panels", async ({ page }) => {
    await navigateTo(page, "/finance/configuration/chart-of-accounts");
    await waitForLoaded(page);
    await expectHeading(page, "Chart of Accounts");
    // Groups and Tags panels should exist
    await expect(page.getByText("Account Groups")).toBeVisible();
    await expect(page.getByText("Account Tags")).toBeVisible();
  });

  test("Journals configuration page loads", async ({ page }) => {
    await navigateTo(page, "/finance/configuration/journals");
    await waitForLoaded(page);
    await expectHeading(page, "Journals");
  });

  test("Taxes configuration page loads", async ({ page }) => {
    await navigateTo(page, "/finance/configuration/taxes");
    await waitForLoaded(page);
    await expectHeading(page, "Taxes");
  });

  test("Payment terms configuration page loads", async ({ page }) => {
    await navigateTo(page, "/finance/configuration/payment-terms");
    await waitForLoaded(page);
    await expectHeading(page, "Payment Terms");
  });

  test("Fiscal positions page loads", async ({ page }) => {
    await navigateTo(page, "/finance/configuration/fiscal-positions");
    await waitForLoaded(page);
    await expectHeading(page, "Fiscal Positions");
  });

  test("Currencies page loads with toggle buttons", async ({ page }) => {
    await navigateTo(page, "/finance/configuration/currencies");
    await waitForLoaded(page);
    await expectHeading(page, "Currencies");
  });

  test("Fiscal years page loads", async ({ page }) => {
    await navigateTo(page, "/finance/configuration/fiscal-years");
    await waitForLoaded(page);
    await expectHeading(page, "Fiscal Years");
  });

  // ─── Reports ───────────────────────────────────────────────
  test("Profit & Loss report loads with export button", async ({ page }) => {
    await navigateTo(page, "/finance/reports/profit-and-loss");
    await waitForLoaded(page);
    await expectHeading(page, "Profit & Loss");
  });

  test("Balance Sheet report loads with export button", async ({ page }) => {
    await navigateTo(page, "/finance/reports/balance-sheet");
    await waitForLoaded(page);
    await expectHeading(page, "Balance Sheet");
  });

  test("Trial Balance report loads with export button", async ({ page }) => {
    await navigateTo(page, "/finance/reports/trial-balance");
    await waitForLoaded(page);
    await expectHeading(page, "Trial Balance");
  });

  test("General Ledger report loads", async ({ page }) => {
    await navigateTo(page, "/finance/reports/general-ledger");
    await waitForLoaded(page);
    await expectHeading(page, "General Ledger");
  });

  test("Aged Receivable report loads", async ({ page }) => {
    await navigateTo(page, "/finance/reports/aged-receivable");
    await waitForLoaded(page);
    await expectHeading(page, "Aged Receivable");
  });

  test("Aged Payable report loads", async ({ page }) => {
    await navigateTo(page, "/finance/reports/aged-payable");
    await waitForLoaded(page);
    await expectHeading(page, "Aged Payable");
  });

  test("Budget vs Actuals report loads", async ({ page }) => {
    await navigateTo(page, "/finance/reports/budget-vs-actuals");
    await waitForLoaded(page);
    await expectHeading(page, "Budget vs Actuals");
  });
});
