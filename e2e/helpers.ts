import { type Page, expect } from "@playwright/test";

/**
 * Shared helpers for E2E tests.
 */

/** Navigate and wait for page load */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Wait for a loading indicator to disappear */
export async function waitForLoaded(page: Page) {
  // Wait for any "Loading..." text to disappear
  await page
    .locator("text=Loading...")
    .first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => {});
  // Also wait for skeletons
  await page
    .locator('[class*="skeleton"], [class*="Skeleton"]')
    .first()
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => {});
}

/** Click a button by its text content */
export async function clickButton(page: Page, text: string) {
  await page.getByRole("button", { name: text }).click();
}

/** Fill a form field by label */
export async function fillField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label);
  await field.fill(value);
}

/** Select an option from a shadcn Select component by trigger text and option text */
export async function selectOption(
  page: Page,
  triggerText: string,
  optionText: string,
) {
  await page.getByRole("combobox").filter({ hasText: triggerText }).click();
  await page.getByRole("option", { name: optionText }).click();
}

/** Check that a toast success message appears */
export async function expectToast(page: Page, text: string) {
  await expect(page.locator(`[data-sonner-toast] >> text=${text}`).first()).toBeVisible({
    timeout: 5_000,
  }).catch(async () => {
    // Sonner toast might have different structure
    await expect(page.locator(`text=${text}`).first()).toBeVisible({
      timeout: 3_000,
    });
  });
}

/** Check the page title/heading */
export async function expectHeading(page: Page, text: string) {
  await expect(page.getByRole("heading", { name: text }).first()).toBeVisible({
    timeout: 10_000,
  });
}

/** Check a DataTable has rows */
export async function expectTableRows(page: Page, minRows = 0) {
  const rows = page.locator("tbody tr");
  if (minRows > 0) {
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(minRows);
  }
}

/** Click a DataTable row by text content */
export async function clickTableRow(page: Page, text: string) {
  await page.locator("tbody tr").filter({ hasText: text }).first().click();
}

/** Fill a date input */
export async function fillDate(page: Page, selector: string, date: string) {
  await page.fill(selector, date);
}

/** Check sidebar navigation link exists */
export async function expectSidebarLink(page: Page, text: string) {
  await expect(
    page.locator("nav, aside").getByText(text, { exact: false }).first()
  ).toBeVisible({ timeout: 5_000 });
}

/** Take a screenshot with a descriptive name */
export async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

/** Wait for navigation after clicking */
export async function waitForNavigation(page: Page, urlPattern: string) {
  await page.waitForURL(urlPattern, { timeout: 10_000 });
}

/** Check that a badge with specific text exists */
export async function expectBadge(page: Page, text: string) {
  await expect(
    page.locator(`[class*="badge"], [class*="Badge"]`).filter({ hasText: text }).first()
  ).toBeVisible({ timeout: 5_000 });
}
