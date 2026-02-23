export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET_RECEIVABLE: "Receivable",
  ASSET_CASH: "Bank and Cash",
  ASSET_CURRENT: "Current Assets",
  ASSET_NON_CURRENT: "Non-current Assets",
  ASSET_PREPAYMENTS: "Prepayments",
  ASSET_FIXED: "Fixed Assets",
  LIABILITY_PAYABLE: "Payable",
  LIABILITY_CREDIT_CARD: "Credit Card",
  LIABILITY_CURRENT: "Current Liabilities",
  LIABILITY_NON_CURRENT: "Non-current Liabilities",
  EQUITY: "Equity",
  EQUITY_UNAFFECTED: "Current Year Earnings",
  INCOME: "Income",
  INCOME_OTHER: "Other Income",
  EXPENSE: "Expenses",
  EXPENSE_DEPRECIATION: "Depreciation",
  EXPENSE_DIRECT_COST: "Cost of Revenue",
  OFF_BALANCE: "Off-Balance Sheet",
};

export const ACCOUNT_TYPE_CATEGORIES: Record<string, string[]> = {
  Assets: [
    "ASSET_RECEIVABLE",
    "ASSET_CASH",
    "ASSET_CURRENT",
    "ASSET_NON_CURRENT",
    "ASSET_PREPAYMENTS",
    "ASSET_FIXED",
  ],
  Liabilities: [
    "LIABILITY_PAYABLE",
    "LIABILITY_CREDIT_CARD",
    "LIABILITY_CURRENT",
    "LIABILITY_NON_CURRENT",
  ],
  Equity: ["EQUITY", "EQUITY_UNAFFECTED"],
  Income: ["INCOME", "INCOME_OTHER"],
  Expenses: ["EXPENSE", "EXPENSE_DEPRECIATION", "EXPENSE_DIRECT_COST"],
  "Off-Balance": ["OFF_BALANCE"],
};

export const JOURNAL_TYPE_LABELS: Record<string, string> = {
  SALE: "Sales",
  PURCHASE: "Purchase",
  CASH: "Cash",
  BANK: "Bank",
  CREDIT_CARD: "Credit Card",
  GENERAL: "Miscellaneous",
};

export const TAX_USE_LABELS: Record<string, string> = {
  SALE: "Sales",
  PURCHASE: "Purchases",
  NONE: "None",
};

export const TAX_AMOUNT_TYPE_LABELS: Record<string, string> = {
  PERCENT: "Percentage",
  FIXED: "Fixed",
  GROUP: "Group of Taxes",
  DIVISION: "Division",
};

export const TERM_VALUE_TYPE_LABELS: Record<string, string> = {
  BALANCE: "Balance",
  PERCENT: "Percent",
  FIXED: "Fixed Amount",
};

export const DELAY_TYPE_LABELS: Record<string, string> = {
  DAYS_AFTER: "Days after invoice date",
  DAYS_AFTER_END_OF_MONTH: "Days after end of month",
  DAYS_AFTER_END_OF_NEXT_MONTH: "Days after end of next month",
};

// ── Move Labels ──

export const MOVE_TYPE_LABELS: Record<string, string> = {
  ENTRY: "Journal Entry",
  OUT_INVOICE: "Customer Invoice",
  OUT_REFUND: "Credit Note",
  IN_INVOICE: "Vendor Bill",
  IN_REFUND: "Vendor Refund",
};

export const MOVE_STATE_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATE_LABELS: Record<string, string> = {
  NOT_PAID: "Not Paid",
  IN_PAYMENT: "In Payment",
  PAID: "Paid",
  PARTIAL: "Partially Paid",
  REVERSED: "Reversed",
};

export const DISPLAY_TYPE_LABELS: Record<string, string> = {
  PRODUCT: "Product",
  TAX: "Tax",
  ROUNDING: "Rounding",
  PAYMENT_TERM: "Payment Term",
  LINE_SECTION: "Section",
  LINE_NOTE: "Note",
};

// ── Payment Labels ──

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  INBOUND: "Customer Payment",
  OUTBOUND: "Vendor Payment",
};

// ── Bank Statement Labels ──

export const BANK_STATEMENT_STATE_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  VALIDATED: "Validated",
};

// ── Batch Payment Labels ──

export const BATCH_PAYMENT_STATE_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  POSTED: "Confirmed",
  CANCELLED: "Cancelled",
};
