/**
 * Captures the user manual's screenshots: every window, every field and
 * button numbered in reading order, plus a manifest of what each number is.
 *
 *   pnpm dev                                             # another terminal
 *   npx tsx --env-file=.env scripts/manual/capture.ts crm  # one module, or "all"
 *
 * Writes public/help/<module>/<window>.png and
 * src/lib/help/manual/<module>.manifest.json. Explanations live in
 * src/lib/help/manual/<module>.ts keyed by each element's label, so a re-run
 * after a UI change renumbers the pictures without losing the text.
 * Run against the local demo data as the local super admin.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { WINDOWS, type ManualWindow } from "./windows";

const BASE = process.env.MANUAL_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.MANUAL_EMAIL ?? "dens@local.test";
const PASSWORD = process.env.MANUAL_PASSWORD ?? "Test1234!x";

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  // Skeletons and spinners mean data is still arriving.
  for (let i = 0; i < 20; i++) {
    const busy = await page.locator('[data-slot="skeleton"], .animate-pulse, .animate-spin').count();
    if (!busy) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(800);
}

async function main() {
  const which = process.argv[2] ?? "all";
  const modules = which === "all" ? Object.keys(WINDOWS) : [which];
  const discover = await readFile(path.join(__dirname, "discover.js"), "utf8");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addCookies([
    { name: "itms-branch", value: "all", url: BASE },
    { name: "itms-locale", value: "en", url: BASE },
  ]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(90_000);
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"));

  for (const mod of modules) {
    const outDir = path.join(process.cwd(), "public", "help", mod);
    await mkdir(outDir, { recursive: true });
    const manifest: Record<string, { route: string; items: unknown[] }> = {};
    for (const w of WINDOWS[mod] as ManualWindow[]) {
      const route = w.resolve ? await w.resolve(db) : w.route;
      if (!route) {
        console.warn(`skip ${mod}/${w.id}: no record to show`);
        continue;
      }
      await page.goto(BASE + route);
      await settle(page);
      if (w.setup) {
        await w.setup(page);
        await settle(page);
      }
      await page.evaluate((skip) => ((window as unknown as { __manualSkip: string[] }).__manualSkip = skip), w.skip ?? []);
      const items = (await page.evaluate(discover)) as unknown[];
      await page.screenshot({ path: path.join(outDir, `${w.id}.png`), fullPage: true });
      manifest[w.id] = { route: w.route, items };
      console.log(`${mod}/${w.id}: ${items.length} items`);
    }
    const file = path.join(process.cwd(), "src", "lib", "help", "manual", `${mod}.manifest.json`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
  }
  await browser.close();
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
