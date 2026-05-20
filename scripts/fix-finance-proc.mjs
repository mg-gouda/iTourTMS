/**
 * Replace financeProcedure (and similar named-procedure aliases) with p("module:resource:action")
 * in finance router files that already have a p factory defined.
 */
import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";

const FINANCE_RESOURCE_MAP = {
  "account": "account",
  "analytic": "account",
  "audit-trail": "auditTrail",
  "asset": "asset",
  "bank-statement": "bankStatement",
  "batch-payment": "payment",
  "budget": "budget",
  "coa-template": "settings",
  "currency": "settings",
  "deferred-expense": "deferred",
  "deferred-revenue": "deferred",
  "fiscal-position": "settings",
  "journal": "journal",
  "loan": "asset",
  "lock-date": "lockDate",
  "move": "move",
  "partner": "partner",
  "payment": "payment",
  "payment-term": "paymentTerm",
  "period": "period",
  "reconciliation": "reconciliation",
  "recurring-entry": "journal",
  "report": "report",
  "review": "auditTrail",
  "tax": "tax",
  "tax-return": "tax",
  "unrealized-currency": "settings",
  "working-file": "settings",
};

function inferAction(procName, isQuery) {
  if (isQuery) return "read";
  const n = procName.toLowerCase();
  if (n.startsWith("create") || n.startsWith("add") || n.startsWith("duplicate") || n.startsWith("generate") || n.startsWith("seed") || n.startsWith("run") || n.startsWith("import") || n.startsWith("bulk")) return "create";
  if (n.startsWith("update") || n.startsWith("edit") || n.startsWith("set") || n.startsWith("toggle") || n.startsWith("save") || n.startsWith("assign") || n.startsWith("lock") || n.startsWith("unlock") || n.startsWith("upsert") || n.startsWith("relink") || n.startsWith("compute") || n.startsWith("amortize") || n.startsWith("recognize") || n.startsWith("pause") || n.startsWith("resume")) return "update";
  if (n.startsWith("delete") || n.startsWith("remove") || n.startsWith("clear") || n.startsWith("purge")) return "delete";
  if (n.startsWith("confirm") || n.startsWith("approve") || n.startsWith("post") || n.startsWith("finalize") || n.startsWith("activate") || n.startsWith("file") || n.startsWith("close") || n.startsWith("mark")) return "confirm";
  if (n.startsWith("cancel") || n.startsWith("void") || n.startsWith("reject") || n.startsWith("reverse") || n.startsWith("reset")) return "cancel";
  if (n.startsWith("reconcile") || n.startsWith("match") || n.startsWith("unmatch") || n.startsWith("unreconcile") || n.startsWith("suggest")) return "reconcile";
  if (n.startsWith("validate")) return "validate";
  return "manage";
}

const { execSync } = await import("child_process");

// Find files with financeProcedure
const rawFiles = execSync(
  `grep -rln "\\bfinanceProcedure\\b" /home/gouda/iTourTMS/src/server/trpc/routers/ 2>/dev/null`,
  { encoding: "utf8" }
).trim().split("\n").filter(Boolean);

console.log(`Found ${rawFiles.length} files with financeProcedure`);

let updatedCount = 0;

for (const filePath of rawFiles) {
  const src = readFileSync(filePath, "utf8");
  const stem = basename(filePath, ".ts");
  const resource = FINANCE_RESOURCE_MAP[stem] ?? stem.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  const lines = src.split("\n");
  const result = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: "  procName: financeProcedure.query(" or ".mutation(" or ".input("
    const directMatch = line.match(/^(\s*)(\w+)\s*:\s*financeProcedure\.(query|mutation|input)\s*\(/);
    if (directMatch) {
      const [, , procName, qmi] = directMatch;
      const isQuery = qmi === "query";
      const scanType = qmi === "input" ? (() => {
        // scan ahead to find query/mutation
        let found = null;
        for (let s = i; s < Math.min(i + 30, lines.length); s++) {
          const m = lines[s].match(/\.(query|mutation)\s*\(/);
          if (m) { found = m[1]; break; }
        }
        return found;
      })() : qmi;
      const action = inferAction(procName, scanType === "query");
      result.push(line.replace(`financeProcedure.${qmi}(`, `p("finance:${resource}:${action}").${qmi}(`));
      changed = true;
      continue;
    }

    // Pattern: "  procName: financeProcedure\n" (bare, chained)
    const aloneMatch = line.match(/^(\s*)(\w+)\s*:\s*financeProcedure\s*$/);
    if (aloneMatch) {
      const [, , procName] = aloneMatch;
      let foundType = null;
      for (let s = i + 1; s < Math.min(i + 50, lines.length); s++) {
        const m = lines[s].match(/\.(query|mutation)\s*\(/);
        if (m) { foundType = m[1]; break; }
      }
      const action = inferAction(procName, foundType === "query");
      result.push(line.replace("financeProcedure", `p("finance:${resource}:${action}")`));
      changed = true;
      continue;
    }

    result.push(line);
  }

  let out = result.join("\n");

  // Final sweep for any remaining financeProcedure
  if (out.includes("financeProcedure")) {
    out = out.replace(/\bfinanceProcedure\.query\(/g, `p("finance:${resource}:read").query(`);
    out = out.replace(/\bfinanceProcedure\.mutation\(/g, `p("finance:${resource}:manage").mutation(`);
    out = out.replace(/\bfinanceProcedure\.input\(/g, `p("finance:${resource}:manage").input(`);
    out = out.replace(/\bfinanceProcedure\b/g, `p("finance:${resource}:manage")`);
    changed = true;
  }

  if (changed && out !== src) {
    writeFileSync(filePath, out, "utf8");
    console.log(`  UPDATED: ${filePath.replace(/.*\/routers\//, "")}`);
    updatedCount++;
  }
}

console.log(`\nDone: ${updatedCount} files updated`);
