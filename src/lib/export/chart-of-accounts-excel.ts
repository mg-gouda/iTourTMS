import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/finance";

export async function downloadChartOfAccountsTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Accounts (the fillable template) ──
  const header = ["Code", "Name", "Type", "Reconcile (Yes/No)", "Deprecated (Yes/No)", "Group Name"];

  const exampleRows = [
    ["1000", "Cash on Hand", "ASSET_CASH", "No", "No", ""],
    ["1100", "Accounts Receivable", "ASSET_RECEIVABLE", "Yes", "No", "Trade Receivables"],
    ["2000", "Accounts Payable", "LIABILITY_PAYABLE", "Yes", "No", ""],
    ["3000", "Owner Equity", "EQUITY", "No", "No", ""],
    ["4000", "Sales Revenue", "INCOME", "No", "No", ""],
    ["5000", "Cost of Goods Sold", "EXPENSE_DIRECT_COST", "No", "No", ""],
  ];

  const accountsSheet = XLSX.utils.aoa_to_sheet([header, ...exampleRows]);

  accountsSheet["!cols"] = [
    { wch: 12 },  // Code
    { wch: 38 },  // Name
    { wch: 26 },  // Type
    { wch: 20 },  // Reconcile
    { wch: 20 },  // Deprecated
    { wch: 26 },  // Group Name
  ];

  // Style header row (bold background)
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "1E3A5F" } }, alignment: { horizontal: "center" } };
  for (let c = 0; c < header.length; c++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c });
    if (accountsSheet[cell]) {
      accountsSheet[cell].s = headerStyle;
    }
  }

  XLSX.utils.book_append_sheet(wb, accountsSheet, "Accounts");

  // ── Sheet 2: Account Types reference ──
  const typesHeader = ["Type Code (use in Accounts sheet)", "Label"];
  const typesRows = Object.entries(ACCOUNT_TYPE_LABELS).map(([code, label]) => [code, label]);

  const typesSheet = XLSX.utils.aoa_to_sheet([typesHeader, ...typesRows]);
  typesSheet["!cols"] = [{ wch: 32 }, { wch: 28 }];

  XLSX.utils.book_append_sheet(wb, typesSheet, "Account Types Reference");

  // ── Sheet 3: Instructions ──
  const instructions = [
    ["Chart of Accounts — Import Instructions"],
    [""],
    ["1. Fill in the 'Accounts' sheet. Do NOT change column headers."],
    ["2. Code: unique account code, max 20 characters (required)."],
    ["3. Name: account name, max 256 characters (required)."],
    ["4. Type: must exactly match one of the codes in the 'Account Types Reference' sheet (required)."],
    ["5. Reconcile: enter Yes or No (default: No)."],
    ["6. Deprecated: enter Yes or No (default: No)."],
    ["7. Group Name: optional. Must match an existing Account Group name exactly."],
    ["8. Delete the example rows before uploading (rows 2-7), or leave them — duplicates are skipped."],
    ["9. Save as .xlsx and upload using the 'Import Accounts' button."],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instructions);
  instrSheet["!cols"] = [{ wch: 72 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, "Instructions");

  XLSX.writeFile(wb, "chart-of-accounts-template.xlsx");
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

  // 1. Exact match
  if (validTypes.has(raw)) return raw;

  // 2. Case-insensitive exact match
  const upper = raw.toUpperCase();
  if (validTypes.has(upper)) return upper;

  // 3. Code is embedded before "-" or " (" e.g. "ASSET_CURRENT-Prepayments"
  const separators = ["-", " (", " —", " –", ":"];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      const prefix = raw.slice(0, idx).trim().toUpperCase();
      if (validTypes.has(prefix)) return prefix;
    }
  }

  // 4. Reverse lookup from human label e.g. "Prepayments" → "ASSET_PREPAYMENTS"
  const byLabel = LABEL_TO_TYPE[raw.toLowerCase()];
  if (byLabel) return byLabel;

  return null;
}

export async function parseChartOfAccountsFile(
  file: File,
): Promise<{ rows: ParsedAccountRow[]; errors: string[] }> {
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ["No sheet found in file."] };

  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const validTypes = new Set(Object.keys(ACCOUNT_TYPE_LABELS));
  const rows: ParsedAccountRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const rowNum = i + 2; // 1-indexed + header

    // Accept multiple common column header names
    const code = pick(r, "Code", "Account Code", "Acct Code", "No.", "No", "Num");
    const name = pick(r, "Name", "Account Name", "Description", "Title");
    const typeRaw = pick(r, "Type", "Account Type", "AccountType", "Type Code", "Category");
    const reconcileRaw = pick(r, "Reconcile (Yes/No)", "Reconcile", "Reconciliation").toLowerCase();
    const deprecatedRaw = pick(r, "Deprecated (Yes/No)", "Deprecated", "Inactive").toLowerCase();
    const groupName = pick(r, "Group Name", "Group", "Account Group", "Section");

    // Skip rows that are entirely empty or look like section headers
    // (have code+name but no type and code is non-numeric / all-caps label)
    if (!code && !name) continue;
    if (!typeRaw && code && name) {
      // Likely a section/group header row — skip silently
      continue;
    }

    if (!code) { errors.push(`Row ${rowNum}: Code is required.`); continue; }
    if (!name) { errors.push(`Row ${rowNum}: Name is required.`); continue; }

    const accountType = resolveType(typeRaw, validTypes);
    if (!accountType) {
      errors.push(`Row ${rowNum}: Unrecognised type "${typeRaw}". Use a code from the Account Types Reference sheet.`);
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

  return { rows, errors };
}
