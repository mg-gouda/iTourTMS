/**
 * Transforms tRPC router files from moduleProcedure to modulePermissionProcedure.
 * Usage: node scripts/update-router-permissions.mjs
 */
import { readFileSync, writeFileSync } from "fs";

// Resource mapping: filename stem → resource name
const RESOURCE_MAP = {
  // Finance
  "account": "account", "analytic": "analytic", "asset": "asset",
  "audit-trail": "auditTrail", "bank-statement": "bankStatement",
  "batch-payment": "payment", "budget": "budget", "coa-template": "settings",
  "currency": "settings", "deferred-expense": "deferred", "deferred-revenue": "deferred",
  "fiscal-position": "settings", "journal": "journal", "loan": "asset",
  "lock-date": "lockDate", "move": "move", "partner": "partner",
  "payment-term": "paymentTerm", "payment": "payment", "period": "period",
  "reconciliation": "reconciliation", "recurring-entry": "move", "report": "report",
  "review": "auditTrail", "tax-return": "report", "tax": "tax",
  "unrealized-currency": "move", "working-file": "auditTrail",
  // Contracting
  "contract-allotment": "allotment", "contract-meal-basis": "mealBasis",
  "contract-child-policy": "policy", "rate-calculator": "tariff",
  "season-spo": "offer", "tour-operator": "contract", "audit-log": "contract",
  "tariff": "tariff", "reports": "report", "rate-verification": "tariff",
  "season-spo-btc": "offer", "child-policy": "policy", "markup-rule": "markup",
  "marketing-contribution": "contract", "special-offer": "offer",
  "cancellation-policy": "policy",
  // Tour-ops
  "dispatch": "dispatch", "file": "file", "calculator": "quotation",
  "meals": "component", "sightseeing": "component", "package": "package",
  "guidance": "component", "pnl": "pnl", "flight-ticket": "flightTicket",
  "lookup": "file", "quotation": "quotation", "component": "component",
  "transport": "component",
  // Traffic
  "airport": "airport", "vehicle-type": "vehicle", "traffic-assignment": "dispatch",
  "zone": "zone", "operational-cost": "pricing", "price-item": "pricing",
  "vehicle": "vehicle", "guest-booking": "guestBooking", "traffic-flight": "airport",
  "partner-price-override": "pricing", "driver": "driver",
  "supplier-trip-price": "pricing", "settings": "settings",
  "rep": "driver", "traffic-job": "job",
  // B2B
  "markup": "markup", "rate-sheet": "rateSheet", "partner-user": "partnerUser",
  "reservation": "reservation", "travel-agent": "travelAgent",
  "voucher": "voucher", "credit": "credit", "search": "reservation",
};

// Action mapping: procedure name prefix → action
function inferAction(procName, isQuery) {
  if (isQuery) return "read";
  const name = procName.toLowerCase();
  if (name.startsWith("create") || name.startsWith("add") || name.startsWith("duplicate") || name.startsWith("generate") || name.startsWith("run") || name.startsWith("seed")) return "create";
  if (name.startsWith("update") || name.startsWith("edit") || name.startsWith("set") || name.startsWith("toggle") || name.startsWith("move") || name.startsWith("reorder") || name.startsWith("save") || name.startsWith("assign") || name.startsWith("complete") || name.startsWith("lock") || name.startsWith("unlock") || name.startsWith("close") || name.startsWith("open") || name.startsWith("enable") || name.startsWith("disable")) return "update";
  if (name.startsWith("delete") || name.startsWith("remove") || name.startsWith("clear") || name.startsWith("purge")) return "delete";
  if (name.startsWith("confirm") || name.startsWith("approve") || name.startsWith("post") || name.startsWith("finalize") || name.startsWith("activate")) return "confirm";
  if (name.startsWith("cancel") || name.startsWith("void") || name.startsWith("reject") || name.startsWith("reverse")) return "cancel";
  if (name.startsWith("publish")) return "publish";
  if (name.startsWith("import") || name.startsWith("bulk")) return "import";
  if (name.startsWith("export")) return "export";
  if (name.startsWith("reconcile") || name.startsWith("match") || name.startsWith("unmatch") || name.startsWith("auto")) return "reconcile";
  if (name.startsWith("validate") || name.startsWith("dispatch") || name.startsWith("manage") || name.startsWith("sync") || name.startsWith("reset") || name.startsWith("refresh") || name.startsWith("recalc")) return "manage";
  return "manage";
}

