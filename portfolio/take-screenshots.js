const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name, url, wait = 1500) {
  if (url) await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(wait);
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage: false,
  });
  console.log(`✓ ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // --- Login ---
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "login.png") });
  console.log("✓ login");

  // Fill credentials
  await page.fill('input[name="email"], input[type="email"]', "mggouda@gmail.com");
  await page.fill('input[name="password"], input[type="password"]', "Demo@2026");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, "dashboard.png") });
  console.log("✓ dashboard");

  // --- Module pages ---
  const pages = [
    ["contracting", "/contracting"],
    ["contracting-contracts", "/contracting/contracts"],
    ["contracting-hotels", "/contracting/hotels"],
    ["reservations", "/reservations"],
    ["reservations-bookings", "/reservations/bookings"],
    ["crm", "/crm"],
    ["crm-leads", "/crm/leads"],
    ["crm-excursions", "/crm/excursions"],
    ["traffic", "/traffic"],
    ["traffic-jobs", "/traffic/jobs"],
    ["finance", "/finance"],
    ["b2b-portal", "/b2b-portal"],
    ["b2c-site", "/b2c-site"],
    ["b2c-site-branding", "/b2c-site/branding"],
    ["settings", "/settings"],
  ];

  for (const [name, url] of pages) {
    try {
      await shot(page, name, `${BASE}${url}`, 2000);
    } catch (e) {
      console.warn(`⚠ ${name}: ${e.message}`);
    }
  }

  // --- B2C public website ---
  const b2cPages = [
    ["b2c-home", "/"],
    ["b2c-search", "/search?destination=&checkIn=2026-07-01&checkOut=2026-07-08&adults=2"],
    ["b2c-hotels", "/hotels"],
    ["b2c-contact", "/contact"],
    ["b2c-about", "/about"],
  ];

  // Need a different context for b2c (same port, different path group)
  for (const [name, url] of b2cPages) {
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      console.log(`✓ ${name}`);
    } catch (e) {
      console.warn(`⚠ ${name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log("\nAll screenshots done →", OUT);
})();
