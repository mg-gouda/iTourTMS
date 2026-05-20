/**
 * Demo seed — 2 test records per module across the full system.
 * Excludes Chart of Accounts (already seeded with production data).
 * Idempotent: uses upsert / createMany skipDuplicates everywhere.
 *
 * Run via:
 *   docker run --rm --network itmseg-demo_itmseg_net \
 *     --env-file /opt/itmseg-demo/app/.env \
 *     -v /opt/itmseg-demo/app:/app -w /app node:22-alpine \
 *     sh -c "corepack enable pnpm && pnpm exec tsx prisma/seed-demo.ts"
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Hardcoded live IDs ────────────────────────────────────────────────────────

const CO   = "cmovtevx9000001ox3d2ljx3w";  // Company
const HRG  = "cmpdtn4js00ei01t4cqs5b11n";  // Destination HRG
const HTL  = "cmpdtpenu00ek01t4kovrrr73";  // Hotel BEACH ALBATROS
const MKT  = "cmpdtb0kw00ec01t4m6xjj54u";  // Market JRD/JORDANIAN
const TO   = "cmpdtb8pu00ee01t4iopbuneb";  // TourOperator ALWAKEEL
const RT1  = "cmpdtq4bo00el01t49rsm22sa";  // RoomType STANDARD SINGLE
const RT2  = "cmpdtqofe00et01t4fe6hvz01";  // RoomType STANDARD DOUBLE
const MB   = "cmpdtsfay00ez01t40c9i2ksj";  // MealBasis AI
const PART_TO = "cmpdtb8pp00ed01t430mcx78w"; // Partner ALWAKEEL (B2B customer)
const PART_HTL = "cmpdtpenn00ej01t47hiuz5a7"; // Partner BEACH ALBATROS (supplier)
const U1   = "cmovtew9j000901oxyh0gc2qj";  // User Mohamed Gouda (admin)
const U2   = "cmpdsn9yg008z01mibmrtmg7o";  // User Demo User
const USD  = "cmovt5jaq000d4gnxqil2r9u7";
const EUR  = "cmovt5jau000e4gnxrykvyoqc";
const EGP  = "cmovt5jb0000g4gnxv4g30v6u";
const OPS_FILE1 = "cmpdtfghv00eg01t4j873dhat"; // OpsFile FI-00001

// Finance accounts (8-digit CoA)
const ACC_AR     = "cmpdstosn000y01t47ufbfzfy"; // 11111000 ASSET_RECEIVABLE
const ACC_CASH   = "cmpdstorn000701t4huqaz5fw"; // 11101101 ASSET_CASH
const ACC_BANK   = "cmpdstos3000i01t4uxncs8l4"; // 11103102 ASSET_CASH (bank)
const ACC_INCOME = "cmpdstp7m00cc01t4mj22viae"; // 41000000 INCOME
const ACC_EXP    = "cmpdstp4j009q01t4o4c7l8vc"; // 31000000 EXPENSE
const ACC_SUP    = "cmpdstp0g006u01t4dk5z2ee7"; // 22410000 LIABILITY_CURRENT (suppliers)
const ACC_FIXED  = "cmpdstoww003z01t4zvv3rhuw"; // 12150101 ASSET_FIXED (vehicles)

// Airport IDs
const APT_HRG = "cmovt6ai2028h4gpav48exqi1";
const APT_CAI = "cmovt6aht00u44gpae3d0nzio";

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting demo seed…");

  await seedSequences();
  const journals = await seedFinanceJournals();
  const fyId = await seedFiscalYear(journals);
  await seedFinanceInvoices(journals);
  await seedFinancePayments(journals);
  await seedBankStatement(journals);
  await seedBudget(fyId);
  await seedFixedAsset(journals);
  await seedContracts();
  await seedReservations();
  await seedCrm();
  await seedTourOps();
  await seedTraffic();
  await seedB2cSite();
  await seedB2bCredit();

  console.log("✅ Demo seed complete.");
}

// ─── Sequences ────────────────────────────────────────────────────────────────

async function seedSequences() {
  await prisma.sequence.createMany({
    skipDuplicates: true,
    data: [
      { companyId: CO, code: "traffic_job",    prefix: "TJ",  padding: 5, nextNumber: 1 },
      { companyId: CO, code: "ops_quotation",  prefix: "QT",  padding: 5, nextNumber: 1 },
      { companyId: CO, code: "crm_booking",    prefix: "CB",  padding: 5, nextNumber: 1 },
    ],
  });
  console.log("  ✓ sequences");
}

// ─── Finance — Journals ───────────────────────────────────────────────────────

async function seedFinanceJournals() {
  const saleJ = await prisma.journal.upsert({
    where: { code_companyId: { code: "SALE", companyId: CO } },
    create: {
      companyId: CO, code: "SALE", name: "Customer Invoices",
      type: "SALE", defaultAccountId: ACC_INCOME, sequencePrefix: "INV",
    },
    update: {},
  });

  const purchJ = await prisma.journal.upsert({
    where: { code_companyId: { code: "PURCH", companyId: CO } },
    create: {
      companyId: CO, code: "PURCH", name: "Vendor Bills",
      type: "PURCHASE", defaultAccountId: ACC_EXP, sequencePrefix: "BILL",
    },
    update: {},
  });

  const cashJ = await prisma.journal.upsert({
    where: { code_companyId: { code: "CASH", companyId: CO } },
    create: {
      companyId: CO, code: "CASH", name: "Cash",
      type: "CASH", defaultAccountId: ACC_CASH, sequencePrefix: "CSH",
    },
    update: {},
  });

  const bankJ = await prisma.journal.upsert({
    where: { code_companyId: { code: "BANK", companyId: CO } },
    create: {
      companyId: CO, code: "BANK", name: "Bank",
      type: "BANK", defaultAccountId: ACC_BANK, sequencePrefix: "BNK",
    },
    update: {},
  });

  console.log("  ✓ journals (SALE, PURCH, CASH, BANK)");
  return { saleId: saleJ.id, purchId: purchJ.id, cashId: cashJ.id, bankId: bankJ.id };
}

// ─── Finance — Fiscal Year ────────────────────────────────────────────────────

async function seedFiscalYear(journals: { saleId: string; purchId: string; cashId: string; bankId: string }) {
  const fy = await prisma.fiscalYear.upsert({
    where: { companyId_code: { companyId: CO, code: "FY2026" } },
    create: {
      companyId: CO, name: "Fiscal Year 2026", code: "FY2026",
      dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
      state: "OPEN",
    },
    update: {},
  });

  const months = [
    ["Jan 2026", "P01", 1, "2026-01-01", "2026-01-31"],
    ["Feb 2026", "P02", 2, "2026-02-01", "2026-02-28"],
    ["Mar 2026", "P03", 3, "2026-03-01", "2026-03-31"],
    ["Apr 2026", "P04", 4, "2026-04-01", "2026-04-30"],
    ["May 2026", "P05", 5, "2026-05-01", "2026-05-31"],
    ["Jun 2026", "P06", 6, "2026-06-01", "2026-06-30"],
    ["Jul 2026", "P07", 7, "2026-07-01", "2026-07-31"],
    ["Aug 2026", "P08", 8, "2026-08-01", "2026-08-31"],
    ["Sep 2026", "P09", 9, "2026-09-01", "2026-09-30"],
    ["Oct 2026", "P10", 10, "2026-10-01", "2026-10-31"],
    ["Nov 2026", "P11", 11, "2026-11-01", "2026-11-30"],
    ["Dec 2026", "P12", 12, "2026-12-01", "2026-12-31"],
  ] as const;

  for (const [name, code, num, from, to] of months) {
    await prisma.fiscalPeriod.upsert({
      where: { fiscalYearId_code: { fiscalYearId: fy.id, code } },
      create: {
        fiscalYearId: fy.id, name, code, number: num,
        dateFrom: new Date(from), dateTo: new Date(to), state: "OPEN",
      },
      update: {},
    });
  }

  console.log("  ✓ fiscal year 2026 + 12 periods");
  return fy.id;
}

// ─── Finance — Customer Invoices & Vendor Bills ───────────────────────────────

async function seedFinanceInvoices(journals: { saleId: string; purchId: string; cashId: string; bankId: string }) {
  // Customer invoice 1 — ALWAKEEL tour operator
  const inv1 = await prisma.move.upsert({
    where: { id: "demo-inv-001" },
    create: {
      id: "demo-inv-001",
      companyId: CO, moveType: "OUT_INVOICE", state: "DRAFT",
      paymentState: "NOT_PAID", date: new Date("2026-05-01"),
      journalId: journals.saleId, partnerId: PART_TO,
      currencyId: USD, companyCurrencyId: EGP,
      invoiceDate: new Date("2026-05-01"),
      invoiceDateDue: new Date("2026-05-31"),
      amountUntaxed: 2500, amountTax: 0, amountTotal: 2500, amountResidual: 2500,
      narration: "Demo invoice — Group package May 2026",
    },
    update: {},
  });

  await prisma.moveLineItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-inv-001-l1",
        moveId: inv1.id, accountId: ACC_INCOME, partnerId: PART_TO,
        name: "Package — Hurghada 5N/6D (10 pax)", displayType: "PRODUCT",
        debit: 0, credit: 2500, balance: -2500, amountCurrency: 2500,
        quantity: 10, priceUnit: 250, sequence: 10,
      },
      {
        id: "demo-inv-001-l2",
        moveId: inv1.id, accountId: ACC_AR, partnerId: PART_TO,
        name: "Receivable", displayType: "PRODUCT",
        debit: 2500, credit: 0, balance: 2500, amountCurrency: 2500,
        quantity: 1, priceUnit: 2500, sequence: 20,
      },
    ],
  });

  // Customer invoice 2 — individual
  const inv2 = await prisma.move.upsert({
    where: { id: "demo-inv-002" },
    create: {
      id: "demo-inv-002",
      companyId: CO, moveType: "OUT_INVOICE", state: "DRAFT",
      paymentState: "NOT_PAID", date: new Date("2026-05-10"),
      journalId: journals.saleId,
      currencyId: USD, companyCurrencyId: EGP,
      invoiceDate: new Date("2026-05-10"),
      invoiceDateDue: new Date("2026-06-10"),
      amountUntaxed: 1200, amountTax: 0, amountTotal: 1200, amountResidual: 1200,
      narration: "Demo invoice — FIT Booking May 2026",
    },
    update: {},
  });

  await prisma.moveLineItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-inv-002-l1",
        moveId: inv2.id, accountId: ACC_INCOME,
        name: "Nile Cruise 4N/5D (2 pax)", displayType: "PRODUCT",
        debit: 0, credit: 1200, balance: -1200, amountCurrency: 1200,
        quantity: 2, priceUnit: 600, sequence: 10,
      },
      {
        id: "demo-inv-002-l2",
        moveId: inv2.id, accountId: ACC_AR,
        name: "Receivable", displayType: "PRODUCT",
        debit: 1200, credit: 0, balance: 1200, amountCurrency: 1200,
        quantity: 1, priceUnit: 1200, sequence: 20,
      },
    ],
  });

  // Vendor bill 1 — BEACH ALBATROS hotel
  const bill1 = await prisma.move.upsert({
    where: { id: "demo-bill-001" },
    create: {
      id: "demo-bill-001",
      companyId: CO, moveType: "IN_INVOICE", state: "DRAFT",
      paymentState: "NOT_PAID", date: new Date("2026-05-01"),
      journalId: journals.purchId, partnerId: PART_HTL,
      currencyId: USD, companyCurrencyId: EGP,
      invoiceDate: new Date("2026-05-01"),
      invoiceDateDue: new Date("2026-05-15"),
      amountUntaxed: 1800, amountTax: 0, amountTotal: 1800, amountResidual: 1800,
      narration: "Demo bill — BEACH ALBATROS hotel accommodation",
    },
    update: {},
  });

  await prisma.moveLineItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-bill-001-l1",
        moveId: bill1.id, accountId: ACC_EXP, partnerId: PART_HTL,
        name: "BEACH ALBATROS — 10 rooms × 3 nights", displayType: "PRODUCT",
        debit: 1800, credit: 0, balance: 1800, amountCurrency: 1800,
        quantity: 30, priceUnit: 60, sequence: 10,
      },
      {
        id: "demo-bill-001-l2",
        moveId: bill1.id, accountId: ACC_SUP, partnerId: PART_HTL,
        name: "Payable", displayType: "PRODUCT",
        debit: 0, credit: 1800, balance: -1800, amountCurrency: 1800,
        quantity: 1, priceUnit: 1800, sequence: 20,
      },
    ],
  });

  // Vendor bill 2 — transport
  const bill2 = await prisma.move.upsert({
    where: { id: "demo-bill-002" },
    create: {
      id: "demo-bill-002",
      companyId: CO, moveType: "IN_INVOICE", state: "DRAFT",
      paymentState: "NOT_PAID", date: new Date("2026-05-10"),
      journalId: journals.purchId,
      currencyId: EGP, companyCurrencyId: EGP,
      invoiceDate: new Date("2026-05-10"),
      invoiceDateDue: new Date("2026-05-20"),
      amountUntaxed: 4500, amountTax: 0, amountTotal: 4500, amountResidual: 4500,
      narration: "Demo bill — transport services May 2026",
    },
    update: {},
  });

  await prisma.moveLineItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-bill-002-l1",
        moveId: bill2.id, accountId: ACC_EXP,
        name: "Bus rental — HRG airport transfers", displayType: "PRODUCT",
        debit: 4500, credit: 0, balance: 4500, amountCurrency: 4500,
        quantity: 5, priceUnit: 900, sequence: 10,
      },
      {
        id: "demo-bill-002-l2",
        moveId: bill2.id, accountId: ACC_SUP,
        name: "Payable", displayType: "PRODUCT",
        debit: 0, credit: 4500, balance: -4500, amountCurrency: 4500,
        quantity: 1, priceUnit: 4500, sequence: 20,
      },
    ],
  });

  console.log("  ✓ 2 customer invoices + 2 vendor bills (DRAFT)");
}

// ─── Finance — Payments ───────────────────────────────────────────────────────

async function seedFinancePayments(journals: { saleId: string; purchId: string; cashId: string; bankId: string }) {
  await prisma.payment.upsert({
    where: { id: "demo-pay-001" },
    create: {
      id: "demo-pay-001",
      companyId: CO, paymentType: "INBOUND",
      partnerId: PART_TO, amount: 1000,
      currencyId: USD, date: new Date("2026-05-05"),
      journalId: journals.cashId, ref: "PMT-DEMO-001",
      state: "DRAFT",
    },
    update: {},
  });

  await prisma.payment.upsert({
    where: { id: "demo-pay-002" },
    create: {
      id: "demo-pay-002",
      companyId: CO, paymentType: "OUTBOUND",
      partnerId: PART_HTL, amount: 900,
      currencyId: USD, date: new Date("2026-05-08"),
      journalId: journals.bankId, ref: "PMT-DEMO-002",
      state: "DRAFT",
    },
    update: {},
  });

  console.log("  ✓ 2 payments (DRAFT)");
}

// ─── Finance — Bank Statement ─────────────────────────────────────────────────

async function seedBankStatement(journals: { saleId: string; purchId: string; cashId: string; bankId: string }) {
  const stmt = await prisma.bankStatement.upsert({
    where: { id: "demo-bs-001" },
    create: {
      id: "demo-bs-001",
      companyId: CO, journalId: journals.bankId,
      name: "Bank Statement — May 2026",
      date: new Date("2026-05-31"),
      dateFrom: new Date("2026-05-01"), dateTo: new Date("2026-05-31"),
      balanceStart: 50000, balanceEnd: 49100, balanceEndReal: 49100,
      state: "DRAFT",
    },
    update: {},
  });

  await prisma.bankStatementLine.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-bs-001-l1",
        statementId: stmt.id, sequence: 10,
        date: new Date("2026-05-05"), name: "Payment received — ALWAKEEL",
        partnerId: PART_TO, amount: 1000,
      },
      {
        id: "demo-bs-001-l2",
        statementId: stmt.id, sequence: 20,
        date: new Date("2026-05-08"), name: "Supplier payment — BEACH ALBATROS",
        partnerId: PART_HTL, amount: -900,
      },
    ],
  });

  console.log("  ✓ bank statement (DRAFT) with 2 lines");
}

// ─── Finance — Budget ─────────────────────────────────────────────────────────

async function seedBudget(fyId: string) {
  const budget = await prisma.budget.upsert({
    where: { name_companyId: { name: "Demo Budget 2026", companyId: CO } },
    create: {
      companyId: CO, name: "Demo Budget 2026",
      fiscalYearId: fyId, state: "DRAFT",
    },
    update: {},
  });

  await prisma.budgetLine.createMany({
    skipDuplicates: true,
    data: [
      {
        budgetId: budget.id, accountId: ACC_INCOME,
        amount01: 50000, amount02: 50000, amount03: 60000,
        amount04: 70000, amount05: 75000, amount06: 80000,
        amount07: 85000, amount08: 90000, amount09: 80000,
        amount10: 70000, amount11: 60000, amount12: 50000,
        annualAmount: 820000,
      },
      {
        budgetId: budget.id, accountId: ACC_EXP,
        amount01: 35000, amount02: 35000, amount03: 42000,
        amount04: 49000, amount05: 52500, amount06: 56000,
        amount07: 59500, amount08: 63000, amount09: 56000,
        amount10: 49000, amount11: 42000, amount12: 35000,
        annualAmount: 574000,
      },
    ],
  });

  console.log("  ✓ budget 2026 (DRAFT) with income + expense lines");
}

// ─── Finance — Fixed Asset ────────────────────────────────────────────────────

async function seedFixedAsset(journals: { saleId: string; purchId: string; cashId: string; bankId: string }) {
  await prisma.accountAsset.upsert({
    where: { id: "demo-asset-001" },
    create: {
      id: "demo-asset-001",
      companyId: CO, name: "Company Vehicle — Toyota Coaster",
      code: "ASSET-001", accountId: ACC_FIXED,
      journalId: journals.bankId,
      state: "DRAFT",
      method: "STRAIGHT_LINE",
      originalValue: 45000,
      salvageValue: 5000,
      usefulLifeYears: 5,
      acquisitionDate: new Date("2026-01-15"),
      netBookValue: 45000,
      accumulatedDepreciation: 0,
      notes: "Demo fixed asset — 45-seat coach",
    },
    update: {},
  });

  await prisma.accountAsset.upsert({
    where: { id: "demo-asset-002" },
    create: {
      id: "demo-asset-002",
      companyId: CO, name: "Office Equipment — Laptops (5 units)",
      code: "ASSET-002", accountId: "cmpdstows003w01t4hlw4zjos", // 12130000 ASSET_FIXED
      journalId: journals.cashId,
      state: "DRAFT",
      method: "STRAIGHT_LINE",
      originalValue: 5000,
      salvageValue: 500,
      usefulLifeYears: 3,
      acquisitionDate: new Date("2026-03-01"),
      netBookValue: 5000,
      accumulatedDepreciation: 0,
      notes: "Demo fixed asset — 5 laptops",
    },
    update: {},
  });

  console.log("  ✓ 2 fixed assets (DRAFT)");
}

// ─── Contracting ──────────────────────────────────────────────────────────────

async function seedContracts() {
  const ctr1 = await prisma.contract.upsert({
    where: { companyId_code: { companyId: CO, code: "CTR-DEMO-001" } },
    create: {
      companyId: CO, name: "BEACH ALBATROS — Summer 2026",
      code: "CTR-DEMO-001", status: "DRAFT",
      hotelId: HTL,
      validFrom: new Date("2026-06-01"), validTo: new Date("2026-09-30"),
      travelFrom: new Date("2026-06-01"), travelTo: new Date("2026-09-30"),
      rateBasis: "PER_PERSON", baseCurrencyId: USD,
      baseRoomTypeId: RT2, baseMealBasisId: MB,
      minimumStay: 2,
      terms: "Rates include all-inclusive package. Minimum 2 nights stay required.",
      createdById: U1,
    },
    update: {},
  });

  // Add room types and meal basis to contract 1
  await prisma.contractRoomType.createMany({
    skipDuplicates: true,
    data: [
      { contractId: ctr1.id, roomTypeId: RT2, isBase: true, sortOrder: 0 },
      { contractId: ctr1.id, roomTypeId: RT1, isBase: false, sortOrder: 1 },
    ],
  });
  await prisma.contractMealBasis.createMany({
    skipDuplicates: true,
    data: [{ contractId: ctr1.id, mealBasisId: MB, isBase: true }],
  });

  // Season for contract 1
  const s1 = await prisma.contractSeason.upsert({
    where: { id: "demo-ctr1-s1" },
    create: {
      id: "demo-ctr1-s1",
      contractId: ctr1.id,
      dateFrom: new Date("2026-06-01"), dateTo: new Date("2026-09-30"),
      sortOrder: 0, releaseDays: 14,
    },
    update: {},
  });

  // Base rate for contract 1 season
  await prisma.contractBaseRate.upsert({
    where: { contractId_seasonId: { contractId: ctr1.id, seasonId: s1.id } },
    create: {
      contractId: ctr1.id, seasonId: s1.id,
      rate: 85, singleRate: 95, doubleRate: 80,
    },
    update: {},
  });

  // Market assignment
  await prisma.contractMarket.createMany({
    skipDuplicates: true,
    data: [{ contractId: ctr1.id, marketId: MKT }],
  });

  // Tour operator assignment
  await prisma.contractTourOperator.createMany({
    skipDuplicates: true,
    data: [{ contractId: ctr1.id, tourOperatorId: TO }],
  });

  // Contract 2 — Winter/Low season
  const ctr2 = await prisma.contract.upsert({
    where: { companyId_code: { companyId: CO, code: "CTR-DEMO-002" } },
    create: {
      companyId: CO, name: "BEACH ALBATROS — Winter 2026",
      code: "CTR-DEMO-002", status: "DRAFT",
      hotelId: HTL,
      validFrom: new Date("2026-10-01"), validTo: new Date("2026-12-31"),
      travelFrom: new Date("2026-10-01"), travelTo: new Date("2026-12-31"),
      rateBasis: "PER_PERSON", baseCurrencyId: USD,
      baseRoomTypeId: RT2, baseMealBasisId: MB,
      minimumStay: 3,
      terms: "Winter low-season rates. Minimum 3 nights.",
      createdById: U1,
    },
    update: {},
  });

  await prisma.contractRoomType.createMany({
    skipDuplicates: true,
    data: [
      { contractId: ctr2.id, roomTypeId: RT2, isBase: true, sortOrder: 0 },
      { contractId: ctr2.id, roomTypeId: RT1, isBase: false, sortOrder: 1 },
    ],
  });
  await prisma.contractMealBasis.createMany({
    skipDuplicates: true,
    data: [{ contractId: ctr2.id, mealBasisId: MB, isBase: true }],
  });

  const s2 = await prisma.contractSeason.upsert({
    where: { id: "demo-ctr2-s1" },
    create: {
      id: "demo-ctr2-s1",
      contractId: ctr2.id,
      dateFrom: new Date("2026-10-01"), dateTo: new Date("2026-12-31"),
      sortOrder: 0, releaseDays: 7,
    },
    update: {},
  });

  await prisma.contractBaseRate.upsert({
    where: { contractId_seasonId: { contractId: ctr2.id, seasonId: s2.id } },
    create: {
      contractId: ctr2.id, seasonId: s2.id,
      rate: 65, singleRate: 75, doubleRate: 60,
    },
    update: {},
  });

  await prisma.contractMarket.createMany({
    skipDuplicates: true,
    data: [{ contractId: ctr2.id, marketId: MKT }],
  });

  await prisma.contractTourOperator.createMany({
    skipDuplicates: true,
    data: [{ contractId: ctr2.id, tourOperatorId: TO }],
  });

  console.log("  ✓ 2 contracts for BEACH ALBATROS (DRAFT, with seasons & rates)");
}

// ─── Reservations ─────────────────────────────────────────────────────────────

async function seedReservations() {
  // Guests
  const g1 = await prisma.guest.upsert({
    where: { id: "demo-guest-001" },
    create: {
      id: "demo-guest-001",
      companyId: CO, firstName: "Ahmed", lastName: "Hassan",
      email: "ahmed.hassan@demo.test", phone: "+201001234567",
      nationality: "Egyptian", passportNo: "A12345678",
      passportExpiry: new Date("2028-05-01"),
      dateOfBirth: new Date("1985-03-15"), gender: "MALE", isVip: false,
    },
    update: {},
  });

  const g2 = await prisma.guest.upsert({
    where: { id: "demo-guest-002" },
    create: {
      id: "demo-guest-002",
      companyId: CO, firstName: "Sara", lastName: "Johnson",
      email: "sara.johnson@demo.test", phone: "+447911123456",
      nationality: "British", passportNo: "GB9876543",
      passportExpiry: new Date("2029-11-20"),
      dateOfBirth: new Date("1990-07-22"), gender: "FEMALE", isVip: true,
    },
    update: {},
  });

  // Bookings
  const bk1 = await prisma.booking.upsert({
    where: { companyId_code: { companyId: CO, code: "BK-DEMO-001" } },
    create: {
      companyId: CO, code: "BK-DEMO-001", status: "NEW_BOOKING",
      source: "DIRECT", hotelId: HTL, tourOperatorId: TO,
      marketId: MKT,
      checkIn: new Date("2026-07-01"), checkOut: new Date("2026-07-08"), nights: 7,
      currencyId: USD, rateBasis: "PER_PERSON",
      buyingTotal: 560, sellingTotal: 700,
      adults: 2, children: 0, infants: 0, noOfRooms: 1,
      leadGuestName: "Ahmed Hassan",
      leadGuestEmail: "ahmed.hassan@demo.test",
      leadGuestPhone: "+201001234567",
      paymentStatus: "UNPAID", totalPaid: 0, balanceDue: 700,
      createdById: U1,
      bookingDate: new Date("2026-05-15"),
    },
    update: {},
  });

  const room1 = await prisma.bookingRoom.upsert({
    where: { id: "demo-bk1-room1" },
    create: {
      id: "demo-bk1-room1",
      bookingId: bk1.id, roomTypeId: RT2, mealBasisId: MB,
      roomIndex: 1, adults: 2,
      buyingRatePerNight: 80, buyingTotal: 560,
      sellingRatePerNight: 100, sellingTotal: 700,
    },
    update: {},
  });

  await prisma.bookingGuest.upsert({
    where: { id: "demo-bk1-bg1" },
    create: {
      id: "demo-bk1-bg1",
      bookingId: bk1.id, bookingRoomId: room1.id,
      guestId: g1.id, guestType: "LEAD", isLeadGuest: true,
    },
    update: {},
  });

  const bk2 = await prisma.booking.upsert({
    where: { companyId_code: { companyId: CO, code: "BK-DEMO-002" } },
    create: {
      companyId: CO, code: "BK-DEMO-002", status: "NEW_BOOKING",
      source: "TOUR_OPERATOR", hotelId: HTL, tourOperatorId: TO,
      marketId: MKT,
      checkIn: new Date("2026-08-15"), checkOut: new Date("2026-08-20"), nights: 5,
      currencyId: USD, rateBasis: "PER_PERSON",
      buyingTotal: 325, sellingTotal: 400,
      adults: 1, children: 0, infants: 0, noOfRooms: 1,
      leadGuestName: "Sara Johnson",
      leadGuestEmail: "sara.johnson@demo.test",
      leadGuestPhone: "+447911123456",
      paymentStatus: "UNPAID", totalPaid: 0, balanceDue: 400,
      createdById: U1,
      bookingDate: new Date("2026-05-15"),
    },
    update: {},
  });

  const room2 = await prisma.bookingRoom.upsert({
    where: { id: "demo-bk2-room1" },
    create: {
      id: "demo-bk2-room1",
      bookingId: bk2.id, roomTypeId: RT1, mealBasisId: MB,
      roomIndex: 1, adults: 1,
      buyingRatePerNight: 65, buyingTotal: 325,
      sellingRatePerNight: 80, sellingTotal: 400,
    },
    update: {},
  });

  await prisma.bookingGuest.upsert({
    where: { id: "demo-bk2-bg1" },
    create: {
      id: "demo-bk2-bg1",
      bookingId: bk2.id, bookingRoomId: room2.id,
      guestId: g2.id, guestType: "LEAD", isLeadGuest: true,
    },
    update: {},
  });

  // Vouchers
  await prisma.voucher.upsert({
    where: { companyId_code: { companyId: CO, code: "VCH-DEMO-001" } },
    create: {
      companyId: CO, code: "VCH-DEMO-001",
      bookingId: bk1.id, status: "ISSUED",
      createdById: U1,
    },
    update: {},
  });

  await prisma.voucher.upsert({
    where: { companyId_code: { companyId: CO, code: "VCH-DEMO-002" } },
    create: {
      companyId: CO, code: "VCH-DEMO-002",
      bookingId: bk2.id, status: "ISSUED",
      createdById: U1,
    },
    update: {},
  });

  console.log("  ✓ 2 guests, 2 bookings (with rooms & guests), 2 vouchers");
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

async function seedCrm() {
  // CRM Suppliers
  const sup1 = await prisma.crmSupplier.upsert({
    where: { id: "demo-crm-sup-001" },
    create: {
      id: "demo-crm-sup-001",
      companyId: CO, name: "Desert Safari Co.",
      contactName: "Khalid Al-Rashid", email: "khalid@desertsafari.demo",
      phone: "+201009876543", type: "transport",
    },
    update: {},
  });

  const sup2 = await prisma.crmSupplier.upsert({
    where: { id: "demo-crm-sup-002" },
    create: {
      id: "demo-crm-sup-002",
      companyId: CO, name: "Blue Horizon Diving Center",
      contactName: "Youssef Nour", email: "info@bluehorizon.demo",
      phone: "+201111234567", type: "boat",
    },
    update: {},
  });

  // CRM Customers
  await prisma.crmCustomer.upsert({
    where: { id: "demo-crm-cust-001" },
    create: {
      id: "demo-crm-cust-001",
      companyId: CO, firstName: "Michael", lastName: "Brown",
      email: "michael.brown@demo.test", phone: "+12025551234",
      nationality: "American", loyaltyTier: "GOLD",
    },
    update: {},
  });

  await prisma.crmCustomer.upsert({
    where: { id: "demo-crm-cust-002" },
    create: {
      id: "demo-crm-cust-002",
      companyId: CO, firstName: "Anna", lastName: "Müller",
      email: "anna.mueller@demo.test", phone: "+4915112345678",
      nationality: "German", loyaltyTier: "SILVER",
    },
    update: {},
  });

  // CRM Leads
  await prisma.crmLead.upsert({
    where: { companyId_code: { companyId: CO, code: "LD-DEMO-001" } },
    create: {
      companyId: CO, code: "LD-DEMO-001",
      firstName: "John", lastName: "Smith",
      email: "john.smith@demo.test", phone: "+447700900123",
      source: "WEBSITE", status: "NEW",
      assignedToId: U1, createdById: U1,
      notes: "Interested in Red Sea snorkeling package for 4 pax, August 2026",
    },
    update: {},
  });

  await prisma.crmLead.upsert({
    where: { companyId_code: { companyId: CO, code: "LD-DEMO-002" } },
    create: {
      companyId: CO, code: "LD-DEMO-002",
      firstName: "Maria", lastName: "Gonzalez",
      email: "maria.g@demo.test", phone: "+34612345678",
      source: "REFERRAL", status: "CONTACTED",
      assignedToId: U1, createdById: U1,
      notes: "Honeymoon package enquiry — Sharm/Hurghada, September 2026",
    },
    update: {},
  });

  // CRM Excursion 1 — Desert Safari
  const exc1 = await prisma.crmExcursion.upsert({
    where: { companyId_code: { companyId: CO, code: "EXC-DEMO-001" } },
    create: {
      companyId: CO, code: "EXC-DEMO-001",
      name: "Desert Safari & Bedouin Dinner",
      productType: "ACTIVITY", category: "DESERT_SAFARI",
      tripMode: "SHARED", duration: "Half Day (5 hrs)",
      description: "Exciting desert safari by quad bike followed by traditional Bedouin dinner under the stars.",
      inclusions: "Hotel pickup & drop-off, Quad bike ride, Bedouin tent dinner, Live entertainment",
      exclusions: "Personal travel insurance, Optional camel ride",
      minPax: 2, maxPax: 40, active: true,
    },
    update: {},
  });

  // Age groups for excursion 1
  const ag1a = await prisma.crmExcursionAgeGroup.upsert({
    where: { id: "demo-exc1-ag-adult" },
    create: {
      id: "demo-exc1-ag-adult",
      excursionId: exc1.id, label: "ADULT", minAge: 12, maxAge: 99, sortOrder: 0,
    },
    update: {},
  });
  const ag1c = await prisma.crmExcursionAgeGroup.upsert({
    where: { id: "demo-exc1-ag-child" },
    create: {
      id: "demo-exc1-ag-child",
      excursionId: exc1.id, label: "CHILD", minAge: 4, maxAge: 11, sortOrder: 1,
    },
    update: {},
  });

  // Cost sheet for excursion 1
  const cs1 = await prisma.crmCostSheet.upsert({
    where: { id: "demo-exc1-cs1" },
    create: {
      id: "demo-exc1-cs1",
      excursionId: exc1.id, name: "Low Season 2026",
      seasonType: "LOW", tripMode: "SHARED",
      validFrom: new Date("2026-01-01"), validTo: new Date("2026-05-31"),
      calcBasis: "PER_PERSON", referencePax: 20,
      baseCurrency: "USD", totalCost: 35,
    },
    update: {},
  });

  await prisma.crmCostComponent.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-exc1-cs1-c1",
        costSheetId: cs1.id, costType: "GUIDE", pricingType: "BULK",
        description: "English-speaking guide", supplierId: sup1.id,
        qty: 1, unitCost: 200, currency: "EGP", exchangeRate: 0.02, sortOrder: 0,
      },
      {
        id: "demo-exc1-cs1-c2",
        costSheetId: cs1.id, costType: "MEALS", pricingType: "PER_PAX",
        description: "Bedouin dinner per person",
        qty: 1, unitCost: 15, currency: "USD", exchangeRate: 1, sortOrder: 1,
      },
    ],
  });

  // Selling prices for excursion 1
  await prisma.crmSellingPrice.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-exc1-cs1-sp-adult",
        costSheetId: cs1.id, ageGroupId: ag1a.id,
        label: "Adult", markupType: "PERCENTAGE",
        markupValue: 43, costPerPerson: 35, sellingPrice: 50, currency: "USD",
      },
      {
        id: "demo-exc1-cs1-sp-child",
        costSheetId: cs1.id, ageGroupId: ag1c.id,
        label: "Child (4–11)", markupType: "PERCENTAGE",
        markupValue: 43, costPerPerson: 17.5, sellingPrice: 25, currency: "USD",
      },
    ],
  });

  // CRM Excursion 2 — Snorkeling
  const exc2 = await prisma.crmExcursion.upsert({
    where: { companyId_code: { companyId: CO, code: "EXC-DEMO-002" } },
    create: {
      companyId: CO, code: "EXC-DEMO-002",
      name: "Red Sea Snorkeling Trip",
      productType: "ACTIVITY", category: "WATER_SPORTS",
      tripMode: "SHARED", duration: "Full Day (8 hrs)",
      description: "Explore the stunning coral reefs of the Red Sea with an expert marine guide.",
      inclusions: "Hotel pickup, Boat trip, Snorkeling equipment, Light lunch, Soft drinks",
      exclusions: "Underwater photography, Wetsuit rental",
      minPax: 4, maxPax: 20, active: true,
    },
    update: {},
  });

  const ag2a = await prisma.crmExcursionAgeGroup.upsert({
    where: { id: "demo-exc2-ag-adult" },
    create: {
      id: "demo-exc2-ag-adult",
      excursionId: exc2.id, label: "ADULT", minAge: 10, maxAge: 99, sortOrder: 0,
    },
    update: {},
  });

  const cs2 = await prisma.crmCostSheet.upsert({
    where: { id: "demo-exc2-cs1" },
    create: {
      id: "demo-exc2-cs1",
      excursionId: exc2.id, name: "Standard 2026",
      seasonType: "HIGH", tripMode: "SHARED",
      validFrom: new Date("2026-01-01"), validTo: new Date("2026-12-31"),
      calcBasis: "PER_PERSON", referencePax: 12,
      baseCurrency: "USD", totalCost: 45,
    },
    update: {},
  });

  await prisma.crmCostComponent.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-exc2-cs1-c1",
        costSheetId: cs2.id, costType: "DIVING_SNORKELING", pricingType: "BULK",
        description: "Boat rental", supplierId: sup2.id,
        qty: 1, unitCost: 350, currency: "USD", exchangeRate: 1, sortOrder: 0,
      },
      {
        id: "demo-exc2-cs1-c2",
        costSheetId: cs2.id, costType: "MEALS", pricingType: "PER_PAX",
        description: "Lunch per person",
        qty: 1, unitCost: 10, currency: "USD", exchangeRate: 1, sortOrder: 1,
      },
    ],
  });

  await prisma.crmSellingPrice.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-exc2-cs1-sp-adult",
        costSheetId: cs2.id, ageGroupId: ag2a.id,
        label: "Adult", markupType: "PERCENTAGE",
        markupValue: 33, costPerPerson: 45, sellingPrice: 60, currency: "USD",
      },
    ],
  });

  // CRM Bookings
  await prisma.crmBooking.upsert({
    where: { companyId_code: { companyId: CO, code: "CB-DEMO-001" } },
    create: {
      companyId: CO, code: "CB-DEMO-001",
      customerId: "demo-crm-cust-001",
      status: "DRAFT", travelDate: new Date("2026-07-10"),
      paxAdults: 2, paxChildren: 1, paxInfants: 0,
      totalCost: 87.5, totalSelling: 125, currency: "USD",
      notes: "Family desert safari — 2 adults + 1 child",
      bookedById: U1,
    },
    update: {},
  });

  const crmBk1 = await prisma.crmBooking.findUnique({
    where: { companyId_code: { companyId: CO, code: "CB-DEMO-001" } },
    select: { id: true },
  });

  if (crmBk1) {
    await prisma.crmBookingItem.createMany({
      skipDuplicates: true,
      data: [
        {
          id: "demo-crmbi-001-1",
          bookingId: crmBk1.id, excursionId: exc1.id, costSheetId: cs1.id,
          label: "Desert Safari — Adult × 2", quantity: 2,
          unitCost: 35, unitPrice: 50, totalCost: 70, totalPrice: 100, sortOrder: 0,
        },
        {
          id: "demo-crmbi-001-2",
          bookingId: crmBk1.id, excursionId: exc1.id, costSheetId: cs1.id,
          label: "Desert Safari — Child × 1", quantity: 1,
          unitCost: 17.5, unitPrice: 25, totalCost: 17.5, totalPrice: 25, sortOrder: 1,
        },
      ],
    });
  }

  await prisma.crmBooking.upsert({
    where: { companyId_code: { companyId: CO, code: "CB-DEMO-002" } },
    create: {
      companyId: CO, code: "CB-DEMO-002",
      customerId: "demo-crm-cust-002",
      status: "CONFIRMED", travelDate: new Date("2026-08-20"),
      paxAdults: 4, paxChildren: 0, paxInfants: 0,
      totalCost: 180, totalSelling: 240, currency: "USD",
      notes: "Group snorkeling — 4 adults",
      bookedById: U1,
    },
    update: {},
  });

  const crmBk2 = await prisma.crmBooking.findUnique({
    where: { companyId_code: { companyId: CO, code: "CB-DEMO-002" } },
    select: { id: true },
  });

  if (crmBk2) {
    await prisma.crmBookingItem.createMany({
      skipDuplicates: true,
      data: [
        {
          id: "demo-crmbi-002-1",
          bookingId: crmBk2.id, excursionId: exc2.id, costSheetId: cs2.id,
          label: "Red Sea Snorkeling — Adult × 4", quantity: 4,
          unitCost: 45, unitPrice: 60, totalCost: 180, totalPrice: 240, sortOrder: 0,
        },
      ],
    });
  }

  console.log("  ✓ 2 CRM suppliers, 2 customers, 2 leads, 2 excursions, 2 CRM bookings");
}

// ─── Tour Ops ─────────────────────────────────────────────────────────────────

async function seedTourOps() {
  // Transport destination HRG
  const tDest = await prisma.opsTransportDestination.upsert({
    where: { companyId_code: { companyId: CO, code: "HRG" } },
    create: {
      companyId: CO, code: "HRG", nameEn: "Hurghada", nameAr: "الغردقة", sortOrder: 1,
    },
    update: {},
  });

  // Transport routes
  const route1 = await prisma.opsTransportRoute.upsert({
    where: { id: "demo-route-hrg-apt" },
    create: {
      id: "demo-route-hrg-apt",
      companyId: CO, destinationId: tDest.id,
      nameEn: "HRG Airport ↔ City Center", nameAr: "مطار الغردقة ↔ وسط المدينة",
      sortOrder: 0,
    },
    update: {},
  });

  const season1 = await prisma.opsTransportRateSeason.upsert({
    where: { id: "demo-route-hrg-apt-s1" },
    create: {
      id: "demo-route-hrg-apt-s1",
      companyId: CO, routeId: route1.id,
      name: "All Year 2026",
      dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
    },
    update: {},
  });

  await prisma.opsTransportRate.createMany({
    skipDuplicates: true,
    data: [
      { companyId: CO, seasonId: season1.id, vehicleType: "SEDAN",   rentEGP: 600,  tipEGP: 50, repAllowEGP: 0 },
      { companyId: CO, seasonId: season1.id, vehicleType: "VAN_11",  rentEGP: 1200, tipEGP: 100, repAllowEGP: 0 },
      { companyId: CO, seasonId: season1.id, vehicleType: "VAN_16",  rentEGP: 1600, tipEGP: 150, repAllowEGP: 0 },
      { companyId: CO, seasonId: season1.id, vehicleType: "BUS_25",  rentEGP: 2500, tipEGP: 200, repAllowEGP: 100 },
      { companyId: CO, seasonId: season1.id, vehicleType: "BUS_45",  rentEGP: 4000, tipEGP: 300, repAllowEGP: 200 },
    ],
  });

  const route2 = await prisma.opsTransportRoute.upsert({
    where: { id: "demo-route-hrg-sah" },
    create: {
      id: "demo-route-hrg-sah",
      companyId: CO, destinationId: tDest.id,
      nameEn: "HRG Airport ↔ Sahl Hasheesh", nameAr: "مطار الغردقة ↔ سهل حشيش",
      sortOrder: 1,
    },
    update: {},
  });

  const season2 = await prisma.opsTransportRateSeason.upsert({
    where: { id: "demo-route-hrg-sah-s1" },
    create: {
      id: "demo-route-hrg-sah-s1",
      companyId: CO, routeId: route2.id,
      name: "All Year 2026",
      dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
    },
    update: {},
  });

  await prisma.opsTransportRate.createMany({
    skipDuplicates: true,
    data: [
      { companyId: CO, seasonId: season2.id, vehicleType: "SEDAN",  rentEGP: 800,  tipEGP: 50,  repAllowEGP: 0 },
      { companyId: CO, seasonId: season2.id, vehicleType: "VAN_11", rentEGP: 1500, tipEGP: 100, repAllowEGP: 0 },
      { companyId: CO, seasonId: season2.id, vehicleType: "BUS_25", rentEGP: 3000, tipEGP: 200, repAllowEGP: 100 },
    ],
  });

  // Sightseeing entries
  const sight1 = await prisma.opsSightseeingEntry.upsert({
    where: { id: "demo-sight-001" },
    create: {
      id: "demo-sight-001",
      companyId: CO, destinationCode: "HRG",
      nameEn: "Giftun Island Snorkeling", nameAr: "رحلة جزيرة جفتون",
      sortOrder: 0,
    },
    update: {},
  });

  await prisma.opsSightseeingRateSeason.upsert({
    where: { id: "demo-sight-001-s1" },
    create: {
      id: "demo-sight-001-s1",
      companyId: CO, entryId: sight1.id,
      name: "2026 Season", dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
      priceEGP: 450,
    },
    update: {},
  });

  const sight2 = await prisma.opsSightseeingEntry.upsert({
    where: { id: "demo-sight-002" },
    create: {
      id: "demo-sight-002",
      companyId: CO, destinationCode: "HRG",
      nameEn: "Luxor Day Tour from Hurghada", nameAr: "رحلة الأقصر من الغردقة",
      sortOrder: 1,
    },
    update: {},
  });

  await prisma.opsSightseeingRateSeason.upsert({
    where: { id: "demo-sight-002-s1" },
    create: {
      id: "demo-sight-002-s1",
      companyId: CO, entryId: sight2.id,
      name: "2026 Season", dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
      priceEGP: 1200,
    },
    update: {},
  });

  // Guidance rates
  const guide1 = await prisma.opsGuidanceRate.upsert({
    where: { companyId_destinationCode_guideType: { companyId: CO, destinationCode: "HRG", guideType: "LOCAL_GUIDE" } },
    create: {
      companyId: CO, destinationCode: "HRG", guideType: "LOCAL_GUIDE", currency: "EGP",
    },
    update: {},
  });

  await prisma.opsGuidanceRateSeason.upsert({
    where: { id: "demo-guide-hrg-local-s1" },
    create: {
      id: "demo-guide-hrg-local-s1",
      companyId: CO, guidanceId: guide1.id,
      name: "2026", dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
      pricePerDay: 800,
    },
    update: {},
  });

  const guide2 = await prisma.opsGuidanceRate.upsert({
    where: { companyId_destinationCode_guideType: { companyId: CO, destinationCode: "HRG", guideType: "TOUR_MANAGER" } },
    create: {
      companyId: CO, destinationCode: "HRG", guideType: "TOUR_MANAGER", currency: "EGP",
    },
    update: {},
  });

  await prisma.opsGuidanceRateSeason.upsert({
    where: { id: "demo-guide-hrg-tm-s1" },
    create: {
      id: "demo-guide-hrg-tm-s1",
      companyId: CO, guidanceId: guide2.id,
      name: "2026", dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
      pricePerDay: 1200,
    },
    update: {},
  });

  // Meal rates
  const meal1 = await prisma.opsMealRate.upsert({
    where: { id: "demo-meal-hrg-breakfast" },
    create: {
      id: "demo-meal-hrg-breakfast",
      companyId: CO, nameEn: "Breakfast — HRG Hotels",
      destinationCode: "HRG", mealType: "BREAKFAST", currency: "EGP",
    },
    update: {},
  });

  await prisma.opsMealRateSeason.upsert({
    where: { id: "demo-meal-hrg-breakfast-s1" },
    create: {
      id: "demo-meal-hrg-breakfast-s1",
      companyId: CO, mealRateId: meal1.id,
      name: "2026", dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
      pricePerPax: 120,
    },
    update: {},
  });

  const meal2 = await prisma.opsMealRate.upsert({
    where: { id: "demo-meal-hrg-dinner" },
    create: {
      id: "demo-meal-hrg-dinner",
      companyId: CO, nameEn: "Dinner — HRG Restaurants",
      destinationCode: "HRG", mealType: "DINNER", currency: "EGP",
    },
    update: {},
  });

  await prisma.opsMealRateSeason.upsert({
    where: { id: "demo-meal-hrg-dinner-s1" },
    create: {
      id: "demo-meal-hrg-dinner-s1",
      companyId: CO, mealRateId: meal2.id,
      name: "2026", dateFrom: new Date("2026-01-01"), dateTo: new Date("2026-12-31"),
      pricePerPax: 200,
    },
    update: {},
  });

  // OpsFile 2 (FI-00002) with package + quotation
  const file2 = await prisma.opsFile.upsert({
    where: { companyId_code: { companyId: CO, code: "FI-00002" } },
    create: {
      companyId: CO, code: "FI-00002",
      clientType: "TOUR_OPERATOR", tourOperatorId: TO,
      guestName: "Demo Group B", guestEmail: "groupb@demo.test",
      travelFrom: new Date("2026-09-01"), travelTo: new Date("2026-09-08"),
      adults: 20, children: 5, infants: 0,
      status: "QUOTED",
      notes: "Demo Ops File — ALWAKEEL group September 2026",
      createdById: U1,
    },
    update: {},
  });

  const pkg2 = await prisma.opsPackage.upsert({
    where: { id: "demo-ops-pkg-002" },
    create: {
      id: "demo-ops-pkg-002",
      companyId: CO, name: "Hurghada 7N Package",
      fileId: file2.id, isTemplate: false,
      baseCurrency: "USD", totalCost: 4500,
    },
    update: {},
  });

  await prisma.opsPackageComponent.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-ops-pkg-002-c1",
        packageId: pkg2.id, type: "ACCOMMODATION",
        description: "BEACH ALBATROS — STANDARD DOUBLE AI × 10 rooms × 7 nights",
        serviceDate: new Date("2026-09-01"), qty: 70,
        unitCost: 55, currency: "USD", exchangeRate: 1,
        totalCost: 3850, pricingBasis: "BULK",
        markupType: "PERCENTAGE", markupValue: 15, sellingPrice: 4427.5,
        sortOrder: 0,
      },
      {
        id: "demo-ops-pkg-002-c2",
        packageId: pkg2.id, type: "TRANSFER",
        description: "Airport transfers HRG — 2 × BUS_45",
        serviceDate: new Date("2026-09-01"), qty: 2,
        unitCost: 200, currency: "USD", exchangeRate: 1,
        totalCost: 400, pricingBasis: "BULK",
        markupType: "PERCENTAGE", markupValue: 10, sellingPrice: 440,
        sortOrder: 1,
      },
      {
        id: "demo-ops-pkg-002-c3",
        packageId: pkg2.id, type: "EXCURSION",
        description: "Desert Safari × 20 pax",
        serviceDate: new Date("2026-09-04"), qty: 20,
        unitCost: 35, currency: "USD", exchangeRate: 1,
        totalCost: 700, pricingBasis: "PER_PERSON",
        markupType: "PERCENTAGE", markupValue: 43, sellingPrice: 1000,
        sortOrder: 2,
      },
    ],
  });

  const quot2 = await prisma.opsQuotation.upsert({
    where: { companyId_code: { companyId: CO, code: "QT-DEMO-001" } },
    create: {
      companyId: CO, code: "QT-DEMO-001",
      fileId: file2.id, packageId: pkg2.id,
      status: "DRAFT", clientType: "TOUR_OPERATOR",
      validUntil: new Date("2026-06-30"),
      totalCost: 4950, totalSelling: 5867.5,
      margin: 917.5, marginPct: 15.64, isFinal: false,
      notes: "Draft quotation for review by operations team.",
    },
    update: {},
  });

  // Flight tickets
  await prisma.opsFlightTicket.upsert({
    where: { companyId_code: { companyId: CO, code: "TKT-DEMO-001" } },
    create: {
      companyId: CO, code: "TKT-DEMO-001",
      opsFileId: OPS_FILE1,
      status: "DRAFT", flightType: "RETURN",
      clientName: "Demo Group A", issueDate: new Date("2026-05-20"),
      origin: "CAI", destination: "HRG",
      departureDate: new Date("2026-07-01"), returnDate: new Date("2026-07-08"),
      airline: "EgyptAir", flightNumber: "MS-601", returnFlightNumber: "MS-602",
      ticketNumber: "074-1234567890",
      transactionType: "ISSUE",
      pax: 20, buyingRate: 80, sellingRate: 95,
      commissionType: "PERCENTAGE", commissionValue: 5, commissionAmount: 80,
      totalCost: 1600, totalRevenue: 1900, profit: 300, marginPct: 0.1579,
      currencyId: USD, createdById: U1,
    },
    update: {},
  });

  await prisma.opsFlightTicket.upsert({
    where: { companyId_code: { companyId: CO, code: "TKT-DEMO-002" } },
    create: {
      companyId: CO, code: "TKT-DEMO-002",
      opsFileId: file2.id,
      status: "DRAFT", flightType: "RETURN",
      clientName: "Demo Group B", issueDate: new Date("2026-05-20"),
      origin: "CAI", destination: "HRG",
      departureDate: new Date("2026-09-01"), returnDate: new Date("2026-09-08"),
      airline: "Air Arabia", flightNumber: "E5-701", returnFlightNumber: "E5-702",
      transactionType: "ISSUE",
      pax: 25, buyingRate: 75, sellingRate: 90,
      commissionType: "PERCENTAGE", commissionValue: 5, commissionAmount: 93.75,
      totalCost: 1875, totalRevenue: 2250, profit: 375, marginPct: 0.1667,
      currencyId: USD, createdById: U1,
    },
    update: {},
  });

  console.log("  ✓ tour ops: transport dest/routes/rates, 2 sightseeing, 2 guidance, 2 meal rates, OpsFile2+pkg+quotation, 2 flight tickets");
}

// ─── Traffic ──────────────────────────────────────────────────────────────────

async function seedTraffic() {
  // City for HRG destination
  const city = await prisma.city.upsert({
    where: { companyId_destinationId_code: { companyId: CO, destinationId: HRG, code: "HRG" } },
    create: {
      companyId: CO, destinationId: HRG,
      name: "Hurghada", code: "HRG", active: true,
    },
    update: {},
  });

  // Traffic zones
  const zone1 = await prisma.ttZone.upsert({
    where: { companyId_cityId_code: { companyId: CO, cityId: city.id, code: "ZONE-A" } },
    create: {
      companyId: CO, cityId: city.id,
      name: "City Center & Hotels", code: "ZONE-A",
      description: "HRG city center including Sheraton Rd, Sekala, Dahar",
      sortOrder: 0,
    },
    update: {},
  });

  const zone2 = await prisma.ttZone.upsert({
    where: { companyId_cityId_code: { companyId: CO, cityId: city.id, code: "ZONE-B" } },
    create: {
      companyId: CO, cityId: city.id,
      name: "Sahl Hasheesh & El Gouna", code: "ZONE-B",
      description: "South HRG resorts including Sahl Hasheesh and El Gouna",
      sortOrder: 1,
    },
    update: {},
  });

  // Vehicle types
  const vtype1 = await prisma.ttVehicleType.upsert({
    where: { companyId_code: { companyId: CO, code: "SEDAN" } },
    create: {
      companyId: CO, name: "Sedan (4 pax)", code: "SEDAN",
      capacity: 4, luggageCapacity: 4, isActive: true, sortOrder: 0,
    },
    update: {},
  });

  const vtype2 = await prisma.ttVehicleType.upsert({
    where: { companyId_code: { companyId: CO, code: "BUS-25" } },
    create: {
      companyId: CO, name: "Bus 25 Seater", code: "BUS-25",
      capacity: 25, luggageCapacity: 25, isActive: true, sortOrder: 2,
    },
    update: {},
  });

  // Vehicles
  await prisma.ttVehicle.upsert({
    where: { companyId_plateNumber: { companyId: CO, plateNumber: "HRG-001-DEMO" } },
    create: {
      companyId: CO, vehicleTypeId: vtype1.id,
      plateNumber: "HRG-001-DEMO", make: "Toyota", model: "Camry",
      year: 2024, color: "White", ownership: "OWNED", status: "ACTIVE",
    },
    update: {},
  });

  await prisma.ttVehicle.upsert({
    where: { companyId_plateNumber: { companyId: CO, plateNumber: "HRG-002-DEMO" } },
    create: {
      companyId: CO, vehicleTypeId: vtype2.id,
      plateNumber: "HRG-002-DEMO", make: "Yutong", model: "ZK6729D",
      year: 2023, color: "White", ownership: "OWNED", status: "ACTIVE",
    },
    update: {},
  });

  // Price items
  await prisma.ttPriceItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "demo-price-sedan-za-zb",
        companyId: CO, vehicleTypeId: vtype1.id,
        fromZoneId: zone1.id, toZoneId: zone2.id,
        priceType: "PER_VEHICLE", price: 250, currencyId: EGP,
        serviceType: "ARR", description: "Sedan: Zone A → Zone B (one-way)",
      },
      {
        id: "demo-price-bus25-za-zb",
        companyId: CO, vehicleTypeId: vtype2.id,
        fromZoneId: zone1.id, toZoneId: zone2.id,
        priceType: "PER_VEHICLE", price: 1400, currencyId: EGP,
        serviceType: "ARR", description: "Bus 25: Zone A → Zone B (one-way)",
      },
    ],
  });

  // Traffic jobs
  await prisma.ttTrafficJob.upsert({
    where: { companyId_code: { companyId: CO, code: "TJ-DEMO-001" } },
    create: {
      companyId: CO, code: "TJ-DEMO-001",
      serviceType: "ARR", status: "PENDING",
      vehicleTypeId: vtype2.id,
      serviceDate: new Date("2026-07-01"),
      pickupTime: "14:30",
      pickupAirportId: APT_HRG,
      dropoffHotelId: HTL,
      zoneId: zone1.id,
      paxCount: 20, leadPassenger: "Ahmed Hassan",
      passengerPhone: "+201001234567",
      currencyId: USD, price: 150, cost: 100,
      createdById: U1,
    },
    update: {},
  });

  await prisma.ttTrafficJob.upsert({
    where: { companyId_code: { companyId: CO, code: "TJ-DEMO-002" } },
    create: {
      companyId: CO, code: "TJ-DEMO-002",
      serviceType: "DEP", status: "PENDING",
      vehicleTypeId: vtype2.id,
      serviceDate: new Date("2026-07-08"),
      pickupTime: "09:00",
      pickupHotelId: HTL,
      dropoffAirportId: APT_HRG,
      zoneId: zone1.id,
      paxCount: 20, leadPassenger: "Ahmed Hassan",
      passengerPhone: "+201001234567",
      currencyId: USD, price: 150, cost: 100,
      createdById: U1,
    },
    update: {},
  });

  console.log("  ✓ traffic: city, 2 zones, 2 vehicle types, 2 vehicles, 2 price items, 2 traffic jobs");
}

// ─── B2C Site ─────────────────────────────────────────────────────────────────

async function seedB2cSite() {
  // Branding config (upsert by companyId unique)
  await prisma.publicSiteBranding.upsert({
    where: { companyId: CO },
    create: {
      companyId: CO,
      themePreset: "MODERN_BOLD",
      primaryColor: "#1d4ed8",
      secondaryColor: "#f59e0b",
      accentColor: "#0ea5e9",
      headingFont: "Poppins", bodyFont: "Inter",
      headerStyle: "MEGA_MENU", buttonStyle: "ROUNDED",
      heroStyle: "SLIDER", footerColumns: 4,
      siteTitle: "iTour Travel & Tourism",
      siteDescription: "Your gateway to Egypt's finest destinations — Red Sea, Nile Valley & Beyond.",
      enableBlog: true, enableFaq: true, enableReviews: true,
      enableNewsletter: true, enableB2bPortal: true,
      yearsInBusiness: 15, happyGuests: 50000,
      contactEmail: "info@demo.itmseg.cloud",
      contactPhone: "+20 2 1234 5678",
      contactAddress: "123 Tourism Street, Cairo, Egypt",
      facebook: "https://facebook.com/demo", instagram: "https://instagram.com/demo",
    },
    update: {},
  });

  // Hero slides
  await prisma.heroSlide.upsert({
    where: { id: "demo-hero-001" },
    create: {
      id: "demo-hero-001",
      companyId: CO,
      imageUrl: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=1920",
      title: "Discover the Red Sea",
      subtitle: "Pristine beaches, vibrant coral reefs, and world-class resorts await you in Hurghada",
      ctaText: "Explore Hurghada", ctaLink: "/destinations/hurghada",
      sortOrder: 0, active: true,
    },
    update: {},
  });

  await prisma.heroSlide.upsert({
    where: { id: "demo-hero-002" },
    create: {
      id: "demo-hero-002",
      companyId: CO,
      imageUrl: "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1920",
      title: "Explore Ancient Egypt",
      subtitle: "Cruise the Nile and uncover the wonders of Luxor, Aswan, and the Valley of the Kings",
      ctaText: "Discover the Nile", ctaLink: "/destinations/nile-cruise",
      sortOrder: 1, active: true,
    },
    update: {},
  });

  // Blog posts
  await prisma.blogPost.upsert({
    where: { companyId_slug: { companyId: CO, slug: "top-10-things-hurghada" } },
    create: {
      companyId: CO,
      title: "Top 10 Things to Do in Hurghada",
      slug: "top-10-things-hurghada",
      content: "Hurghada is Egypt's premier Red Sea resort town, offering a perfect blend of beach relaxation and adventure activities. From snorkeling the vibrant coral reefs to exploring the historic city center, there's something for everyone.\n\n1. **Snorkeling & Diving** — The Red Sea boasts some of the world's most spectacular coral reefs.\n2. **Desert Safari** — Ride quads across the Eastern Desert at sunset.\n3. **Boat trips** — Explore Giftun Island National Park.\n4. **Parasailing** — Get a bird's eye view of the coastline.\n5. **Dolphin watching** — Spot dolphins in their natural habitat.\n6. **Kitesurfing** — Perfect winds make HRG a kite paradise.\n7. **El Dahar old town** — Explore authentic Egyptian bazaars.\n8. **Submarine tour** — Discover underwater life without getting wet.\n9. **Bedouin village** — Experience traditional desert culture.\n10. **Glass-bottom boat** — Watch marine life from above.",
      excerpt: "Discover the top activities and attractions that make Hurghada one of Egypt's most popular tourist destinations.",
      status: "PUBLISHED", publishedAt: new Date("2026-03-01"),
      tags: ["hurghada", "red-sea", "travel-tips", "egypt"],
    },
    update: {},
  });

  await prisma.blogPost.upsert({
    where: { companyId_slug: { companyId: CO, slug: "nile-cruise-guide" } },
    create: {
      companyId: CO,
      title: "The Ultimate Nile Cruise Guide: Luxor to Aswan",
      slug: "nile-cruise-guide",
      content: "A Nile cruise from Luxor to Aswan (or vice versa) is one of the world's greatest travel experiences. Over 4-7 nights, you'll float between ancient temples, vibrant markets, and timeless landscapes.\n\n**What to expect:**\nMost cruises include visits to Karnak Temple, Luxor Temple, Valley of the Kings, Edfu Temple, Kom Ombo Temple, and Philae Temple in Aswan.\n\n**Best time to go:**\nOctober to April offers the most comfortable temperatures (15-25°C). Summer months can reach 45°C.\n\n**Cabin categories:**\nFrom budget 3-star ships to ultra-luxury 5-star vessels — all include meals, guided tours, and evening entertainment.\n\n**Booking tips:**\n- Book 2-3 months in advance for peak season\n- Check if all temple entries are included\n- Confirm guide quality — a good Egyptologist makes all the difference",
      excerpt: "Everything you need to know about planning the perfect Nile cruise — from choosing a ship to packing essentials.",
      status: "PUBLISHED", publishedAt: new Date("2026-04-15"),
      tags: ["nile-cruise", "luxor", "aswan", "egypt", "travel-guide"],
    },
    update: {},
  });

  // FAQs
  await prisma.faq.upsert({
    where: { id: "demo-faq-001" },
    create: {
      id: "demo-faq-001",
      companyId: CO,
      question: "What is the best time to visit Egypt?",
      answer: "The best time to visit Egypt is October to April when temperatures are mild (15-25°C). Peak tourist season is December to February. Summer (June-August) is extremely hot (up to 45°C) but beach destinations like Hurghada are still popular. Ramadan can affect some services but also offers unique cultural experiences.",
      category: "Travel Planning",
      sortOrder: 0, active: true,
    },
    update: {},
  });

  await prisma.faq.upsert({
    where: { id: "demo-faq-002" },
    create: {
      id: "demo-faq-002",
      companyId: CO,
      question: "Do I need a visa to visit Egypt?",
      answer: "Most nationalities can obtain a visa on arrival at Egyptian airports for USD 25, or apply for an e-Visa online before travel. Citizens of some Arab countries may enter visa-free. Always check the latest requirements for your nationality on the official Egyptian e-Visa portal before traveling.",
      category: "Visas & Entry",
      sortOrder: 1, active: true,
    },
    update: {},
  });

  // Testimonials
  await prisma.testimonial.upsert({
    where: { id: "demo-test-001" },
    create: {
      id: "demo-test-001",
      companyId: CO,
      guestName: "Michael & Laura Brown",
      rating: 5,
      quote: "Absolutely incredible experience! Our 10-day Egypt tour was perfectly organized from start to finish. The guides were knowledgeable and friendly, the hotels were excellent, and every detail was taken care of. We'll definitely book again for our next adventure!",
      hotelId: HTL, featured: true, active: true,
    },
    update: {},
  });

  await prisma.testimonial.upsert({
    where: { id: "demo-test-002" },
    create: {
      id: "demo-test-002",
      companyId: CO,
      guestName: "Anna Müller",
      rating: 5,
      quote: "The Nile cruise was the highlight of my life. Sailing past ancient temples at sunrise, learning about thousands of years of history — it was magical. The crew was attentive, the food was delicious, and the service was five-star throughout.",
      featured: true, active: true,
    },
    update: {},
  });

  // Public pages
  await prisma.publicPage.upsert({
    where: { companyId_slug: { companyId: CO, slug: "about-us" } },
    create: {
      companyId: CO, title: "About Us", slug: "about-us",
      content: "## Welcome to iTour Travel & Tourism\n\nFounded in 2009, we are Egypt's leading specialist in inbound tourism. With over 15 years of experience, we've helped more than 50,000 happy travelers discover the magic of Egypt.\n\n### Our Mission\nTo deliver exceptional travel experiences that create lasting memories, while supporting local communities and sustainable tourism.\n\n### Why Choose Us\n- **Expert local knowledge** — Our team of certified Egyptologists and travel specialists\n- **24/7 support** — We're always available when you need us\n- **Customized itineraries** — Every trip tailored to your interests and budget\n- **IATA accredited** — Full financial protection for your booking\n- **Sustainable tourism** — Committed to responsible travel practices",
      excerpt: "Learn about our 15-year journey as Egypt's leading inbound tourism specialist.",
      status: "PUBLISHED", sortOrder: 0,
    },
    update: {},
  });

  await prisma.publicPage.upsert({
    where: { companyId_slug: { companyId: CO, slug: "terms-and-conditions" } },
    create: {
      companyId: CO, title: "Terms & Conditions", slug: "terms-and-conditions",
      content: "## Booking Terms & Conditions\n\n### 1. Booking Confirmation\nAll bookings are subject to availability and confirmed upon receipt of deposit payment. A booking confirmation email will be sent within 24 hours.\n\n### 2. Payment Terms\nA 30% deposit is required to confirm the booking. The balance is due 30 days before the travel date.\n\n### 3. Cancellation Policy\n- More than 30 days: Full refund minus processing fee\n- 15-30 days: 50% refund\n- Less than 15 days: No refund\n\n### 4. Travel Insurance\nWe strongly recommend comprehensive travel insurance covering cancellation, medical expenses, and personal liability.\n\n### 5. Liability\nOur liability is limited to the total cost of your booking. We are not responsible for circumstances beyond our control.",
      excerpt: "Please read our terms and conditions carefully before making a booking.",
      status: "PUBLISHED", sortOrder: 99,
    },
    update: {},
  });

  console.log("  ✓ B2C site: branding, 2 hero slides, 2 blog posts, 2 FAQs, 2 testimonials, 2 pages");
}

// ─── B2B Portal ───────────────────────────────────────────────────────────────

async function seedB2bCredit() {
  await prisma.b2bCreditTransaction.upsert({
    where: { id: "demo-b2b-tx-001" },
    create: {
      id: "demo-b2b-tx-001",
      companyId: CO, tourOperatorId: TO,
      type: "PAYMENT_RECEIVED",
      amount: 5000, runningBalance: 5000,
      reference: "WIRE-20260501-WKT",
      notes: "Initial credit top-up — ALWAKEEL May 2026 campaign",
      createdById: U1,
    },
    update: {},
  });

  await prisma.b2bCreditTransaction.upsert({
    where: { id: "demo-b2b-tx-002" },
    create: {
      id: "demo-b2b-tx-002",
      companyId: CO, tourOperatorId: TO,
      type: "ADJUSTMENT",
      amount: 1000, runningBalance: 6000,
      reference: "ADJ-DEMO-001",
      notes: "Credit adjustment — bonus for early booking commitment Q3 2026",
      createdById: U1,
    },
    update: {},
  });

  console.log("  ✓ B2B portal: 2 credit transactions for ALWAKEEL");
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