// B2C files use protectedProcedure instead of moduleProcedure
const B2C_FILES = [
  "branding", "hero-slide", "page", "blog-post", "faq", "testimonial",
  "newsletter", "contact-inquiry", "b2c-markup",
];

const FILES_TO_UPDATE = [
  // Finance
  ...["analytic","budget","period","fiscal-position","payment","reconciliation",
      "recurring-entry","tax-return","partner","asset","lock-date","deferred-expense",
      "deferred-revenue","working-file","tax","review","account","payment-term",
      "bank-statement","journal","move","currency","batch-payment","audit-trail",
      "coa-template","loan","report","unrealized-currency"].map(f => ({
    path: `src/server/trpc/routers/finance/${f}.ts`, module: "finance", stem: f,
  })),
  // Contracting
  ...["contract-allotment","contract-meal-basis","contract-child-policy","rate-calculator",
      "season-spo","tour-operator","audit-log","tariff","reports","rate-verification",
      "season-spo-btc","child-policy","markup-rule","marketing-contribution",
      "special-offer","cancellation-policy"].map(f => ({
    path: `src/server/trpc/routers/contracting/${f}.ts`, module: "contracting", stem: f,
  })),
  // Tour-ops
  ...["dispatch","file","calculator","reports","meals","sightseeing","package","guidance",
      "pnl","flight-ticket","lookup","quotation","component","transport"].map(f => ({
    path: `src/server/trpc/routers/tour-ops/${f}.ts`, module: "tour-ops", stem: f,
  })),
  // Traffic
  ...["airport","vehicle-type","traffic-assignment","zone","operational-cost","price-item",
      "vehicle","guest-booking","traffic-flight","partner-price-override","driver",
      "supplier-trip-price","reports","settings","dispatch","rep","traffic-job"].map(f => ({
    path: `src/server/trpc/routers/traffic/${f}.ts`, module: "traffic", stem: f,
  })),
  // B2B Portal
  ...["markup","rate-sheet","reports","partner-user","tour-operator","search",
      "reservation","travel-agent","voucher","credit"].map(f => ({
    path: `src/server/trpc/routers/b2b-portal/${f}.ts`, module: "b2b-portal", stem: f,
  })),
  // CRM remaining
  ...["excursion-ticket","pickup-location","pickup-time-sheet","program-plan","excursion-dispatch"].map(f => ({
    path: `src/server/trpc/routers/crm/${f}.ts`, module: "crm",
    stem: f === "excursion-ticket" ? "excursion" : f === "pickup-location" || f === "pickup-time-sheet" ? "booking" : f === "program-plan" ? "excursion" : "booking",
  })),
  // Reservations remaining
  ...["deadline","special-request"].map(f => ({
    path: `src/server/trpc/routers/reservations/${f}.ts`, module: "reservations", stem: "booking",
  })),
];

let updatedCount = 0;
let skippedCount = 0;

