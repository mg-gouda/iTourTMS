import { format } from "date-fns";

interface ReportRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AgedRow {
  partnerName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

interface GLRow {
  date: string | Date;
  move: string;
  account: string;
  partner: string;
  label: string;
  debit: number;
  credit: number;
  balance: number;
}

export async function exportTrialBalanceToExcel(
  rows: ReportRow[],
  currency: string,
  dateRange?: { from?: string; to?: string },
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = ["Account Code", "Account Name", "Type", "Debit", "Credit", "Balance"];
  const data = rows.map((r) => [
    r.accountCode,
    r.accountName,
    r.accountType,
    r.debit,
    r.credit,
    r.balance,
  ]);

  // Totals row
  const totals = rows.reduce(
    (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit, balance: acc.balance + r.balance }),
    { debit: 0, credit: 0, balance: 0 },
  );
  data.push(["", "TOTAL", "", totals.debit, totals.credit, totals.balance]);

  const sheet = XLSX.utils.aoa_to_sheet([
    [`Trial Balance — ${currency}${dateRange?.from ? ` (${dateRange.from} to ${dateRange.to})` : ""}`],
    [],
    header,
    ...data,
  ]);
  sheet["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Trial Balance");

  XLSX.writeFile(wb, `trial-balance-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

export async function exportProfitAndLossToExcel(
  income: ReportRow[],
  expenses: ReportRow[],
  currency: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = ["Account Code", "Account Name", "Amount"];

  const incomeRows = income.map((r) => [r.accountCode, r.accountName, r.balance]);
  const incomeTotal = income.reduce((s, r) => s + r.balance, 0);

  const expenseRows = expenses.map((r) => [r.accountCode, r.accountName, Math.abs(r.balance)]);
  const expenseTotal = expenses.reduce((s, r) => s + Math.abs(r.balance), 0);

  const sheet = XLSX.utils.aoa_to_sheet([
    [`Profit & Loss — ${currency}`],
    [],
    ["INCOME"],
    header,
    ...incomeRows,
    ["", "Total Income", incomeTotal],
    [],
    ["EXPENSES"],
    header,
    ...expenseRows,
    ["", "Total Expenses", expenseTotal],
    [],
    ["", "NET PROFIT / (LOSS)", incomeTotal - expenseTotal],
  ]);
  sheet["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, sheet, "P&L");

  XLSX.writeFile(wb, `profit-and-loss-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

export async function exportBalanceSheetToExcel(
  assets: ReportRow[],
  liabilities: ReportRow[],
  equity: ReportRow[],
  currency: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = ["Account Code", "Account Name", "Balance"];

  const section = (label: string, rows: ReportRow[]) => {
    const data = rows.map((r) => [r.accountCode, r.accountName, r.balance]);
    const total = rows.reduce((s, r) => s + r.balance, 0);
    return [[label], header, ...data, ["", `Total ${label}`, total], []];
  };

  const all = [
    [`Balance Sheet — ${currency}`],
    [],
    ...section("ASSETS", assets),
    ...section("LIABILITIES", liabilities),
    ...section("EQUITY", equity),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(all as unknown[][]);
  sheet["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Balance Sheet");

  XLSX.writeFile(wb, `balance-sheet-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

export async function exportAgedReportToExcel(
  rows: AgedRow[],
  reportType: "receivable" | "payable",
  currency: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = ["Partner", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"];
  const data = rows.map((r) => [
    r.partnerName,
    r.current,
    r.days1to30,
    r.days31to60,
    r.days61to90,
    r.days90plus,
    r.total,
  ]);

  const label = reportType === "receivable" ? "Aged Receivable" : "Aged Payable";
  const sheet = XLSX.utils.aoa_to_sheet([
    [`${label} — ${currency}`],
    [],
    header,
    ...data,
  ]);
  sheet["!cols"] = [
    { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, label);

  XLSX.writeFile(wb, `${reportType === "receivable" ? "aged-receivable" : "aged-payable"}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

export async function exportGeneralLedgerToExcel(
  rows: GLRow[],
  currency: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = ["Date", "Move", "Account", "Partner", "Label", "Debit", "Credit", "Balance"];
  const data = rows.map((r) => [
    format(new Date(r.date), "dd MMM yyyy"),
    r.move,
    r.account,
    r.partner,
    r.label,
    r.debit,
    r.credit,
    r.balance,
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([
    [`General Ledger — ${currency}`],
    [],
    header,
    ...data,
  ]);
  sheet["!cols"] = [
    { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 22 },
    { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, "General Ledger");

  XLSX.writeFile(wb, `general-ledger-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}
