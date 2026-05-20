/**
 * Wraps dashboard pages with PermissionGuard.
 * Adds "use client" if missing, imports PermissionGuard, and wraps the main return.
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// Permission mapping: path prefix → permission code
const PATH_PERMISSIONS = [
  // Contracting (remaining)
  ["/contracting/page", "contracting:contract:read"],
  ["/contracting/hotels", "contracting:hotel:read"],
  ["/contracting/destinations", "contracting:destination:read"],
  ["/contracting/markets", "contracting:market:read"],
  ["/contracting/tour-operators", "contracting:contract:read"],
  ["/contracting/contracts", "contracting:contract:read"],
  ["/contracting/templates", "contracting:contract:read"],
  ["/contracting/rates", "contracting:rate:read"],
  ["/contracting/allotments", "contracting:allotment:read"],
  ["/contracting/stop-sales", "contracting:allotment:read"],
  ["/contracting/expiring", "contracting:contract:read"],
  ["/contracting/markups", "contracting:markup:read"],
  ["/contracting/tariffs", "contracting:tariff:read"],
  ["/contracting/rate-simulator", "contracting:tariff:read"],
  ["/contracting/import", "contracting:contract:read"],
  ["/contracting/reports", "contracting:report:read"],
  // CRM
  ["/crm/page", "crm:lead:read"],
  ["/crm/leads", "crm:lead:read"],
  ["/crm/pipeline", "crm:opportunity:read"],
  ["/crm/contacts", "crm:customer:read"],
  ["/crm/bookings", "crm:booking:read"],
  ["/crm/excursions", "crm:excursion:read"],
  ["/crm/exc-programs", "crm:excursion:read"],
  ["/crm/suppliers", "crm:supplier:read"],
  ["/crm/excursion-bookings", "crm:booking:read"],
  ["/crm/excursion-breakdown", "crm:booking:read"],
  ["/crm/excursion-dispatch", "crm:booking:read"],
  ["/crm/to-assign", "crm:booking:read"],
  ["/crm/pickup-time-sheet", "crm:booking:read"],
  // Traffic
  ["/traffic/page", "traffic:job:read"],
  ["/traffic/jobs", "traffic:job:read"],
  ["/traffic/dispatch", "traffic:dispatch:read"],
  ["/traffic/flights", "traffic:airport:read"],
  ["/traffic/vehicles", "traffic:vehicle:read"],
  ["/traffic/vehicle-types", "traffic:vehicle:read"],
  ["/traffic/drivers", "traffic:driver:read"],
  ["/traffic/reps", "traffic:driver:read"],
  ["/traffic/zones", "traffic:zone:read"],
  ["/traffic/airports", "traffic:airport:read"],
  ["/traffic/pricing", "traffic:pricing:read"],
  ["/traffic/supplier-prices", "traffic:pricing:read"],
  ["/traffic/partner-overrides", "traffic:pricing:read"],
  ["/traffic/guest-bookings", "traffic:guestBooking:read"],
  ["/traffic/settings", "traffic:settings:manage"],
  ["/traffic/reports", "traffic:report:read"],
  // Tour-ops
  ["/tour-ops/page", "tour-ops:file:read"],
  ["/tour-ops/files", "tour-ops:file:read"],
  ["/tour-ops/flight-tickets", "tour-ops:flightTicket:read"],
  ["/tour-ops/templates", "tour-ops:package:read"],
  ["/tour-ops/quotations", "tour-ops:quotation:read"],
  ["/tour-ops/master-data", "tour-ops:component:read"],
  ["/tour-ops/reports", "tour-ops:report:read"],
  // B2C Site
  ["/b2c-site/page", "b2c-site:branding:read"],
  ["/b2c-site/branding", "b2c-site:branding:read"],
  ["/b2c-site/hero-slides", "b2c-site:heroSlide:read"],
  ["/b2c-site/pages", "b2c-site:page:read"],
  ["/b2c-site/blog", "b2c-site:blog:read"],
  ["/b2c-site/faq", "b2c-site:faq:read"],
  ["/b2c-site/testimonials", "b2c-site:testimonial:read"],
  ["/b2c-site/inquiries", "b2c-site:inquiry:read"],
  ["/b2c-site/newsletter", "b2c-site:newsletter:read"],
  ["/b2c-site/markup", "b2c-site:markup:read"],
  // B2B Portal
  ["/b2b-portal/page", "b2b-portal:tourOperator:read"],
  ["/b2b-portal/tour-operators", "b2b-portal:tourOperator:read"],
  ["/b2b-portal/travel-agents", "b2b-portal:travelAgent:read"],
  ["/b2b-portal/partner-users", "b2b-portal:partnerUser:read"],
  ["/b2b-portal/search", "b2b-portal:reservation:read"],
  ["/b2b-portal/reservations", "b2b-portal:reservation:read"],
  ["/b2b-portal/vouchers", "b2b-portal:voucher:read"],
  ["/b2b-portal/rate-sheets", "b2b-portal:rateSheet:read"],
  ["/b2b-portal/markups", "b2b-portal:markup:read"],
  ["/b2b-portal/credit", "b2b-portal:credit:read"],
  ["/b2b-portal/reports", "b2b-portal:report:read"],
];

function getPermission(filePath) {
  // Normalise path: strip base dir and page.tsx
  const rel = filePath
    .replace(/.*\/\(dashboard\)/, "")
    .replace(/\/page\.tsx$/, "");

  // Direct match first
  for (const [prefix, perm] of PATH_PERMISSIONS) {
    if (rel === prefix || rel.startsWith(prefix + "/") || rel.startsWith(prefix + "[")) {
      return perm;
    }
  }
  // Module-level fallback
  const mod = rel.split("/")[1];
  return `${mod}:read`;
}

// Get all pages that still need wrapping
const rawFiles = execSync(
  `find /home/gouda/iTourTMS/src/app/\\(dashboard\\) -name "page.tsx" | xargs grep -rL "PermissionGuard" 2>/dev/null`,
  { encoding: "utf8" }
).trim().split("\n").filter(Boolean);

// Filter to only the modules we're handling
const targetModules = ["contracting", "crm", "traffic", "tour-ops", "b2c-site", "b2b-portal"];
const files = rawFiles.filter(f =>
  targetModules.some(m => f.includes(`/(dashboard)/${m}/`))
);

console.log(`Processing ${files.length} pages...`);

let updatedCount = 0;

for (const filePath of files) {
  let src = readFileSync(filePath, "utf8");
  const permission = getPermission(filePath);

  // Step 1: Add "use client" if missing
  let out = src;
  if (!out.startsWith('"use client"') && !out.startsWith("'use client'")) {
    out = `"use client";\n\n${out}`;
  }

  // Step 2: Add PermissionGuard import if missing
  if (!out.includes("PermissionGuard")) {
    // Insert after the last import block
    const lastImportIdx = out.lastIndexOf("\nimport ");
    if (lastImportIdx !== -1) {
      // Find end of that import line
      const lineEnd = out.indexOf("\n", lastImportIdx + 1);
      if (lineEnd !== -1) {
        out = out.slice(0, lineEnd + 1) +
          `import { PermissionGuard } from "@/components/shared/permission-guard";\n` +
          out.slice(lineEnd + 1);
      }
    }
  }

  // Step 3: Wrap the main return statement
  // Strategy: find the LAST `return (` in the file, wrap its JSX
  // We look for the pattern: `return (\n    <` which is the main component return
  // Use a regex to find `return (\n  <` and wrap it

  // Find the last export default function's return
  // Simple approach: find the last `return (` followed by JSX (starts with <)
  // and wrap it with PermissionGuard

  // Pattern 1: "return (\n    <div" style
  // Pattern 2: "return <div" style (single line — less common in this codebase)

  // We'll handle the most common case: `return (\n  <`
  // Find the last occurrence

  const returnMatches = [];
  const returnRegex = /\n(\s*)return\s*\(\n(\s*)</g;
  let match;
  while ((match = returnRegex.exec(out)) !== null) {
    returnMatches.push({ index: match.index, fullMatch: match[0], indent: match[1], innerIndent: match[2] });
  }

  if (returnMatches.length > 0) {
    const lastMatch = returnMatches[returnMatches.length - 1];
    const { index, fullMatch, indent, innerIndent } = lastMatch;

    // Replace: `\n  return (\n    <` → `\n  return (\n    <PermissionGuard permission="...">\n      <`
    const newReturn = `\n${indent}return (\n${indent}  <PermissionGuard permission="${permission}">\n${innerIndent}  <`;
    out = out.slice(0, index) + newReturn + out.slice(index + fullMatch.length);

    // Now we need to close PermissionGuard before the final `);`
    // Find the corresponding closing `);\n` at the end of this return block
    // Strategy: find the last `  );` or `);` that closes this return
    const closeIdx = out.lastIndexOf("\n" + indent + ");");
    if (closeIdx !== -1) {
      const closeLine = "\n" + indent + ");";
      out = out.slice(0, closeIdx) +
        "\n" + indent + "  </PermissionGuard>" +
        closeLine +
        out.slice(closeIdx + closeLine.length);
    } else {
      // Try just `);` at the end
      const altCloseIdx = out.lastIndexOf(");");
      if (altCloseIdx !== -1) {
        out = out.slice(0, altCloseIdx) + `\n${indent}  </PermissionGuard>\n${indent}` + out.slice(altCloseIdx);
      }
    }
  }

  if (out !== src) {
    writeFileSync(filePath, out, "utf8");
    console.log(`  UPDATED: ${filePath.replace(/.*\/\(dashboard\)\//, "")}`);
    updatedCount++;
  } else {
    console.log(`  SKIP (no change): ${filePath.replace(/.*\/\(dashboard\)\//, "")}`);
  }
}

console.log(`\nDone: ${updatedCount} pages wrapped`);