for (const { path, module: mod, stem } of FILES_TO_UPDATE) {
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch {
    console.log(`  SKIP (not found): ${path}`);
    skippedCount++;
    continue;
  }

  // Already updated
  if (src.includes("modulePermissionProcedure")) {
    console.log(`  SKIP (already done): ${path}`);
    skippedCount++;
    continue;
  }

  const resource = RESOURCE_MAP[stem] ?? stem.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  // Step 1: Fix import — replace moduleProcedure (and possibly protectedProcedure) with modulePermissionProcedure
  let out = src;
  out = out.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']@\/server\/trpc["']/,
    (match, imports) => {
      const parts = imports.split(",").map(s => s.trim());
      const filtered = parts.filter(p => p !== "moduleProcedure" && p !== "protectedProcedure");
      filtered.push("modulePermissionProcedure");
      return `import { ${filtered.join(", ")} } from "@/server/trpc"`;
    }
  );

  // Step 2: Replace the procedure variable declaration
  // Pattern: const xxx = moduleProcedure("module") or protectedProcedure
  out = out.replace(
    /const\s+\w+\s*=\s*moduleProcedure\s*\(\s*["'][^"']+["']\s*\)\s*;?\n?/g,
    `const p = (code: string) => modulePermissionProcedure("${mod}", code);\n`
  );
  // Handle protectedProcedure assignment pattern (for b2c-site)
  out = out.replace(
    /const\s+\w+\s*=\s*protectedProcedure\s*;?\n?/g,
    `const p = (code: string) => modulePermissionProcedure("${mod}", code);\n`
  );

  // Step 3: Replace procedure calls
  // We need to handle: procName.query and procName.mutation
  // The procedure variable names we need to replace:
  const oldVarPattern = /\b(\w+Procedure|proc|bp)\.(query|mutation|input)\b/g;

  // Parse the router to find procedure names and their query/mutation type
  // We'll do a line-by-line pass
  const lines = out.split("\n");
  const resultLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for: procName: procVar.query( or procName: procVar.mutation(
    // Pattern: "  procName: someVar.query(" or "  procName: someVar.mutation("
    const procCallMatch = line.match(/^(\s*)(\w+)\s*:\s*(\w+)\.(query|mutation)\s*\(/);
    if (procCallMatch) {
      const [, indent, procName, varName, queryOrMutation] = procCallMatch;
      // Check if this is using the old variable name
      const isOldVar = varName !== "p" && (
        varName.endsWith("Procedure") ||
        varName === "proc" ||
        varName === "bp" ||
        varName === "financeProcedure" ||
        varName === "contractingProcedure" ||
        varName === "trafficProcedure"
      );

      if (isOldVar) {
        const isQuery = queryOrMutation === "query";
        const action = inferAction(procName, isQuery);
        const permCode = `${mod}:${resource}:${action}`;
        const newLine = line.replace(
          `${varName}.${queryOrMutation}(`,
          `p("${permCode}").${queryOrMutation}(`
        );
        resultLines.push(newLine);
        i++;
        continue;
      }
    }

    // Also handle chained: procVar.input(...).query( or .mutation(
    // These are harder to detect — look for lines with oldVarName.input
    const chainedInputMatch = line.match(/^(\s*)(\w+)\s*:\s*(\w+)\.input\s*\(/);
    if (chainedInputMatch) {
      const [, indent, procName, varName] = chainedInputMatch;
      const isOldVar = varName !== "p" && (
        varName.endsWith("Procedure") ||
        varName === "proc" ||
        varName === "bp"
      );

      if (isOldVar) {
        // Scan ahead to find .query( or .mutation(
        let scanAhead = i;
        let foundType = null;
        while (scanAhead < Math.min(i + 30, lines.length)) {
          const aheadLine = lines[scanAhead];
          const qm = aheadLine.match(/\.(query|mutation)\s*\(/);
          if (qm) { foundType = qm[1]; break; }
          scanAhead++;
        }
        const isQuery = foundType === "query";
        const action = inferAction(procName, isQuery);
        const permCode = `${mod}:${resource}:${action}`;
        const newLine = line.replace(
          `${varName}.input(`,
          `p("${permCode}").input(`
        );
        resultLines.push(newLine);
        i++;
        continue;
      }
    }

    resultLines.push(line);
    i++;
  }

  out = resultLines.join("\n");

  // Step 4: Catch any remaining old procedure variable references we missed
  // Use a simple regex fallback for any remaining `.query(` or `.mutation(` on old vars
  const oldVars = ["financeProcedure", "contractingProcedure", "trafficProcedure",
                   "crmProcedure", "tourOpsProcedure", "b2cProcedure", "b2bProcedure",
                   "reservationsProcedure", "proc", "bp"];
  for (const oldVar of oldVars) {
    if (out.includes(`${oldVar}.`)) {
      out = out.replace(new RegExp(`${oldVar}\\.query\\(`, "g"), `p("${mod}:${resource}:read").query(`);
      out = out.replace(new RegExp(`${oldVar}\\.mutation\\(`, "g"), `p("${mod}:${resource}:manage").mutation(`);
      out = out.replace(new RegExp(`${oldVar}\\.input\\(`, "g"), `p("${mod}:${resource}:manage").input(`);
    }
  }

  if (out !== src) {
    writeFileSync(path, out, "utf8");
    console.log(`  UPDATED: ${path}`);
    updatedCount++;
  } else {
    console.log(`  NO CHANGE: ${path}`);
    skippedCount++;
  }
}

console.log(`\nDone: ${updatedCount} updated, ${skippedCount} skipped`);
