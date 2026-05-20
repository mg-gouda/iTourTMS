/**
 * Fix PermissionGuard imports that were inserted inside another multi-line import block.
 * Moves the import to the correct position (before the import block it was inserted into).
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const rawFiles = execSync(
  `grep -rln 'import { PermissionGuard }' /home/gouda/iTourTMS/src/app`,
  { encoding: "utf8" }
).trim().split("\n").filter(Boolean);

let fixed = 0;

for (const fp of rawFiles) {
  const src = readFileSync(fp, "utf8");
  const lines = src.split("\n");

  let pgLineIdx = -1;
  let isInsideBlock = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import \{ PermissionGuard \} from/)) {
      pgLineIdx = i;
      // Check if we're inside a multi-line import (prev line is indented or 'import {')
      const prevLine = i > 0 ? lines[i - 1] : "";
      if (prevLine.match(/^\s+\w/) || prevLine.match(/^import \{$/) || prevLine.match(/,\s*$/)) {
        isInsideBlock = true;
      }
      break;
    }
  }

  if (!isInsideBlock || pgLineIdx === -1) continue;

  // Remove from current position
  const pgImportLine = lines[pgLineIdx];
  lines.splice(pgLineIdx, 1);

  // Find first import line in the remaining array
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) {
      insertAt = i;
      break;
    }
  }

  lines.splice(insertAt, 0, pgImportLine);

  const out = lines.join("\n");
  if (out !== src) {
    writeFileSync(fp, out, "utf8");
    console.log(`FIXED: ${fp.replace("/home/gouda/iTourTMS/src/app/(dashboard)/", "")}`);
    fixed++;
  }
}

console.log(`\nDone: ${fixed} files fixed`);
