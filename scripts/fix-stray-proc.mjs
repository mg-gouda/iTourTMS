/**
 * Replaces remaining stray `proc` references in router files that already
 * have a `p` factory defined but still use the old `proc` variable.
 */
import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";

const RESOURCE_MAP = {
  // Contracting
  "cancellation-policy": "policy", "child-policy": "policy",
  "contract-allotment": "allotment", "contract-child-policy": "policy",
  "contract-meal-basis": "mealBasis", "contract-room-type": "roomType",
  "marketing-contribution": "contract", "markup-rule": "markup",
  "rate-calculator": "tariff", "rate-verification": "tariff",
  "reports": "report", "season-spo": "offer", "season-spo-btc": "offer",
  "special-offer": "offer", "tariff": "tariff",
  "tour-operator": "contract",
  // CRM
  "excursion-breakdown": "booking", "excursion-dispatch": "booking",
  "excursion-ticket": "excursion", "pickup-location": "booking",
  "pickup-time-sheet": "booking", "program-plan": "excursion",
  // Reservations
  "communication": "booking", "deadline": "booking",
  "special-request": "booking",
  // Traffic
  "airport": "airport", "dispatch": "dispatch", "driver": "driver",
  "guest-booking": "guestBooking", "operational-cost": "pricing",
  "partner-price-override": "pricing", "price-item": "pricing",
  "rep": "driver", "settings": "settings",
  "supplier-trip-price": "pricing", "traffic-assignment": "dispatch",
  "traffic-flight": "airport", "traffic-job": "job",
  "vehicle": "vehicle", "vehicle-type": "vehicle", "zone": "zone",
  // Tour-ops
  "calculator": "quotation", "flight-ticket": "flightTicket",
  "lookup": "file",
  // B2B Portal
  "credit": "credit", "markup": "markup", "partner-user": "partnerUser",
  "rate-sheet": "rateSheet", "reservation": "reservation",
  "search": "reservation", "travel-agent": "travelAgent",
  "voucher": "voucher",
  // Shared
  "api-integration": "settings",
};

function inferAction(procName, isQuery) {
  if (isQuery) return "read";
  const n = procName.toLowerCase();
  if (n.startsWith("create") || n.startsWith("add") || n.startsWith("duplicate") || n.startsWith("generate") || n.startsWith("seed") || n.startsWith("run")) return "create";
  if (n.startsWith("update") || n.startsWith("edit") || n.startsWith("set") || n.startsWith("toggle") || n.startsWith("move") || n.startsWith("reorder") || n.startsWith("save") || n.startsWith("assign") || n.startsWith("complete") || n.startsWith("lock") || n.startsWith("unlock") || n.startsWith("close") || n.startsWith("open") || n.startsWith("enable") || n.startsWith("disable") || n.startsWith("link") || n.startsWith("unassign")) return "update";
  if (n.startsWith("delete") || n.startsWith("remove") || n.startsWith("clear") || n.startsWith("purge")) return "delete";
  if (n.startsWith("confirm") || n.startsWith("approve") || n.startsWith("post") || n.startsWith("finalize") || n.startsWith("activate")) return "confirm";
  if (n.startsWith("cancel") || n.startsWith("void") || n.startsWith("reject") || n.startsWith("reverse")) return "cancel";
  if (n.startsWith("publish")) return "publish";
  if (n.startsWith("import") || n.startsWith("bulk")) return "import";
  if (n.startsWith("export")) return "export";
  if (n.startsWith("reconcile") || n.startsWith("match") || n.startsWith("unmatch") || n.startsWith("auto")) return "reconcile";
  if (n.startsWith("waive") || n.startsWith("validate") || n.startsWith("dispatch") || n.startsWith("manage") || n.startsWith("sync") || n.startsWith("reset") || n.startsWith("refresh") || n.startsWith("recalc")) return "manage";
  return "manage";
}

