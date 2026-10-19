import type { Page } from "@playwright/test";
import type { PrismaClient } from "@prisma/client";

/** One window of the manual: a page, or a tab/dialog state of one. */
export interface ManualWindow {
  id: string;
  /** Route as shown in the manual (":id" for a record). */
  route: string;
  /** Turns ":id" routes into a real record's URL; null skips the window. */
  resolve?: (db: PrismaClient) => Promise<string | null>;
  /** Put the page in the state to capture (open a tab, a dialog…). */
  setup?: (page: Page) => Promise<void>;
  /** Regexes for element labels that are data (names, codes) — described in prose, not numbered. */
  skip?: string[];
}

export const tab = (value: string) => async (page: Page) => {
  await page.locator(`[role="tab"][data-value="${value}"], [role="tab"][id$="-trigger-${value}"]`).first().click();
};

/** "/crm/leads/:id" with the first record found. */
export const first =
  (route: string, find: (db: PrismaClient) => Promise<{ id: string } | null>) => async (db: PrismaClient) => {
    const r = await find(db);
    return r ? route.replace(":id", r.id) : null;
  };
