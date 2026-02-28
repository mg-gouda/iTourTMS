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
  code: string,
): Promise<string> {
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
