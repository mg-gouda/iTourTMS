/**
 * Converts B2C site routers from protectedProcedure to modulePermissionProcedure.
 */
import { readFileSync, writeFileSync } from "fs";

const RESOURCE_MAP = {
  "branding": "branding",
  "hero-slide": "heroSlide",
  "public-page": "page",
  "blog-post": "blog",
  "faq": "faq",
  "testimonial": "testimonial",
  "newsletter": "newsletter",
  "contact-inquiry": "inquiry",
  "b2c-markup": "markup",
};

function inferAction(procName, isQuery) {
  if (isQuery) return "read";
  const n = procName.toLowerCase();
  if (n.startsWith("create") || n.startsWith("add") || n.startsWith("duplicate")) return "create";
  if (n.startsWith("update") || n.startsWith("edit") || n.startsWith("set") || n.startsWith("toggle") || n.startsWith("reorder") || n.startsWith("save") || n.startsWith("upsert")) return "update";
  if (n.startsWith("delete") || n.startsWith("remove")) return "delete";
  if (n.startsWith("subscribe")) return "create";
  return "manage";
}

const files = Object.entries(RESOURCE_MAP).map(([stem, resource]) => ({
  path: `src/server/trpc/routers/b2c-site/${stem}.ts`,
  resource,
}));

let updatedCount = 0;

for (const { path, resource } of files) {
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch {
    console.log(`  SKIP (not found): ${path}`);
    continue;
  }

  if (src.includes("modulePermissionProcedure")) {
    console.log(`  SKIP (already done): ${path}`);
    continue;
  }

  let out = src;

  // Step 1: Fix import
  out = out.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']@\/server\/trpc["']/,
    (match, imports) => {
      const parts = imports.split(",").map(s => s.trim()).filter(s => s !== "protectedProcedure");
      parts.push("modulePermissionProcedure");
      return `import { ${parts.join(", ")} } from "@/server/trpc"`;
    }
  );

  // Step 2: Add p factory after the last import line
  const lastImportIdx = out.lastIndexOf("\nimport ");
  if (lastImportIdx !== -1) {
    const lineEnd = out.indexOf("\n", lastImportIdx + 1);
    if (lineEnd !== -1) {
      out = out.slice(0, lineEnd + 1) +
        `\nconst p = (code: string) => modulePermissionProcedure("b2c-site", code);\n` +
        out.slice(lineEnd + 1);
    }
  }

  // Step 3: Replace procedure calls line by line
  const lines = out.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Pattern: "  procName: protectedProcedure.query(" or "  procName: protectedProcedure.mutation("
    const directMatch = line.match(/^(\s*)(\w+)\s*:\s*protectedProcedure\.(query|mutation)\s*\(/);
    if (directMatch) {
      const [, , procName, queryOrMutation] = directMatch;
      const isQuery = queryOrMutation === "query";
      const action = inferAction(procName, isQuery);
      const permCode = `b2c-site:${resource}:${action}`;
      result.push(line.replace(
        `protectedProcedure.${queryOrMutation}(`,
        `p("${permCode}").${queryOrMutation}(`
      ));
      i++;
      continue;
    }

    // Pattern: "  procName: protectedProcedure\n" (chained on next line with .input)
    const standaloneMatch = line.match(/^(\s*)(\w+)\s*:\s*protectedProcedure\s*$/);
    if (standaloneMatch) {
      const [, , procName] = standaloneMatch;
      // Scan ahead to find .query or .mutation
      let scanAhead = i + 1;
      let foundType = null;
      while (scanAhead < Math.min(i + 40, lines.length)) {
        const qm = lines[scanAhead].match(/\.(query|mutation)\s*\(/);
        if (qm) { foundType = qm[1]; break; }
        scanAhead++;
      }
      const isQuery = foundType === "query";
      const action = inferAction(procName, isQuery);
      const permCode = `b2c-site:${resource}:${action}`;
      result.push(line.replace("protectedProcedure", `p("${permCode}")`));
      i++;
      continue;
    }

    // Pattern: "  procName: protectedProcedure\n    .input(" (chained with .input on same concept)
    const inputChainMatch = line.match(/^(\s*)(\w+)\s*:\s*protectedProcedure\s*\n?/);
    if (inputChainMatch && line.trim().endsWith("protectedProcedure")) {
      // Already handled above
    }

    // Pattern: "    .input(" after protectedProcedure with .input on same line
    const inputSameLine = line.match(/^(\s*)(\w+)\s*:\s*protectedProcedure\s*\n?\s*\.input\s*\(/);
    if (inputSameLine) {
      const [, , procName] = inputSameLine;
      let scanAhead = i;
      let foundType = null;
      while (scanAhead < Math.min(i + 40, lines.length)) {
        const qm = lines[scanAhead].match(/\.(query|mutation)\s*\(/);
        if (qm) { foundType = qm[1]; break; }
        scanAhead++;
      }
      const isQuery = foundType === "query";
      const action = inferAction(procName, isQuery);
      const permCode = `b2c-site:${resource}:${action}`;
      result.push(line.replace("protectedProcedure", `p("${permCode}")`));
      i++;
      continue;
    }

    result.push(line);
    i++;
  }

  out = result.join("\n");

  // Final cleanup: catch any remaining protectedProcedure references
  if (out.includes("protectedProcedure")) {
    out = out.replace(/protectedProcedure\.query\(/g, `p("b2c-site:${resource}:read").query(`);
    out = out.replace(/protectedProcedure\.mutation\(/g, `p("b2c-site:${resource}:manage").mutation(`);
    out = out.replace(/protectedProcedure\.input\(/g, `p("b2c-site:${resource}:manage").input(`);
    out = out.replace(/protectedProcedure\b/g, `p("b2c-site:${resource}:manage")`);
  }

  if (out !== src) {
    writeFileSync(path, out, "utf8");
    console.log(`  UPDATED: ${path}`);
    updatedCount++;
  } else {
    console.log(`  NO CHANGE: ${path}`);
  }
}

console.log(`\nDone: ${updatedCount} files updated`);
