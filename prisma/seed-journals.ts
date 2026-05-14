/**
 * One-off script to seed the additional journals for an existing company.
 * Run with: npx tsx prisma/seed-journals.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all companies that have the finance module installed
  const installed = await prisma.installedModule.findMany({
    where: { name: "finance", isInstalled: true },
    select: { companyId: true },
  });

  if (installed.length === 0) {
    console.log("No companies with finance module installed. Exiting.");
    return;
  }

  for (const { companyId } of installed) {
    console.log(`\nSeeding journals for companyId: ${companyId}`);

    // Build account map for this company
    const accounts = await prisma.finAccount.findMany({
      where: { companyId, deprecated: false },
      select: { id: true, code: true },
    });
    const accountMap: Record<string, string> = {};
    for (const a of accounts) accountMap[a.code] = a.id;

    const journals: Array<{
      code: string;
      name: string;
      type: string;
      sequencePrefix?: string;
      defaultAccountId?: string;
      suspenseAccountId?: string;
      profitAccountId?: string;
      lossAccountId?: string;
    }> = [
      // ── Existing journals — update with sequence prefix ──
      { code: "SAJ",    name: "Sales Journal",           type: "SALE",     sequencePrefix: "SAJ",    defaultAccountId: accountMap["1100"] },
      { code: "EXJ",    name: "Purchase Journal",         type: "PURCHASE", sequencePrefix: "EXJ",    defaultAccountId: accountMap["2100"] },
      { code: "BNK1",   name: "Bank",                     type: "BANK",     sequencePrefix: "BNK1",   defaultAccountId: accountMap["1200"] },
      { code: "CSH1",   name: "Cash",                     type: "CASH",     sequencePrefix: "CSH1",   defaultAccountId: accountMap["1210"] },
      { code: "MISC",   name: "Miscellaneous Operations", type: "GENERAL",  sequencePrefix: "MISC",   defaultAccountId: accountMap["6900"] },
      { code: "EXCH",   name: "Exchange Difference",      type: "GENERAL",  sequencePrefix: "EXCH",   defaultAccountId: accountMap["4920"], profitAccountId: accountMap["4920"], lossAccountId: accountMap["6800"] },
      // ── New journals ──
      // Cash Basis Taxes — transitional tax recognition entries; default + suspense = VAT Payable (2400)
      { code: "CABA",   name: "Cash Basis Taxes",         type: "GENERAL",  sequencePrefix: "CABA",   defaultAccountId: accountMap["2400"],  suspenseAccountId: accountMap["2400"] },
      // Inventory Valuation — stock movement entries; default = COGS (5000), suspense = Inventory (1400)
      { code: "STVAL",  name: "Inventory Valuation",      type: "GENERAL",  sequencePrefix: "STVAL",  defaultAccountId: accountMap["5000"],  suspenseAccountId: accountMap["1400"] },
      // Tax Adjustments — manual VAT corrections; default = VAT Payable (2400), suspense = VAT Receivable (2410)
      { code: "TAXAD",  name: "Tax Adjustments",          type: "GENERAL",  sequencePrefix: "TAXAD",  defaultAccountId: accountMap["2400"],  suspenseAccountId: accountMap["2410"] },
      // Tax Returns — VAT refund entries; default = VAT Receivable (2410), suspense = VAT Payable (2400)
      { code: "TAXR",   name: "Tax Returns",              type: "GENERAL",  sequencePrefix: "TAXR",   defaultAccountId: accountMap["2410"],  suspenseAccountId: accountMap["2400"] },
      // Salaries — payroll journal entries; default = Salaries & Wages (6000), suspense = Accrued Expenses (2300)
      { code: "PAYSL",  name: "Salaries",                 type: "GENERAL",  sequencePrefix: "PAYSL",  defaultAccountId: accountMap["6000"],  suspenseAccountId: accountMap["2300"] },
      // IFRS 16 — lease accounting; default = Long-Term Loans/Lease Liability (2700), suspense = Non-Current Assets/ROU Asset (1800)
      { code: "IFRS16", name: "IFRS 16",                  type: "GENERAL",  sequencePrefix: "IFRS16", defaultAccountId: accountMap["2700"],  suspenseAccountId: accountMap["1800"] },
    ];

    let created = 0;
    let updated = 0;

    for (const j of journals) {
      const existing = await prisma.journal.findFirst({ where: { code: j.code, companyId } });

      if (existing) {
        await prisma.journal.update({
          where: { id: existing.id },
          data: {
            name: j.name,
            sequencePrefix: j.sequencePrefix ?? null,
            defaultAccountId: j.defaultAccountId ?? null,
            ...(j.suspenseAccountId !== undefined && { suspenseAccountId: j.suspenseAccountId }),
            ...(j.profitAccountId   !== undefined && { profitAccountId:   j.profitAccountId   }),
            ...(j.lossAccountId     !== undefined && { lossAccountId:     j.lossAccountId     }),
          },
        });
        updated++;
      } else {
        await prisma.journal.create({
          data: { ...j, companyId } as any,
        });
        created++;
      }

      const status = existing ? "updated" : "created";
      console.log(`  ${status === "created" ? "+" : "~"} ${j.code.padEnd(8)} ${j.name}`);
    }

    console.log(`  → ${created} created, ${updated} updated`);
  }
}

main()
  .then(() => { console.log("\nDone."); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
