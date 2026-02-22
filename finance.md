# iTourTMS — Finance Module Specification

> Complete specification for the Finance module — an exact replica of Odoo ERP's Accounting module (v17/18), adapted for the iTourTMS tech stack.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Sub-Modules](#sub-modules)
3. [Database Schema](#database-schema)
4. [UI Structure](#ui-structure)
5. [Views Per Section](#views-per-section)
6. [Business Logic & Workflows](#business-logic--workflows)
7. [API Routes](#api-routes)
8. [File Structure](#file-structure)
9. [Shared UI Components](#shared-ui-components)
10. [Implementation Phases](#implementation-phases)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), Tailwind CSS + shadcn/ui |
| Backend | Node.js API (Next.js API routes + tRPC or REST) |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| Auth | Auth.js with RBAC |
| i18n | 8 languages (EN, FR, DE, TR, IT, ES, RU, AR) + RTL support |
| Currencies | All world currencies with auto exchange rates |
| Deploy | Docker on Hostinger VPS |

---

## Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | **Chart of Accounts** | Account types (18 types), groups (prefix-based hierarchy), tags, multi-company |
| 2 | **Journals** | Sales, Purchase, Bank, Cash, Credit Card, Miscellaneous — each with default accounts, sequences, and currency |
| 3 | **Journal Entries** | Double-entry bookkeeping — unified `Move` model for all financial documents, debit/credit lines, posting workflow, hash chain tamper detection |
| 4 | **Customer Invoices** | Invoice creation, credit notes, debit notes, line items with products/taxes, payment terms, fiscal positions |
| 5 | **Vendor Bills** | Bill entry, vendor refunds/credit notes, same structure as invoices |
| 6 | **Payments** | Customer receipts, vendor payments, register from invoice, auto-reconcile with invoice lines |
| 7 | **Batch Payments** | Group multiple payments into a single deposit/transfer batch |
| 8 | **Bank Reconciliation** | Statement import (CSV/OFX/QIF), 3-panel reconciliation widget, auto-matching engine, suspense account flow |
| 9 | **Tax Management** | Percent/fixed/group/division types, price-included/excluded, tax groups, fiscal positions (tax + account mapping), cash basis taxes |
| 10 | **Fixed Assets** | Asset register, depreciation (straight-line, declining, declining-then-linear), depreciation board, sell/dispose with gain/loss calculation |
| 11 | **Budgets** | Budgetary positions, budget lines with planned amounts, actual vs theoretical comparison, approval workflow |
| 12 | **Analytic Accounting** | Analytic plans (mandatory/optional/unavailable), analytic accounts, multi-plan JSON distribution on journal items |
| 13 | **Financial Reports** | Balance Sheet, Profit & Loss, Cash Flow, General Ledger, Trial Balance, Aged Receivable, Aged Payable, Partner Ledger, Tax Report, Journal Audit, Budget Analysis |
| 14 | **Follow-ups** | Payment reminder levels with escalation, automated email/letter/SMS actions, batch processing |
| 15 | **Reconciliation Models** | Auto-match rules (invoice matching, counterpart suggestions, manual buttons), conditions (amount, label, partner, currency) |
| 16 | **Lock Dates** | Three-tier: journal entries lock (non-advisors), tax return lock (broader), hard lock (irreversible, all users) |
| 17 | **Dashboard** | Kanban journal cards with balance, draft/late counts, mini sparkline graphs, action buttons |
| 18 | **Settings & Config** | Fiscal localization, default taxes, currency auto-rates, invoice settings, bank feeds, analytics, asset management |

---

## Database Schema

### Enums

```prisma
enum AccountType {
  // Balance Sheet — Assets
  ASSET_RECEIVABLE          // Receivable (auto-reconcile enabled)
  ASSET_CASH                // Bank and Cash
  ASSET_CURRENT             // Current Assets
  ASSET_NON_CURRENT         // Non-current Assets
  ASSET_PREPAYMENTS         // Prepayments
  ASSET_FIXED               // Fixed Assets
  // Balance Sheet — Liabilities
  LIABILITY_PAYABLE         // Payable (auto-reconcile enabled)
  LIABILITY_CREDIT_CARD     // Credit Card
  LIABILITY_CURRENT         // Current Liabilities
  LIABILITY_NON_CURRENT     // Non-current Liabilities
  // Balance Sheet — Equity
  EQUITY                    // Equity
  EQUITY_UNAFFECTED         // Current Year Earnings (auto-computed)
  // Profit & Loss — Income
  INCOME                    // Income
  INCOME_OTHER              // Other Income
  // Profit & Loss — Expenses
  EXPENSE                   // Expenses
  EXPENSE_DEPRECIATION      // Depreciation
  EXPENSE_DIRECT_COST       // Cost of Revenue (COGS)
  // Other
  OFF_BALANCE               // Off-Balance Sheet
}

enum JournalType {
  SALE
  PURCHASE
  CASH
  BANK
  CREDIT_CARD
  GENERAL           // Miscellaneous
}

enum MoveType {
  ENTRY             // Journal Entry
  OUT_INVOICE       // Customer Invoice
  OUT_REFUND        // Customer Credit Note
  IN_INVOICE        // Vendor Bill
  IN_REFUND         // Vendor Credit Note
  OUT_RECEIPT       // Sales Receipt
  IN_RECEIPT        // Purchase Receipt
}

enum MoveState {
  DRAFT
  POSTED
  CANCELLED
}

enum PaymentState {
  NOT_PAID
  IN_PAYMENT
  PAID
  PARTIAL
  REVERSED
}

enum DisplayType {
  PRODUCT
  TAX
  ROUNDING
  PAYMENT_TERM
  LINE_SECTION
  LINE_NOTE
}

enum PaymentStateEnum {
  DRAFT
  IN_PROCESS
  PAID
  CANCELLED
  REJECTED
}

enum PaymentType {
  INBOUND           // Receive money
  OUTBOUND          // Send money
}

enum PartnerType {
  CUSTOMER
  SUPPLIER
}

enum BatchPaymentState {
  DRAFT
  SENT
  RECONCILED
}

enum TaxUse {
  SALE
  PURCHASE
  NONE
}

enum TaxAmountType {
  PERCENT
  FIXED
  GROUP             // Group of child taxes
  DIVISION          // Amount / (1 + rate)
}

enum TaxScope {
  SERVICE
  PRODUCT
}

enum TaxDocType {
  INVOICE
  REFUND
}

enum TermValueType {
  BALANCE
  PERCENT
  FIXED
}

enum DelayType {
  DAYS_AFTER
  DAYS_AFTER_END_OF_MONTH
  DAYS_AFTER_END_OF_NEXT_MONTH
}

enum CurrencyPosition {
  BEFORE            // $100
  AFTER             // 100€
}

enum ReconRuleType {
  WRITEOFF_SUGGESTION
  INVOICE_MATCHING
  WRITEOFF_BUTTON
}

enum MatchNature {
  AMOUNT_RECEIVED
  AMOUNT_PAID
  BOTH
}

enum MatchAmountType {
  LOWER
  GREATER
  BETWEEN
}

enum MatchLabelType {
  CONTAINS
  NOT_CONTAINS
  MATCH_REGEX
}

enum WriteoffAmountType {
  PERCENTAGE
  FIXED
}

enum AssetState {
  DRAFT
  OPEN              // Running — depreciation active
  PAUSED
  CLOSED            // Fully depreciated, sold, or disposed
}

enum DepreciationMethod {
  LINEAR            // Straight-line: equal amounts per period
  DECLINING         // Book value × declining factor
  DECLINING_THEN_LINEAR  // Declining until straight-line yields more
}

enum DepreciationPeriod {
  MONTHLY
  YEARLY
}

enum BudgetState {
  DRAFT
  CONFIRMED
  VALIDATED
  DONE
  CANCELLED
}

enum AnalyticApplicability {
  MANDATORY
  OPTIONAL
  UNAVAILABLE
}

enum SequenceReset {
  NEVER
  YEARLY
  MONTHLY
}
```

### Core Models

```prisma
// ============================================================
// CHART OF ACCOUNTS
// ============================================================

model AccountGroup {
  id              String    @id @default(cuid())
  name            String
  codePrefixStart String    // e.g. "1000"
  codePrefixEnd   String    // e.g. "1999"
  parentId        String?
  parent          AccountGroup?  @relation("GroupHierarchy", fields: [parentId], references: [id])
  children        AccountGroup[] @relation("GroupHierarchy")
  accounts        Account[]
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model AccountTag {
  id        String    @id @default(cuid())
  name      String
  color     Int       @default(0)
  accounts  Account[]
  createdAt DateTime  @default(now())
}

model Account {
  id            String      @id @default(cuid())
  code          String      // e.g. "1100", "2100", "4000"
  name          String
  accountType   AccountType
  reconcile     Boolean     @default(false) // auto-enabled for ASSET_RECEIVABLE & LIABILITY_PAYABLE
  deprecated    Boolean     @default(false)
  groupId       String?
  group         AccountGroup? @relation(fields: [groupId], references: [id])
  currencyId    String?     // force specific currency on this account
  currency      Currency?   @relation(fields: [currencyId], references: [id])
  tags          AccountTag[]
  defaultTaxes  Tax[]
  companyId     String
  company       Company     @relation(fields: [companyId], references: [id])
  journalItems  JournalItem[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([code, companyId])
}

// ============================================================
// JOURNALS
// ============================================================

model Journal {
  id                  String      @id @default(cuid())
  name                String      // e.g. "Bank", "Sales", "Purchases"
  code                String      // 1-5 char prefix, e.g. "BNK1", "SAJ", "EXJ"
  type                JournalType
  defaultAccountId    String?
  defaultAccount      Account?    @relation("JournalDefaultAccount", fields: [defaultAccountId], references: [id])
  suspenseAccountId   String?     // for bank journals — unmatched transactions
  suspenseAccount     Account?    @relation("JournalSuspenseAccount", fields: [suspenseAccountId], references: [id])
  profitAccountId     String?     // exchange rate gain
  profitAccount       Account?    @relation("JournalProfitAccount", fields: [profitAccountId], references: [id])
  lossAccountId       String?     // exchange rate loss
  lossAccount         Account?    @relation("JournalLossAccount", fields: [lossAccountId], references: [id])
  currencyId          String?     // dedicated currency (null = company currency)
  currency            Currency?   @relation(fields: [currencyId], references: [id])
  bankAccountId       String?
  bankAccount         BankAccount? @relation(fields: [bankAccountId], references: [id])
  restrictHash        Boolean     @default(false)  // hash chain for tamper detection
  refundSequence      Boolean     @default(false)  // separate numbering for credit notes
  paymentSequence     Boolean     @default(false)  // separate numbering for payments
  sequencePrefix      String?     // e.g. "INV/{year}/"
  sequenceNextNumber  Int         @default(1)
  moves               Move[]
  companyId           String
  company             Company     @relation(fields: [companyId], references: [id])
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  @@unique([code, companyId])
}

// ============================================================
// JOURNAL ENTRIES — The Central Model (account.move)
// ============================================================

model Move {
  id                  String      @id @default(cuid())
  name                String      // sequence: e.g. INV/2026/00001, BILL/2026/00001
  moveType            MoveType
  state               MoveState   @default(DRAFT)
  date                DateTime    // accounting date
  journalId           String
  journal             Journal     @relation(fields: [journalId], references: [id])
  partnerId           String?
  partner             Partner?    @relation(fields: [partnerId], references: [id])
  currencyId          String      // transaction currency
  currency            Currency    @relation(fields: [currencyId], references: [id])
  companyCurrencyId   String      // company's base currency
  companyCurrency     Currency    @relation("MoveCompanyCurrency", fields: [companyCurrencyId], references: [id])

  // Computed totals
  amountUntaxed       Decimal     @default(0)
  amountTax           Decimal     @default(0)
  amountTotal         Decimal     @default(0)
  amountResidual      Decimal     @default(0) // remaining to be paid
  amountPaid          Decimal     @default(0)
  paymentState        PaymentState @default(NOT_PAID)

  // Invoice-specific fields
  invoiceDate         DateTime?
  invoiceDateDue      DateTime?
  paymentTermId       String?
  paymentTerm         PaymentTerm? @relation(fields: [paymentTermId], references: [id])
  fiscalPositionId    String?
  fiscalPosition      FiscalPosition? @relation(fields: [fiscalPositionId], references: [id])

  // References
  ref                 String?     // external reference / communication
  narration           String?     // internal notes (HTML)

  // Reversals
  reversedEntryId     String?
  reversedEntry       Move?       @relation("MoveReversal", fields: [reversedEntryId], references: [id])
  reversalMoves       Move[]      @relation("MoveReversal")

  // Lines
  lines               JournalItem[]

  // Payment link
  payments            Payment[]

  // Bank statement link
  bankStatementLineId String?
  bankStatementLine   BankStatementLine? @relation(fields: [bankStatementLineId], references: [id])

  // Tamper detection
  inalteredHash       String?
  secureSequenceNum   Int?

  // Meta
  companyId           String
  company             Company     @relation(fields: [companyId], references: [id])
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  postedAt            DateTime?
}

// ============================================================
// JOURNAL ITEMS — Line Items (account.move.line)
// ============================================================

model JournalItem {
  id                    String    @id @default(cuid())
  moveId                String
  move                  Move      @relation(fields: [moveId], references: [id], onDelete: Cascade)
  accountId             String
  account               Account   @relation(fields: [accountId], references: [id])
  partnerId             String?
  partner               Partner?  @relation(fields: [partnerId], references: [id])
  name                  String?   // description / label

  // Amounts — company currency
  debit                 Decimal   @default(0)
  credit                Decimal   @default(0)
  balance               Decimal   @default(0)  // debit - credit

  // Amounts — transaction currency
  amountCurrency        Decimal   @default(0)
  currencyId            String
  currency              Currency  @relation(fields: [currencyId], references: [id])

  // Product details (for invoice lines)
  productId             String?
  quantity              Decimal   @default(1)
  priceUnit             Decimal   @default(0)
  discount              Decimal   @default(0)  // percentage

  // Tax
  taxIds                Tax[]     @relation("JournalItemTaxes")  // taxes applied to this line
  taxLineId             String?   // if this line IS a computed tax line
  taxLine               Tax?      @relation("TaxLines", fields: [taxLineId], references: [id])

  // Analytic
  analyticDistribution  Json?     // {"analyticAccountId": percentage, ...}

  // Reconciliation
  reconciled            Boolean   @default(false)
  fullReconcileId       String?
  fullReconcile         FullReconcile? @relation(fields: [fullReconcileId], references: [id])
  partialReconcileIds   PartialReconcile[]

  // Due date (for receivable/payable lines)
  dateMaturity          DateTime?

  // Display
  displayType           DisplayType @default(PRODUCT)
  sequence              Int       @default(10)

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

// ============================================================
// RECONCILIATION
// ============================================================

model FullReconcile {
  id          String        @id @default(cuid())
  name        String        // auto-generated: "P0001", "P0002"
  lines       JournalItem[]
  createdAt   DateTime      @default(now())
}

model PartialReconcile {
  id            String      @id @default(cuid())
  debitMoveId   String
  debitMove     JournalItem @relation(fields: [debitMoveId], references: [id])
  creditMoveId  String
  amount        Decimal     // reconciled amount in company currency
  companyCurrencyId String
  amountCurrency    Decimal? // reconciled amount in transaction currency
  fullReconcileId   String?  // set when partial becomes full
  createdAt     DateTime    @default(now())
}

// ============================================================
// PAYMENTS
// ============================================================

model Payment {
  id                  String           @id @default(cuid())
  state               PaymentStateEnum @default(DRAFT)
  paymentType         PaymentType      // INBOUND = receive, OUTBOUND = send
  partnerType         PartnerType      // CUSTOMER or SUPPLIER
  amount              Decimal
  date                DateTime
  journalId           String
  journal             Journal          @relation(fields: [journalId], references: [id])
  currencyId          String
  currency            Currency         @relation(fields: [currencyId], references: [id])
  partnerId           String?
  partner             Partner?         @relation(fields: [partnerId], references: [id])
  partnerBankId       String?
  partnerBank         BankAccount?     @relation(fields: [partnerBankId], references: [id])
  paymentMethodId     String?
  memo                String?          // communication / reference
  moveId              String?          @unique  // generated journal entry
  move                Move?            @relation(fields: [moveId], references: [id])
  isReconciled        Boolean          @default(false)
  isMatched           Boolean          @default(false)
  companyId           String
  company             Company          @relation(fields: [companyId], references: [id])
  batchPaymentId      String?
  batchPayment        BatchPayment?    @relation(fields: [batchPaymentId], references: [id])
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
}

model BatchPayment {
  id            String            @id @default(cuid())
  name          String
  date          DateTime
  journalId     String
  state         BatchPaymentState @default(DRAFT)
  paymentType   PaymentType
  payments      Payment[]
  amount        Decimal           @default(0) // computed sum
  companyId     String
  company       Company           @relation(fields: [companyId], references: [id])
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

// ============================================================
// TAXES
// ============================================================

model Tax {
  id                String       @id @default(cuid())
  name              String       // e.g. "VAT 15%", "GST 10%"
  typeTaxUse        TaxUse       // SALE, PURCHASE, or NONE
  amountType        TaxAmountType // PERCENT, FIXED, GROUP, DIVISION
  amount            Decimal      // the rate (e.g. 15.00 for 15%)
  priceInclude      Boolean      @default(false) // tax included in price
  includeBaseAmount Boolean      @default(false) // cascading: add to base for next tax
  taxGroupId        String
  taxGroup          TaxGroup     @relation(fields: [taxGroupId], references: [id])
  taxScope          TaxScope?    // SERVICE or PRODUCT
  active            Boolean      @default(true)
  sequence          Int          @default(1) // computation order
  repartitionLines  TaxRepartitionLine[]
  companyId         String
  company           Company      @relation(fields: [companyId], references: [id])
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

model TaxGroup {
  id        String  @id @default(cuid())
  name      String  // e.g. "VAT", "GST", "Excise"
  sequence  Int     @default(0)
  taxes     Tax[]
  companyId String
}

model TaxRepartitionLine {
  id              String     @id @default(cuid())
  taxId           String
  tax             Tax        @relation(fields: [taxId], references: [id])
  factorPercent   Decimal    @default(100) // how much of the tax goes to this account
  accountId       String?
  account         Account?   @relation(fields: [accountId], references: [id])
  useInTaxClosing Boolean    @default(true)
  documentType    TaxDocType // INVOICE or REFUND
  sequence        Int        @default(0)
}

// ============================================================
// FISCAL POSITIONS
// ============================================================

model FiscalPosition {
  id              String    @id @default(cuid())
  name            String    // e.g. "EU Intra-Community", "Export"
  autoApply       Boolean   @default(false) // auto-detect based on country/VAT
  countryId       String?
  countryGroupId  String?
  vatRequired     Boolean?  // require VAT number
  taxMappings     FiscalPositionTaxMap[]
  accountMappings FiscalPositionAccountMap[]
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model FiscalPositionTaxMap {
  id               String         @id @default(cuid())
  fiscalPositionId String
  fiscalPosition   FiscalPosition @relation(fields: [fiscalPositionId], references: [id])
  taxSrcId         String         // original tax
  taxDestId        String?        // replacement tax (null = no tax)
}

model FiscalPositionAccountMap {
  id               String         @id @default(cuid())
  fiscalPositionId String
  fiscalPosition   FiscalPosition @relation(fields: [fiscalPositionId], references: [id])
  accountSrcId     String         // original account
  accountDestId    String         // replacement account
}

// ============================================================
// PAYMENT TERMS
// ============================================================

model PaymentTerm {
  id              String    @id @default(cuid())
  name            String    // e.g. "30 Days", "2/10 Net 30"
  note            String?   // terms & conditions text
  earlyDiscount   Boolean   @default(false)
  discountPercent Decimal?  // e.g. 2.00 for 2%
  discountDays    Int?      // e.g. 10 days
  lines           PaymentTermLine[]
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model PaymentTermLine {
  id            String        @id @default(cuid())
  paymentTermId String
  paymentTerm   PaymentTerm   @relation(fields: [paymentTermId], references: [id])
  valueType     TermValueType // BALANCE, PERCENT, or FIXED
  valueAmount   Decimal       @default(0)
  nbDays        Int           @default(0)
  delayType     DelayType     @default(DAYS_AFTER)
  sequence      Int           @default(0)
}

// ============================================================
// CURRENCIES
// ============================================================

model Currency {
  id            String           @id @default(cuid())
  name          String           // ISO 4217: USD, EUR, GBP, AED, TRY, etc.
  symbol        String           // $, €, £, د.إ, ₺
  fullName      String           // "US Dollar", "Euro"
  position      CurrencyPosition @default(BEFORE)
  decimalPlaces Int              @default(2)
  active        Boolean          @default(true)
  rates         CurrencyRate[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}

model CurrencyRate {
  id          String   @id @default(cuid())
  currencyId  String
  currency    Currency @relation(fields: [currencyId], references: [id])
  rate        Decimal  // rate relative to company currency (1 company = X foreign)
  companyId   String
  date        DateTime @default(now())

  @@unique([currencyId, companyId, date])
}

// ============================================================
// BANK
// ============================================================

model BankAccount {
  id            String    @id @default(cuid())
  accountNumber String    // IBAN or local account number
  bankName      String?
  bankBIC       String?   // SWIFT/BIC code
  partnerId     String
  partner       Partner   @relation(fields: [partnerId], references: [id])
  currencyId    String?
  currency      Currency? @relation(fields: [currencyId], references: [id])
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model BankStatement {
  id            String              @id @default(cuid())
  name          String              // e.g. "BNK1/2026/02"
  date          DateTime
  journalId     String
  journal       Journal             @relation(fields: [journalId], references: [id])
  balanceStart  Decimal             @default(0)
  balanceEnd    Decimal             @default(0)
  lines         BankStatementLine[]
  companyId     String
  company       Company             @relation(fields: [companyId], references: [id])
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
}

model BankStatementLine {
  id              String    @id @default(cuid())
  statementId     String
  statement       BankStatement @relation(fields: [statementId], references: [id])
  date            DateTime
  paymentRef      String?   // reference from bank (invoice number, check number)
  partnerName     String?   // name as it appears in bank
  partnerId       String?
  partner         Partner?  @relation(fields: [partnerId], references: [id])
  amount          Decimal   // positive = inbound, negative = outbound
  currencyId      String?
  amountCurrency  Decimal?
  transactionType String?
  note            String?
  isReconciled    Boolean   @default(false)
  moves           Move[]    // linked journal entries after reconciliation
  sequence        Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ============================================================
// RECONCILIATION MODELS
// ============================================================

model ReconciliationModel {
  id                String         @id @default(cuid())
  name              String
  ruleType          ReconRuleType  // WRITEOFF_SUGGESTION, INVOICE_MATCHING, WRITEOFF_BUTTON
  autoReconcile     Boolean        @default(false)
  // Match conditions
  matchNature       MatchNature?
  matchAmount       MatchAmountType?
  matchAmountMin    Decimal?
  matchAmountMax    Decimal?
  matchLabel        MatchLabelType?
  matchLabelParam   String?        // regex or search string
  matchPartnerId    String?
  matchSameCurrency Boolean        @default(true)
  // Counterpart lines
  lines             ReconciliationModelLine[]
  companyId         String
  company           Company        @relation(fields: [companyId], references: [id])
  sequence          Int            @default(10)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}

model ReconciliationModelLine {
  id          String             @id @default(cuid())
  modelId     String
  model       ReconciliationModel @relation(fields: [modelId], references: [id])
  accountId   String
  account     Account            @relation(fields: [accountId], references: [id])
  amountType  WriteoffAmountType // PERCENTAGE or FIXED
  amountValue Decimal            @default(100)
  taxId       String?
  label       String?
  sequence    Int                @default(0)
}

// ============================================================
// FIXED ASSETS
// ============================================================

model Asset {
  id                    String             @id @default(cuid())
  name                  String
  state                 AssetState         @default(DRAFT)
  accountAssetId        String             // fixed asset account (e.g. 1500)
  accountDepreciationId String             // accumulated depreciation account (e.g. 1509)
  accountExpenseId      String             // depreciation expense account (e.g. 6100)
  journalId             String
  journal               Journal            @relation(fields: [journalId], references: [id])
  originalValue         Decimal
  salvageValue          Decimal            @default(0)
  bookValue             Decimal            // computed: original - cumulative depreciation
  acquisitionDate       DateTime
  method                DepreciationMethod @default(LINEAR)
  methodNumber          Int                @default(12) // number of depreciation periods
  methodPeriod          DepreciationPeriod @default(MONTHLY)
  decliningFactor       Decimal            @default(2)  // for declining method
  prorata               Boolean            @default(true) // prorate first period
  depreciationLines     DepreciationLine[]
  partnerId             String?            // vendor
  partner               Partner?           @relation(fields: [partnerId], references: [id])
  companyId             String
  company               Company            @relation(fields: [companyId], references: [id])
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
}

model DepreciationLine {
  id               String   @id @default(cuid())
  assetId          String
  asset            Asset    @relation(fields: [assetId], references: [id])
  sequence         Int
  depreciationDate DateTime
  amount           Decimal
  cumulativeAmount Decimal
  remainingValue   Decimal
  moveId           String?  @unique  // posted journal entry
  move             Move?    @relation(fields: [moveId], references: [id])
  createdAt        DateTime @default(now())
}

// ============================================================
// BUDGETS
// ============================================================

model BudgetaryPosition {
  id         String    @id @default(cuid())
  name       String    // e.g. "Marketing Expenses", "Revenue"
  accountIds Account[] @relation("BudgetPositionAccounts")
  companyId  String
  company    Company   @relation(fields: [companyId], references: [id])
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model Budget {
  id        String      @id @default(cuid())
  name      String      // e.g. "FY 2026 Budget"
  state     BudgetState @default(DRAFT)
  dateFrom  DateTime
  dateTo    DateTime
  lines     BudgetLine[]
  companyId String
  company   Company     @relation(fields: [companyId], references: [id])
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}

model BudgetLine {
  id                  String            @id @default(cuid())
  budgetId            String
  budget              Budget            @relation(fields: [budgetId], references: [id])
  budgetaryPositionId String
  budgetaryPosition   BudgetaryPosition @relation(fields: [budgetaryPositionId], references: [id])
  analyticAccountId   String?
  analyticAccount     AnalyticAccount?  @relation(fields: [analyticAccountId], references: [id])
  dateFrom            DateTime
  dateTo              DateTime
  plannedAmount       Decimal
  // Computed at query time:
  //   practicalAmount = sum of actual journal items in the period
  //   theoreticalAmount = plannedAmount × (elapsed days / total days)
  //   percentage = practicalAmount / theoreticalAmount × 100
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
}

// ============================================================
// ANALYTIC ACCOUNTING
// ============================================================

model AnalyticPlan {
  id            String                @id @default(cuid())
  name          String                // e.g. "Departments", "Projects", "Regions"
  parentId      String?
  parent        AnalyticPlan?         @relation("PlanHierarchy", fields: [parentId], references: [id])
  children      AnalyticPlan[]        @relation("PlanHierarchy")
  applicability AnalyticApplicability @default(OPTIONAL)
  accounts      AnalyticAccount[]
  companyId     String
  company       Company               @relation(fields: [companyId], references: [id])
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt
}

model AnalyticAccount {
  id        String       @id @default(cuid())
  name      String       // e.g. "Sales Dept", "Project Alpha"
  code      String?
  planId    String
  plan      AnalyticPlan @relation(fields: [planId], references: [id])
  partnerId String?
  partner   Partner?     @relation(fields: [partnerId], references: [id])
  active    Boolean      @default(true)
  companyId String
  company   Company      @relation(fields: [companyId], references: [id])
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

// ============================================================
// FOLLOW-UPS
// ============================================================

model FollowUpLevel {
  id              String  @id @default(cuid())
  name            String  // e.g. "First Reminder", "Second Reminder", "Final Warning"
  delayDays       Int     // days after due date (negative = before due)
  sendEmail       Boolean @default(true)
  sendLetter      Boolean @default(false)
  sendSms         Boolean @default(false)
  autoExecute     Boolean @default(false) // run automatically via cron
  attachInvoices  Boolean @default(true)
  emailTemplateId String?
  description     String? // message body template
  companyId       String
  company         Company @relation(fields: [companyId], references: [id])
  sequence        Int     @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============================================================
// LOCK DATES
// ============================================================

model AccountLockDate {
  id                  String    @id @default(cuid())
  periodLockDate      DateTime? // non-advisor users cannot edit entries before this date
  fiscalyearLockDate  DateTime? // broader lock — after tax returns filed
  hardLockDate        DateTime? // IRREVERSIBLE — blocks ALL users
  companyId           String    @unique
  company             Company   @relation(fields: [companyId], references: [id])
  updatedAt           DateTime  @updatedAt
  updatedById         String
}

// ============================================================
// SEQUENCES
// ============================================================

model Sequence {
  id            String        @id @default(cuid())
  name          String        // e.g. "Customer Invoice", "Vendor Bill"
  prefix        String        // e.g. "INV/{year}/"
  padding       Int           @default(5)  // 00001
  nextNumber    Int           @default(1)
  resetInterval SequenceReset @default(YEARLY) // reset counter at fiscal year
  companyId     String
  company       Company       @relation(fields: [companyId], references: [id])

  @@unique([name, companyId])
}
```

---

## UI Structure

### Global Layout (Odoo 17/18 Replica)

```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR                                                      │
│ ┌─────────────────┐  ┌──────────┐  ┌──────────────────────┐ │
│ │ Breadcrumb Trail │  │ Actions  │  │ Search / Filter / GB │ │
│ └─────────────────┘  └──────────┘  └──────────────────────┘ │
│ View Switcher: [List] [Kanban] [Pivot] [Graph]               │
├────────┬─────────────────────────────────────────────────────┤
│ SIDE   │ MAIN CONTENT AREA                                   │
│ BAR    │                                                     │
│        │                                                     │
│ Menu   │  (varies by view: List / Kanban / Form / Pivot)     │
│ Items  │                                                     │
│        │                                                     │
└────────┴─────────────────────────────────────────────────────┘
```

### Sidebar Navigation (Finance Module)

```
FINANCE
├── Dashboard
├── Customers
│   ├── Invoices
│   ├── Credit Notes
│   ├── Payments
│   ├── Batch Payments
│   └── Follow-up Reports
├── Vendors
│   ├── Bills
│   ├── Refunds
│   ├── Payments
│   └── Batch Payments
├── Accounting
│   ├── Journal Entries
│   ├── Journal Items
│   ├── Lock Dates
│   ├── Reconcile
│   └── Bank Statements
├── Reporting
│   ├── Balance Sheet
│   ├── Profit and Loss
│   ├── Cash Flow Statement
│   ├── General Ledger
│   ├── Trial Balance
│   ├── Partner Ledger
│   ├── Aged Receivable
│   ├── Aged Payable
│   ├── Tax Report
│   ├── Journal Audit
│   └── Budget Analysis
└── Configuration
    ├── Settings
    ├── Chart of Accounts
    ├── Journals
    ├── Taxes
    ├── Tax Groups
    ├── Fiscal Positions
    ├── Payment Terms
    ├── Currencies
    ├── Fiscal Years
    ├── Follow-up Levels
    ├── Reconciliation Models
    ├── Analytic Plans
    ├── Budgetary Positions
    └── Bank Accounts
```

### Dashboard View (Kanban)

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 🏦 Bank     │ │ 💵 Cash     │ │ 📤 Sales    │ │ 📥 Purchase │
│             │ │             │ │             │ │             │
│ $12,450.00  │ │ $3,200.00   │ │ 5 Drafts    │ │ 3 Drafts    │
│ 3 to recon. │ │ 1 to recon. │ │ 2 Late      │ │ 1 Late      │
│ ╭──────────╮│ │ ╭──────────╮│ │ ╭──────────╮│ │ ╭──────────╮│
│ │ ~sparkline││ │ │ ~sparkline││ │ │ ~sparkline││ │ │ ~sparkline││
│ ╰──────────╯│ │ ╰──────────╯│ │ ╰──────────╯│ │ ╰──────────╯│
│ [New] [•••] │ │ [New] [•••] │ │ [New] [•••] │ │ [New] [•••] │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Invoice Form View

```
┌──────────────────────────────────────────────────────────────┐
│ Status: [● Draft] ─── [○ Posted] ─── [○ Paid]               │
│ Buttons: [Confirm] [Preview] [Send & Print]                  │
├──────────────────────────────────────────────────────────────┤
│ Customer:    [__________________▾]   Invoice Date: [__/__/___]│
│ Delivery:    [__________________▾]   Due Date:     [__/__/___]│
│ Payment Ref: [__________________]    Payment Terms:[________▾]│
├──────────────────────────────────────────────────────────────┤
│ ┌─ Invoice Lines ─┬─ Journal Items ─┬─ Other Info ──────┐   │
│ │                                                        │   │
│ │ Product   │ Description │ Account │ Qty │ Price │ Tax  │ T │
│ ├───────────┼─────────────┼─────────┼─────┼───────┼──────┤   │
│ │ Hotel Rm  │ Deluxe Stay │ 4100    │  2  │ 500   │ 15%  │1k │
│ │ Transfer  │ Airport     │ 4200    │  1  │ 150   │ 15%  │150│
│ │ [+ Add a line]  [+ Add a section]  [+ Add a note]      │   │
│ │                                                        │   │
│ │                    Untaxed Amount:      $1,150.00       │   │
│ │                    VAT 15%:               $172.50       │   │
│ │                    ─────────────────────────────        │   │
│ │                    Total:              $1,322.50        │   │
│ └────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│ Outstanding credits:                                         │
│   [Pay $500.00 from BNK1/2026/00012]  [Add]                │
├──────────────────────────────────────────────────────────────┤
│ Messages ─── Activities ─── Log                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Feb 20: Invoice created by Admin                       │   │
│ │ Feb 20: Email sent to customer@example.com             │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Bank Reconciliation Widget (3-Panel)

```
┌────────────────────────┬─────────────────────────────────────┐
│ BANK TRANSACTIONS      │ COUNTERPART MATCHES                 │
│                        │                                     │
│ ✓ TXN-001   +$500.00 │ → INV/2026/00012 $500.00    [Match] │
│   "Payment ABC Ltd"   │   ABC Ltd — Invoice #12             │
│                        │                                     │
│   TXN-002   +$320.00 │ → INV/2026/00015 $320.00    [Match] │
│   "Wire XYZ Co"       │   XYZ Co — Invoice #15              │
│                        │                                     │
│   TXN-003   -$45.00  │ → (No match found)                  │
│   "Bank Fee"           │   [Create write-off]                │
│                        ├─────────────────────────────────────┤
│                        │ RESULTING ENTRY                     │
│                        │                                     │
│                        │ DR  Suspense Account    $500.00     │
│                        │ CR  Accounts Receivable $500.00     │
│                        │                                     │
│                        │ [✓ Validate]  [⚑ To Check]         │
└────────────────────────┴─────────────────────────────────────┘
```

### Financial Report View

```
┌──────────────────────────────────────────────────────────────┐
│ Balance Sheet                               Date: 2026-02-20│
│ Comparison: vs 2025-12-31                   [PDF] [XLSX]     │
├──────────────────────────────────────────────────────────────┤
│                              Current     Previous     Change │
│ ▼ ASSETS                                                     │
│   ▼ Current Assets                                           │
│     1100 Accounts Receivable  $45,200    $38,100    +$7,100 │
│     1200 Bank                 $128,500   $115,200   +$13,300│
│     1300 Cash                 $5,400     $4,800       +$600 │
│     ────────────────────────────────────────────────────     │
│     Subtotal Current Assets   $179,100   $158,100   +$21,000│
│   ▼ Fixed Assets                                             │
│     1500 Equipment            $25,000    $25,000         $0 │
│     1509 Accum. Depreciation  ($8,333)   ($6,250)   -$2,083│
│     ────────────────────────────────────────────────────     │
│     Subtotal Fixed Assets     $16,667    $18,750    -$2,083 │
│   TOTAL ASSETS                $195,767   $176,850   +$18,917│
│                                                              │
│ ▼ LIABILITIES                                                │
│   ...                                                        │
│ ▼ EQUITY                                                     │
│   ...                                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Views Per Section

| Section | Views | Key Features |
|---------|-------|-------------|
| **Dashboard** | Kanban | Journal cards with balance, draft/late counts, sparkline graph, action buttons (New, Reconcile) |
| **Invoices** | List, Form | Inline editing, status bar pipeline, editable line items grid, payment widget, chatter |
| **Credit Notes** | List, Form | Same as invoices, created via reversal wizard (full/partial/new draft) |
| **Payments** | List, Form | Register from invoice wizard, batch grouping, reconciliation status indicators |
| **Journal Entries** | List, Form | Debit/credit balance validation, auto-sequence, hash chain, multi-currency dual amounts |
| **Journal Items** | List | Read-only aggregated view across all moves, filterable by account/partner/date |
| **Bank Recon** | Custom 3-panel | Transaction list (left), match suggestions (right-top), resulting entry (right-bottom) |
| **Reports** | Custom tabular | Expand/collapse account groups, drill-down to entries, period comparison, PDF/XLSX export |
| **Chart of Accounts** | List | Grouped by account type, inline code/name editing, balance column |
| **Taxes** | List, Form | Tax computation preview, repartition lines for invoice/refund accounts |
| **Assets** | List, Form | Depreciation board table, computed schedule, sell/dispose wizards |
| **Budgets** | List, Form, Pivot | Planned vs actual vs theoretical, percentage achievement, analytic drill-down |
| **Follow-ups** | List | Partners with overdue amounts, current follow-up level, batch action buttons |

---

## Business Logic & Workflows

### Invoice Lifecycle

```
DRAFT ──[Confirm]──→ POSTED ──[Register Payment]──→ IN_PAYMENT ──[Bank Reconcile]──→ PAID
  │                    │
  │                    ├──[Credit Note]──→ creates reversal Move (OUT_REFUND / IN_REFUND)
  │                    │
  │                    └──[Reset to Draft]──→ DRAFT
  │
  └──[Delete]──→ removed (only drafts)
```

### Payment Registration Flow

1. Open a **posted** invoice → click **"Register Payment"**
2. Wizard opens pre-filled: journal (bank/cash), amount, date, memo
3. On confirm:
   - Creates `Payment` record
   - Creates `Move` with lines: DR Outstanding Receipts / CR Bank Account
   - Auto-reconciles payment move's receivable line with invoice's receivable line
4. Invoice `paymentState` changes to `IN_PAYMENT`
5. After bank statement reconciliation confirms the payment → `PAID`

### Bank Reconciliation Flow

1. Import bank statement (CSV/OFX/QIF) or create manually
2. System creates `BankStatementLine` records
3. For each line, auto-generates move: DR Bank Account / CR Suspense Account
4. Reconciliation widget runs matching algorithm:
   - Match by payment reference / invoice number in transaction description
   - Match by bank account number → partner
   - Match by partner name
   - Match by amount (within 3% tolerance for fees/rounding)
   - Apply reconciliation model rules
5. User validates match → DR Suspense / CR matched account (Receivable/Payable/Expense)
6. Linked invoices marked as paid

### Double-Entry Validation

- **Invariant:** Every `Move` MUST satisfy `sum(debit) == sum(credit)` across all `JournalItem` lines
- Enforced at application level before posting
- Enforced at database level via PostgreSQL check constraint
- A move cannot transition from DRAFT to POSTED if it doesn't balance

### Credit Note Creation

Three modes (matching Odoo):
1. **Full Refund** — Reverses entire invoice, marks original as reversed
2. **Partial Refund** — Creates credit note for a specific amount
3. **Full Refund and New Draft** — Reverses original + creates new editable draft invoice

### Exchange Rate Handling

- **Dual amounts:** Every `JournalItem` stores `debit`/`credit` (company currency) AND `amountCurrency` (transaction currency)
- **Realized differences:** When payment received at a different rate than invoice, auto-post exchange gain/loss to the Exchange Difference Journal
- **Unrealized differences:** At period end, revalue open receivables/payables at current rate, post adjustment entries
- **Configuration:** Exchange Difference Journal, Gain Account, Loss Account, auto-rate provider (ECB/Open Exchange Rates)

### Tax Computation

1. For each invoice line, apply tax(es) in sequence order
2. If `priceInclude = true`, extract tax from price; if false, add on top
3. If `includeBaseAmount = true` (cascading), add tax amount to base for next tax
4. Group tax lines by `TaxGroup` for display on invoice
5. Create separate `JournalItem` lines with `displayType = TAX` for each tax amount
6. Tax repartition lines determine which accounts receive the tax amounts

### Asset Depreciation

1. **Linear:** `(originalValue - salvageValue) / methodNumber` per period
2. **Declining:** `bookValue × (decliningFactor / methodNumber)` per period
3. **Declining then Linear:** Use declining until linear yields more per period
4. Depreciation board auto-generated on asset confirmation
5. Each line auto-posts: DR Depreciation Expense / CR Accumulated Depreciation
6. **Sell:** Enter sale price → system computes gain/loss, posts disposal entries
7. **Dispose:** Write off remaining book value as loss

### Lock Date Enforcement

| Lock Type | Who is Blocked | Reversible |
|-----------|---------------|------------|
| `periodLockDate` | Non-advisor users | Yes |
| `fiscalyearLockDate` | All users except lock date bypass | Yes |
| `hardLockDate` | ALL users, no exceptions | **No** |

Any attempt to create/edit/delete a `Move` with date ≤ lock date is rejected.

---

## API Routes

```
/api/finance/
│
├── accounts/                    GET (list, filter, search), POST (create)
│   └── [id]/                    GET, PUT, DELETE
│
├── account-groups/              GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── account-tags/                GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── journals/                    GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── moves/                       GET (list with filters: type, state, date range, partner)
│   ├── POST                     Create new move (invoice/bill/entry)
│   ├── [id]/                    GET, PUT, DELETE (draft only)
│   ├── [id]/confirm             POST → draft → posted
│   ├── [id]/cancel              POST → posted → cancelled
│   ├── [id]/reset-draft         POST → cancelled/posted → draft
│   └── [id]/credit-note         POST → creates reversal move
│
├── journal-items/               GET (read-only, filterable)
│
├── payments/                    GET, POST
│   ├── [id]/                    GET, PUT
│   ├── [id]/confirm             POST → draft → in_process
│   ├── [id]/cancel              POST
│   └── register                 POST (register payment from invoice)
│
├── batch-payments/              GET, POST
│   ├── [id]/                    GET, PUT
│   └── [id]/send                POST → draft → sent
│
├── taxes/                       GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── tax-groups/                  GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── fiscal-positions/            GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── payment-terms/               GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── currencies/                  GET, POST
│   ├── [id]/                    GET, PUT
│   └── rates/                   GET, POST, POST /fetch (auto-fetch from provider)
│
├── bank-accounts/               GET, POST
│   └── [id]/                    GET, PUT, DELETE
│
├── bank-statements/             GET, POST
│   ├── [id]/                    GET, PUT
│   ├── import                   POST (CSV/OFX/QIF file upload + parse)
│   └── [id]/lines/              GET
│
├── reconciliation/
│   ├── suggestions              GET (auto-match suggestions for a bank statement line)
│   ├── validate                 POST (confirm reconciliation)
│   ├── undo                     POST (undo a reconciliation)
│   └── models/                  GET, POST, PUT, DELETE
│
├── assets/                      GET, POST
│   ├── [id]/                    GET, PUT
│   ├── [id]/confirm             POST → draft → open (generate depreciation board)
│   ├── [id]/pause               POST → open → paused
│   ├── [id]/resume              POST → paused → open
│   ├── [id]/sell                POST (enter sale price → compute gain/loss)
│   └── [id]/dispose             POST (write off remaining value)
│
├── budgets/                     GET, POST
│   ├── [id]/                    GET, PUT
│   ├── [id]/confirm             POST → draft → confirmed
│   ├── [id]/validate            POST → confirmed → validated
│   └── [id]/done                POST → validated → done
│
├── analytic/
│   ├── plans/                   GET, POST
│   │   └── [id]/                GET, PUT, DELETE
│   └── accounts/                GET, POST
│       └── [id]/                GET, PUT, DELETE
│
├── follow-ups/
│   ├── levels/                  GET, POST
│   │   └── [id]/                GET, PUT, DELETE
│   ├── report                   GET (list of partners with overdue invoices + current level)
│   └── send                     POST (batch send reminders for selected partners)
│
├── lock-dates/                  GET, PUT
│
├── sequences/                   GET, PUT (manage sequence numbers per journal)
│
├── reports/
│   ├── balance-sheet            GET (?date, ?comparison_date)
│   ├── profit-loss              GET (?date_from, ?date_to, ?comparison)
│   ├── cash-flow                GET (?date_from, ?date_to)
│   ├── general-ledger           GET (?date_from, ?date_to, ?accounts, ?partners)
│   ├── trial-balance            GET (?date, ?comparison)
│   ├── aged-receivable          GET (?date, ?partner, ?buckets)
│   ├── aged-payable             GET (?date, ?partner, ?buckets)
│   ├── partner-ledger           GET (?date_from, ?date_to, ?partner)
│   ├── tax-report               GET (?date_from, ?date_to)
│   ├── journal-audit            GET (?date_from, ?date_to, ?journal)
│   └── budget-analysis          GET (?budget_id, ?analytic_account)
│
├── settings/                    GET, PUT (module-level configuration)
│
└── dashboard/                   GET (aggregated KPIs, journal summaries, counts)
```

---

## File Structure

```
src/
├── app/(dashboard)/finance/
│   ├── page.tsx                              # Dashboard — kanban journal cards
│   ├── layout.tsx                            # Finance module sidebar layout
│   │
│   ├── customers/
│   │   ├── invoices/
│   │   │   ├── page.tsx                      # Invoice list view
│   │   │   ├── new/page.tsx                  # Create new invoice
│   │   │   └── [id]/page.tsx                 # Invoice form view (edit/view)
│   │   ├── credit-notes/
│   │   │   ├── page.tsx                      # Credit notes list
│   │   │   └── [id]/page.tsx                 # Credit note form
│   │   ├── payments/
│   │   │   ├── page.tsx                      # Customer payments list
│   │   │   └── [id]/page.tsx                 # Payment form
│   │   ├── batch-payments/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── follow-ups/page.tsx               # Follow-up reports
│   │
│   ├── vendors/
│   │   ├── bills/
│   │   │   ├── page.tsx                      # Bills list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx                 # Bill form
│   │   ├── refunds/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── payments/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── batch-payments/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   │
│   ├── accounting/
│   │   ├── journal-entries/
│   │   │   ├── page.tsx                      # Journal entries list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx                 # Journal entry form
│   │   ├── journal-items/page.tsx            # All journal items (read-only)
│   │   ├── lock-dates/page.tsx               # Lock dates configuration
│   │   ├── reconciliation/page.tsx           # Bank reconciliation widget
│   │   └── bank-statements/
│   │       ├── page.tsx                      # Statements list
│   │       ├── import/page.tsx               # Import wizard
│   │       └── [id]/page.tsx                 # Statement detail + lines
│   │
│   ├── reporting/
│   │   ├── balance-sheet/page.tsx
│   │   ├── profit-loss/page.tsx
│   │   ├── cash-flow/page.tsx
│   │   ├── general-ledger/page.tsx
│   │   ├── trial-balance/page.tsx
│   │   ├── aged-receivable/page.tsx
│   │   ├── aged-payable/page.tsx
│   │   ├── partner-ledger/page.tsx
│   │   ├── tax-report/page.tsx
│   │   ├── journal-audit/page.tsx
│   │   └── budget-analysis/page.tsx
│   │
│   ├── configuration/
│   │   ├── settings/page.tsx                 # Module settings
│   │   ├── chart-of-accounts/
│   │   │   ├── page.tsx                      # CoA list (grouped by type)
│   │   │   └── [id]/page.tsx                 # Account form
│   │   ├── account-groups/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── journals/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── taxes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── tax-groups/page.tsx
│   │   ├── fiscal-positions/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── payment-terms/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── currencies/page.tsx
│   │   ├── follow-up-levels/page.tsx
│   │   ├── reconciliation-models/page.tsx
│   │   ├── analytic-plans/page.tsx
│   │   ├── budgetary-positions/page.tsx
│   │   └── bank-accounts/page.tsx
│   │
│   └── assets/
│       ├── page.tsx                          # Assets list
│       ├── new/page.tsx
│       └── [id]/page.tsx                     # Asset form + depreciation board
│
├── components/finance/
│   ├── StatusBar.tsx                         # Draft → Posted → Paid pipeline
│   ├── FormSheet.tsx                         # Odoo-style form wrapper (header + sheet + chatter)
│   ├── EditableTable.tsx                     # Inline-editable line items grid
│   ├── KanbanCard.tsx                        # Journal dashboard card with sparkline
│   ├── SearchBar.tsx                         # Filters, Group By, Favorites
│   ├── ViewSwitcher.tsx                      # List / Kanban / Pivot / Graph toggle
│   ├── Chatter.tsx                           # Activity log, messages, notes panel
│   ├── MonetaryField.tsx                     # Currency-aware amount input/display
│   ├── Many2OneSelect.tsx                    # Searchable dropdown with "Create" option
│   ├── PivotTable.tsx                        # Expandable pivot with row/column grouping
│   ├── ReportTable.tsx                       # Hierarchical expandable report with drill-down
│   ├── ReconciliationWidget.tsx              # 3-panel bank reconciliation UI
│   ├── PaymentWidget.tsx                     # Outstanding payment matching on invoices
│   ├── CreditNoteWizard.tsx                  # Full/Partial/New Draft refund wizard
│   ├── RegisterPaymentWizard.tsx             # Payment registration modal
│   ├── AssetDepreciationBoard.tsx            # Depreciation schedule table
│   └── FinanceSidebar.tsx                    # Module sidebar navigation
│
├── lib/finance/
│   ├── double-entry.ts                       # Debit/credit validation, move balancing
│   ├── tax-computation.ts                    # Tax calculation engine
│   ├── reconciliation-engine.ts              # Auto-matching algorithm
│   ├── depreciation-engine.ts                # Depreciation schedule computation
│   ├── sequence-generator.ts                 # INV/2026/00001 sequence generation
│   ├── currency-converter.ts                 # Multi-currency conversion utilities
│   ├── exchange-rate-fetcher.ts              # Auto-fetch rates from ECB/Open Exchange Rates
│   ├── report-builder.ts                     # Report computation (BS, P&L, GL, etc.)
│   ├── payment-term-calculator.ts            # Due date computation from payment terms
│   ├── follow-up-engine.ts                   # Follow-up level determination + email sending
│   ├── bank-statement-parser.ts              # CSV/OFX/QIF file parsing
│   └── hash-chain.ts                         # Tamper detection hash computation
│
└── prisma/
    └── schema.prisma                         # All models defined above
```

---

## Shared UI Components

| Component | Purpose | Odoo Equivalent |
|-----------|---------|-----------------|
| `<StatusBar>` | Status pipeline: Draft → Posted → Paid with step indicators | `statusbar` widget |
| `<FormSheet>` | Form wrapper: `<header>` (status + buttons) + `<sheet>` (fields + tabs) + `<chatter>` | Form view architecture |
| `<EditableTable>` | Inline-editable grid for invoice lines with add/remove, sections, notes | `one2many` editable tree |
| `<KanbanCard>` | Dashboard card: title, metrics, sparkline, action buttons | Kanban card template |
| `<SearchBar>` | Search input + Filter chips + Group By + Saved Favorites | `searchbar` + `searchpanel` |
| `<ViewSwitcher>` | Toggle between List / Kanban / Pivot / Graph views | View switcher buttons |
| `<Chatter>` | Timeline of messages, log notes, scheduled activities | `mail.chatter` widget |
| `<MonetaryField>` | Currency symbol + formatted number input, respects position/decimals | `monetary` widget |
| `<Many2OneSelect>` | Searchable dropdown: type-ahead, create & edit, clear button | `many2one` widget |
| `<PivotTable>` | Row/column grouping, measures, expand/collapse, download | Pivot view |
| `<ReportTable>` | Hierarchical rows, expand/collapse groups, drill-down to entries | Accounting reports |
| `<ReconciliationWidget>` | 3-panel: transactions / matches / resulting entry | Bank reconciliation view |
| `<PaymentWidget>` | Shows outstanding payments/credits on invoice, click to apply | `payment` widget |
| `<CreditNoteWizard>` | Dialog: Full Refund / Partial / Full + New Draft | Credit note wizard |
| `<RegisterPaymentWizard>` | Dialog: journal, amount, date, memo pre-filled from invoice | Register payment wizard |
| `<Breadcrumb>` | Navigation trail: Finance > Customers > Invoices > INV/2026/001 | Breadcrumb controller |
| `<Sidebar>` | Collapsible sidebar with menu sections and sub-items | Web client sidebar |

---

## Implementation Phases

| Phase | Scope | Description |
|-------|-------|-------------|
| **Phase 1: Foundation** | Chart of Accounts, Account Groups, Account Tags, Journals, Currencies, Currency Rates, Company, Sequences | Core data structures. No transactions yet — just the scaffolding. |
| **Phase 2: Core Engine** | Move, JournalItem, double-entry validation, sequence generation, hash chain | The heart of the system. All financial documents are Moves. |
| **Phase 3: Daily Operations** | Customer Invoices, Vendor Bills, Credit Notes, Payment Terms, Taxes, Tax Groups, Tax Repartition, Fiscal Positions | The most-used features. Invoice CRUD, tax computation, fiscal position mapping. |
| **Phase 4: Cash Flow** | Payments, Register Payment wizard, payment-invoice reconciliation (Full + Partial Reconcile) | Money in / money out. Auto-reconcile payments with invoices. |
| **Phase 5: Bank Ops** | Bank Accounts, Bank Statements, Bank Statement Lines, statement import (CSV/OFX), Reconciliation Widget, Reconciliation Models | Bank statement import and the 3-panel reconciliation interface. |
| **Phase 6: Reporting** | Balance Sheet, P&L, Cash Flow, General Ledger, Trial Balance, Aged Receivable, Aged Payable, Partner Ledger, Tax Report, Journal Audit | All financial reports with filters, comparison, drill-down, PDF/XLSX export. |
| **Phase 7: Advanced** | Fixed Assets, Depreciation Lines, depreciation engine, Budgets, Budget Lines, Budgetary Positions, Analytic Plans, Analytic Accounts | Asset lifecycle management, budget tracking, cost center analysis. |
| **Phase 8: Completeness** | Batch Payments, Follow-up Levels, Follow-up engine, Lock Dates, Dashboard (kanban cards + KPIs) | Operational completeness — batch processing, payment reminders, period closing. |
| **Phase 9: Globalization** | i18n (EN, FR, DE, TR, IT, ES, RU, AR), RTL support for Arabic, auto exchange rate fetching, all world currencies seed data | Multi-language interface, right-to-left layout, automated currency rate updates. |
