import type { PrismaClient } from "@prisma/client";

/**
 * Numbering for every document code the app asks generateSequenceNumber for.
 * Setup seeds these, and a company that predates one gets it on first use —
 * several finance codes were never seeded, so posting simply failed.
 */
export const SEQUENCE_DEFAULTS: Record<string, { prefix: string; padding?: number }> = {
  out_invoice: { prefix: "INV" },
  out_refund: { prefix: "RINV" },
  in_invoice: { prefix: "BILL" },
  in_refund: { prefix: "RBILL" },
  journal_entry: { prefix: "MISC" },
  payment: { prefix: "PAY" },
  inbound_payment: { prefix: "RCPT" },
  bank_statement: { prefix: "BNK" },
  batch_payment: { prefix: "BATCH" },
  booking: { prefix: "BK", padding: 6 },
  guest_booking: { prefix: "GB" },
  hotel_credit: { prefix: "HCN" },
  voucher: { prefix: "VCH" },
  traffic_job: { prefix: "TJ" },
  contract: { prefix: "CTR" },
};

/** Creates the company sequence for `code` from SEQUENCE_DEFAULTS if it is missing. */
async function ensureSequence(db: Pick<PrismaClient, "sequence">, companyId: string, code: string) {
  const d = SEQUENCE_DEFAULTS[code];
  if (!d) return;
  await db.sequence.upsert({
    where: { companyId_code: { companyId, code } },
    update: {},
    create: { companyId, code, prefix: d.prefix, padding: d.padding ?? 5 },
  });
}

/**
 * Generate the next sequence number for a given code.
 * Handles year-based reset and padding.
 *
 * Supports two format types:
 * - "standard" (default): e.g. "INV/2026/00001"
 * - "company_serial": e.g. "IT-100001" (company abbreviation + serial, no year reset)
 */
export async function generateSequenceNumber(
  db: PrismaClient,
  companyId: string,
  baseCode: string,
  branchId?: string | null,
  /** The document's own date: an entry dated 2025 is numbered in 2025's run. */
  date: Date = new Date(),
): Promise<string> {
  await ensureSequence(db, companyId, baseCode);
  const code = branchId ? await branchSequenceCode(db, companyId, baseCode, branchId) : baseCode;
  const now = new Date();

  // Use a transaction for atomic increment
  const sequence = await db.sequence.findUnique({
    where: { companyId_code: { companyId, code } },
  });

  if (!sequence) {
    throw new Error(`Sequence not found for code: ${code}`);
  }

  if (sequence.formatType === "company_serial") {
    // Company serial format: {initials}-{paddedNumber}
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { abbreviation: true, name: true },
    });

    // Use abbreviation, or derive initials from company name
    const abbr =
      company?.abbreviation ??
      (company?.name
        ? company.name
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : sequence.prefix);
    const nextNumber = Math.max(sequence.nextNumber, sequence.startNumber);
    const paddedNumber = String(nextNumber).padStart(sequence.padding, "0");

    // Increment
    await db.sequence.update({
      where: { companyId_code: { companyId, code } },
      data: {
        nextNumber: nextNumber + 1,
        lastReset: now,
      },
    });

    return `${abbr}${sequence.separator}${paddedNumber}`;
  }

  // Standard format: PREFIX-YEAR-00001, counted within the document's period.
  // Each period keeps its own counter row (`code#2025`, `code#2025-03`), taken
  // in one atomic increment. A single resetting counter numbered by today's
  // date could hand a backdated document a number already used in its year.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const period =
    sequence.resetPolicy === "monthly" ? `${year}-${month}` : sequence.resetPolicy === "yearly" ? `${year}` : null;

  let counter: { nextNumber: number };
  if (period) {
    // The period the old single counter was last used in carries its count
    // on, so numbering in progress continues unbroken; other periods start fresh.
    const last = sequence.lastReset;
    const sameAsLast =
      last.getFullYear() === year && (sequence.resetPolicy === "yearly" || last.getMonth() === date.getMonth());
    const seed = Math.max(sameAsLast ? sequence.nextNumber : sequence.startNumber, sequence.startNumber);
    counter = await db.sequence.upsert({
      where: { companyId_code: { companyId, code: `${code}#${period}` } },
      update: { nextNumber: { increment: 1 } },
      create: {
        companyId,
        code: `${code}#${period}`,
        prefix: sequence.prefix,
        separator: sequence.separator,
        padding: sequence.padding,
        startNumber: sequence.startNumber,
        resetPolicy: "never",
        nextNumber: seed + 1,
      },
    });
  } else {
    counter = await db.sequence.update({
      where: { companyId_code: { companyId, code } },
      data: { nextNumber: { increment: 1 }, lastReset: now },
    });
  }

  const paddedNumber = String(counter.nextNumber - 1).padStart(sequence.padding, "0");
  return `${sequence.prefix}${sequence.separator}${year}${sequence.separator}${paddedNumber}`;
}

/**
 * Each branch numbers its own documents: FT-HRG-2026-00001. Head office keeps
 * the company sequence, so existing numbering carries on unbroken. A branch's
 * sequence is cloned from the company one the first time it is needed, kept
 * under `code@BRANCH` so the (companyId, code) key still holds.
 */
async function branchSequenceCode(
  db: PrismaClient,
  companyId: string,
  code: string,
  branchId: string,
): Promise<string> {
  const branch = await db.branch.findFirst({
    where: { id: branchId, companyId },
    select: { code: true, isHq: true },
  });
  if (!branch || branch.isHq) return code;

  const key = `${code}@${branch.code}`;
  const base = await db.sequence.findUnique({ where: { companyId_code: { companyId, code } } });
  if (!base) return code; // let the caller's "Sequence not found" stand

  await db.sequence.upsert({
    where: { companyId_code: { companyId, code: key } },
    update: {},
    create: {
      companyId,
      code: key,
      prefix: `${base.prefix}${base.separator}${branch.code}`,
      separator: base.separator,
      padding: base.padding,
      formatType: base.formatType,
      startNumber: base.startNumber,
      nextNumber: base.startNumber,
      resetPolicy: base.resetPolicy,
    },
  });
  return key;
}

/**
 * Yearless running codes — LD-00001, FI-00001 — taken with one atomic
 * increment, created on first use. Per branch: LD-HRG-00001 (head office
 * keeps the plain company counter).
 */
export async function nextSerialCode(
  db: Pick<PrismaClient, "sequence" | "branch">, // works inside a $transaction too
  companyId: string,
  code: string,
  defaults: { prefix: string; separator?: string; padding?: number },
  branchId?: string | null,
): Promise<string> {
  const separator = defaults.separator ?? "-";
  const padding = defaults.padding ?? 5;
  let key = code;
  let prefix = defaults.prefix;

  const branch = branchId
    ? await db.branch.findFirst({ where: { id: branchId, companyId }, select: { code: true, isHq: true } })
    : null;
  if (branch && !branch.isHq) {
    const base = await db.sequence.findUnique({
      where: { companyId_code: { companyId, code } },
      select: { prefix: true, separator: true },
    });
    key = `${code}@${branch.code}`;
    prefix = `${base?.prefix ?? defaults.prefix}${base?.separator ?? separator}${branch.code}`;
  }

  const seq = await db.sequence.upsert({
    where: { companyId_code: { companyId, code: key } },
    create: { companyId, code: key, prefix, separator, padding, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  return `${seq.prefix}${seq.separator}${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
}
