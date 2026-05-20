import type { HelpModule } from "./types";

export const financeHelp: HelpModule = {
  slug: "finance",
  name: "Finance & Accounting",
  icon: "Landmark",
  color: "blue",
  description: "Chart of accounts, journals, invoicing, payments, and financial reporting.",
  overview:
    "The Finance & Accounting module is the financial backbone of iTourTMS. It provides a complete double-entry accounting system with customers, vendors, banking, journal entries, and a full set of financial reports. All monetary values use precise decimal arithmetic to ensure accuracy.",
  sections: [
    {
      id: "chart-of-accounts",
      title: "Chart of Accounts",
      description:
        "The Chart of Accounts (CoA) defines all account codes used in your company's general ledger. Accounts are organized by type: assets, liabilities, equity, revenue, and expenses.",
      features: [
        "Create and manage account codes with type classification",
        "Assign accounts to journals for automatic posting",
        "Link accounts to tax codes for VAT/tax handling",
        "Group accounts for balance sheet and P&L presentation",
        "Mark accounts as reconcilable for bank matching",
      ],
      steps: [
        { step: 1, title: "Navigate to Chart of Accounts", description: "Go to Finance → Configuration → Chart of Accounts." },
        { step: 2, title: "Create a new account", description: "Click 'New Account', enter the account code, name, and select the account type (Asset, Liability, Equity, Revenue, or Expense)." },
        { step: 3, title: "Set reconciliation", description: "Enable 'Allow Reconciliation' for bank and receivable/payable accounts so transactions can be matched." },
        { step: 4, title: "Save", description: "Click Save. The account is now available for use in journal entries and invoices." },
      ],
    },
    {
      id: "journals",
      title: "Journals",
      description:
        "Journals control how different types of transactions are recorded. Common journal types include Sales, Purchase, Bank, Cash, and Miscellaneous.",
      features: [
        "Sales journal for customer invoices and credit notes",
        "Purchase journal for vendor bills and refunds",
        "Bank/Cash journals linked to bank accounts",
        "Miscellaneous journal for manual entries",
        "Sequence numbering per journal",
      ],
      steps: [
        { step: 1, title: "Open Journals", description: "Go to Finance → Configuration → Journals." },
        { step: 2, title: "Create or edit a journal", description: "Click New Journal. Choose the journal type and assign default debit/credit accounts." },
        { step: 3, title: "Configure sequence", description: "Set the code prefix used for document numbering (e.g., INV, BILL, BNK)." },
      ],
    },
    {
      id: "customers-invoices",
      title: "Customers & Invoices",
      description:
        "Manage your customer accounts and issue invoices for services rendered. Invoices follow a Draft → Posted → Paid lifecycle.",
      features: [
        "Customer master records with payment terms and fiscal positions",
        "Draft invoices — editable before posting",
        "Post invoices to generate accounting entries automatically",
        "Credit notes for refunds and adjustments",
        "Invoice aging and payment tracking",
      ],
      steps: [
        { step: 1, title: "Go to Customers", description: "Navigate to Finance → Customers → Customers to manage customer records." },
        { step: 2, title: "Create a customer", description: "Click New Customer. Fill in the name, email, payment terms, and fiscal position." },
        { step: 3, title: "Create an invoice", description: "Go to Finance → Customers → Invoices → New Invoice. Select the customer and add invoice lines." },
        { step: 4, title: "Post the invoice", description: "Click 'Post' to lock the invoice and generate the accounting journal entry." },
        { step: 5, title: "Register payment", description: "Once the customer pays, click 'Register Payment' to mark the invoice as paid and reconcile the entry." },
      ],
    },
    {
      id: "vendors-bills",
      title: "Vendors & Bills",
      description:
        "Track vendor accounts and record incoming bills for hotel contracts, services, and other costs.",
      features: [
        "Vendor master with payment terms",
        "Bills (purchase invoices) creation and posting",
        "Vendor refunds for returned or cancelled services",
        "Bill-to-receive and billed-not-received tracking",
      ],
      steps: [
        { step: 1, title: "Open Vendors", description: "Go to Finance → Vendors → Vendors." },
        { step: 2, title: "Create a vendor bill", description: "Go to Finance → Vendors → Bills → New Bill. Select the vendor and add cost lines." },
        { step: 3, title: "Post the bill", description: "Click Post to finalize and generate accounting entries." },
        { step: 4, title: "Pay the bill", description: "Click Register Payment to record the outgoing payment." },
      ],
    },
    {
      id: "payments-banking",
      title: "Payments & Banking",
      description:
        "Record cash and bank payments, import bank statements, and reconcile transactions against invoices and bills.",
      features: [
        "Manual payment entry for both customers and vendors",
        "Batch payments for processing multiple transactions at once",
        "Bank statement import and transaction matching",
        "Booking reconciliation linking reservations to payments",
        "Unreconciled transaction reports",
      ],
    },
    {
      id: "accounting-review",
      title: "Accounting & Review",
      description:
        "Journal entries, audit tools, and period-closing utilities for internal control and compliance.",
      features: [
        "Manual journal entries for corrections and provisions",
        "Analytic items for cost center tracking",
        "Journal audit trail — every posted entry is immutable",
        "Working files for external audit support",
        "Unrealized currency gain/loss adjustments",
        "Deferred revenue and expense recognition",
        "Lock dates to prevent backdating",
      ],
    },
    {
      id: "reports",
      title: "Financial Reports",
      description:
        "A full set of statutory and management reports generated from live accounting data.",
      features: [
        "Balance Sheet — assets vs liabilities snapshot",
        "Profit & Loss — revenue and expenses for any period",
        "Cash Flow Statement — sources and uses of cash",
        "Trial Balance — all accounts with debit/credit totals",
        "General Ledger — every transaction per account",
        "Partner Ledger — customer or vendor transaction history",
        "Aged Receivable & Aged Payable — overdue analysis",
        "Tax Report — VAT summary by period",
        "Budget vs Actuals — plan vs performance",
      ],
    },
  ],
};
