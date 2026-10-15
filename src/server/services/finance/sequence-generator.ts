import type { PrismaClient } from "@prisma/client";

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
): Promise<string> {
  const code = branchId ? await branchSequenceCode(db, companyId, baseCode, branchId) : baseCode;
  const now = new Date();
  const year = now.getFullYear();

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

  // Standard format: prefix/year/paddedNumber
  let nextNumber = sequence.nextNumber;
  const lastResetYear = sequence.lastReset.getFullYear();
  const lastResetMonth = sequence.lastReset.getMonth();

  if (
    (sequence.resetPolicy === "yearly" && lastResetYear < year) ||
    (sequence.resetPolicy === "monthly" &&
      (lastResetYear < year || lastResetMonth < now.getMonth()))
  ) {
    nextNumber = sequence.startNumber;
  }

  // Format the number
  const paddedNumber = String(nextNumber).padStart(sequence.padding, "0");
  const separator = sequence.separator;
  const formattedSequence = `${sequence.prefix}${separator}${year}${separator}${paddedNumber}`;

  // Increment
  await db.sequence.update({
    where: { companyId_code: { companyId, code } },
    data: {
      nextNumber: nextNumber + 1,
      lastReset: now,
    },
  });

  return formattedSequence;
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