// Get files with stray proc
const { execSync } = await import("child_process");
const rawFiles = execSync(
  `grep -rln "\\bproc\\b" /home/gouda/iTourTMS/src/server/trpc/routers/ 2>/dev/null`,
  { encoding: "utf8" }
).trim().split("\n").filter(Boolean);

let updatedCount = 0;

for (const filePath of rawFiles) {
  const src = readFileSync(filePath, "utf8");

  // Skip files that don't have the p factory yet (not our target)
  if (!src.includes("const p = (code: string) => modulePermissionProcedure")) {
    console.log(`  SKIP (no p factory): ${filePath}`);
    continue;
  }

  // Extract module from p factory
  const modMatch = src.match(/modulePermissionProcedure\("([^"]+)"/);
  if (!modMatch) {
    console.log(`  SKIP (can't find module): ${filePath}`);
    continue;
  }
  const mod = modMatch[1];

  // Get resource from filename
  const stem = basename(filePath, ".ts");
  const resource = RESOURCE_MAP[stem] ?? stem.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  const lines = src.split("\n");
  const result = [];
  let i = 0;
  let changed = false;

  while (i < lines.length) {
    const line = lines[i];

    // Pattern: "  procName: proc.query(" or "  procName: proc.mutation("
    const directMatch = line.match(/^(\s*)(\w+)\s*:\s*proc\.(query|mutation)\s*\(/);
    if (directMatch) {
      const [, , procName, qm] = directMatch;
      const action = inferAction(procName, qm === "query");
      result.push(line.replace(`proc.${qm}(`, `p("${mod}:${resource}:${action}").${qm}(`));
      i++;
      changed = true;
      continue;
    }

    // Pattern: "  procName: proc\n" (proc alone on line, chained)
    const aloneMatch = line.match(/^(\s*)(\w+)\s*:\s*proc\s*$/);
    if (aloneMatch) {
      const [, , procName] = aloneMatch;
      // Scan ahead to find .query or .mutation
      let scan = i + 1;
      let foundType = null;
      while (scan < Math.min(i + 50, lines.length)) {
        const qm = lines[scan].match(/\.(query|mutation)\s*\(/);
        if (qm) { foundType = qm[1]; break; }
        scan++;
      }
      const action = inferAction(procName, foundType === "query");
      result.push(line.replace("proc", `p("${mod}:${resource}:${action}")`));
      i++;
      changed = true;
      continue;
    }

    // Pattern: proc.input( (chained input)
    const inputMatch = line.match(/^(\s*)(\w+)\s*:\s*proc\.input\s*\(/);
    if (inputMatch) {
      const [, , procName] = inputMatch;
      let scan = i;
      let foundType = null;
      while (scan < Math.min(i + 50, lines.length)) {
        const qm = lines[scan].match(/\.(query|mutation)\s*\(/);
        if (qm) { foundType = qm[1]; break; }
        scan++;
      }
      const action = inferAction(procName, foundType === "query");
      result.push(line.replace("proc.input(", `p("${mod}:${resource}:${action}").input(`));
      i++;
      changed = true;
      continue;
    }

    result.push(line);
    i++;
  }

  let out = result.join("\n");

  // Final pass: replace any remaining proc.query/mutation/input
  if (out.includes("proc.")) {
    out = out.replace(/\bproc\.query\(/g, `p("${mod}:${resource}:read").query(`);
    out = out.replace(/\bproc\.mutation\(/g, `p("${mod}:${resource}:manage").mutation(`);
    out = out.replace(/\bproc\.input\(/g, `p("${mod}:${resource}:manage").input(`);
    // Bare proc on its own
    out = out.replace(/\bproc\b(?!\s*[=:])/g, `p("${mod}:${resource}:manage")`);
    changed = true;
  }

  if (changed && out !== src) {
    writeFileSync(filePath, out, "utf8");
    console.log(`  UPDATED: ${filePath.replace(/.*\/routers\//, "")}`);
    updatedCount++;
  } else if (!changed) {
    console.log(`  NO CHANGE: ${filePath.replace(/.*\/routers\//, "")}`);
  }
}

console.log(`\nDone: ${updatedCount} files updated`);
