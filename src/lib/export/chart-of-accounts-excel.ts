import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/finance";

export async function downloadChartOfAccountsTemplate(
  existingGroups: { name: string; codePrefixStart: string; codePrefixEnd: string }[] = [],
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Groups (fill this first) ──
  const groupsHeader = ["Group Name", "Code From", "Code To"];
  const groupsExamples = existingGroups.length > 0
    ? existingGroups.map((g) => [g.name, g.codePrefixStart, g.codePrefixEnd])
    : [
        ["Assets", "1000", "1999"],
        ["Liabilities", "2000", "2999"],
        ["Equity", "3000", "3999"],
        ["Income", "4000", "4999"],
        ["Expenses", "5000", "6999"],
      ];
  const groupsSheet = XLSX.utils.aoa_to_sheet([groupsHeader, ...groupsExamples]);
  groupsSheet["!cols"] = [{ wch: 36 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, groupsSheet, "Groups");

  // ── Sheet 2: Accounts ──
  const accountsHeader = ["Code", "Name", "Type", "Reconcile (Yes/No)", "Deprecated (Yes/No)", "Group Name"];
  const accountsExamples = [
    ["1000", "Cash on Hand", "ASSET_CASH", "No", "No", "Assets"],
    ["1100", "Accounts Receivable", "ASSET_RECEIVABLE", "Yes", "No", "Assets"],
    ["2000", "Accounts Payable", "LIABILITY_PAYABLE", "Yes", "No", "Liabilities"],
    ["3000", "Owner Equity", "EQUITY", "No", "No", "Equity"],
    ["4000", "Sales Revenue", "INCOME", "No", "No", "Income"],
    ["5000", "Cost of Goods Sold", "EXPENSE_DIRECT_COST", "No", "No", "Expenses"],
  ];
  const accountsSheet = XLSX.utils.aoa_to_sheet([accountsHeader, ...accountsExamples]);
  accountsSheet["!cols"] = [
    { wch: 12 }, { wch: 38 }, { wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, accountsSheet, "Accounts");

  // ── Sheet 3: Account Types reference ──
  const typesHeader = ["Type Code (use in Accounts sheet)", "Label"];
  const typesRows = Object.entries(ACCOUNT_TYPE_LABELS).map(([code, label]) => [code, label]);
  const typesSheet = XLSX.utils.aoa_to_sheet([typesHeader, ...typesRows]);
  typesSheet["!cols"] = [{ wch: 32 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, typesSheet, "Account Types Reference");

  // ── Sheet 4: Instructions ──
  const instructions = [
    ["Chart of Accounts — Import Instructions"],
    [""],
    ["STEP 1 — Fill in the 'Groups' sheet:"],
    ["  • Group Name: the group label (e.g. 'Assets', 'Liabilities')"],
    ["  • Code From / Code To: numeric code range for auto-assignment (e.g. 1000 → 1999)"],
    ["  • Groups are created first; accounts are then linked to them automatically."],
    [""],
    ["STEP 2 — Fill in the 'Accounts' sheet:"],
    ["  • Code: unique account code, max 20 characters (required)."],
    ["  • Name: account name, max 256 characters (required)."],
    ["  • Type: must exactly match a code from the 'Account Types Reference' sheet (required)."],
    ["  • Reconcile / Deprecated: enter Yes or No (default: No)."],
    ["  • Group Name: optional. If provided, must match a Group Name exactly from the Groups sheet."],
    ["    If left blank, the system auto-assigns based on the code range you defined in Groups."],
    [""],
    ["  • Delete the example rows before uploading, or leave them — duplicates are skipped."],
    ["  • Save as .xlsx and upload using the 'Import' button on the Chart of Accounts page."],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instructions);
  instrSheet["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, "Instructions");

  XLSX.writeFile(wb, "chart-of-accounts-template.xlsx");
}

export interface ParsedGroupRow {
  name: string;
  codePrefixStart: string;
  codePrefixEnd: string;
}

export interface ParsedAccountRow {
  code: string;
  name: string;
  accountType: string;
  reconcile: boolean;
  deprecated: boolean;
  groupName: string;
  rowIndex: number;
}

// Reverse map: label → type code (case-insensitive)
const LABEL_TO_TYPE = Object.fromEntries(
  Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => [v.toLowerCase(), k]),
);

function pick(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = String(r[k] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function resolveType(raw: string, validTypes: Set<string>): string | null {
  if (!raw) return null;
  if (validTypes.has(raw)) return raw;
  const upper = raw.toUpperCase();
  if (validTypes.has(upper)) return upper;
  const separators = ["-", " (", " —", " –", ":"];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      const prefix = raw.slice(0, idx).trim().toUpperCase();
      if (validTypes.has(prefix)) return prefix;
    }
  }
  const byLabel = LABEL_TO_TYPE[raw.toLowerCase()];
  if (byLabel) return byLabel;
  return null;
}

export async function parseChartOfAccountsFile(file: File): Promise<{
  groups: ParsedGroupRow[];
  rows: ParsedAccountRow[];
  errors: string[];
}> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const errors: string[] = [];
  const groups: ParsedGroupRow[] = [];
  const rows: ParsedAccountRow[] = [];

  // ── Parse Groups sheet (optional) ──
  const groupsSheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("group"),
  );
  if (groupsSheetName) {
    const gSheet = wb.Sheets[groupsSheetName]!;
    const gRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(gSheet, { defval: "" });
    for (const r of gRaw) {
      const name = pick(r, "Group Name", "Name", "Group");
      const from = pick(r, "Code From", "From", "Start", "codePrefixStart");
      const to = pick(r, "Code To", "To", "End", "codePrefixEnd");
      if (!name) continue;
      // skip placeholder rows
      if (name.startsWith("(")) continue;
      groups.push({
        name,
        codePrefixStart: from || name.toUpperCase().replace(/\s+/g, "_"),
        codePrefixEnd: to || name.toUpperCase().replace(/\s+/g, "_"),
      });
    }
  }

  // ── Parse Accounts sheet ──
  const accountsSheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("account") && !n.toLowerCase().includes("type"),
  ) ?? wb.SheetNames[0];
  if (!accountsSheetName) return { groups, rows, errors: ["No sheet found in file."] };

  const sheet = wb.Sheets[accountsSheetName]!;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const validTypes = new Set(Object.keys(ACCOUNT_TYPE_LABELS));

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const rowNum = i + 2;

    const code = pick(r, "Code", "Account Code", "Acct Code", "No.", "No", "Num");
    const name = pick(r, "Name", "Account Name", "Description", "Title");
    const typeRaw = pick(r, "Type", "Account Type", "AccountType", "Type Code", "Category");
    const reconcileRaw = pick(r, "Reconcile (Yes/No)", "Reconcile", "Reconciliation").toLowerCase();
    const deprecatedRaw = pick(r, "Deprecated (Yes/No)", "Deprecated", "Inactive").toLowerCase();
    const groupName = pick(r, "Group Name", "Group", "Account Group", "Section");

    if (!code && !name) continue;
    if (!typeRaw && code && name) continue; // section header row

    if (!code) { errors.push(`Row ${rowNum}: Code is required.`); continue; }
    if (!name) { errors.push(`Row ${rowNum}: Name is required.`); continue; }

    const accountType = resolveType(typeRaw, validTypes);
    if (!accountType) {
      errors.push(`Row ${rowNum}: Unrecognised type "${typeRaw}".`);
      continue;
    }

    rows.push({
      code,
      name,
      accountType,
      reconcile: reconcileRaw === "yes" || reconcileRaw === "true" || reconcileRaw === "1",
      deprecated: deprecatedRaw === "yes" || deprecatedRaw === "true" || deprecatedRaw === "1",
      groupName,
      rowIndex: rowNum,
    });
  }

  return { groups, rows, errors };
}
