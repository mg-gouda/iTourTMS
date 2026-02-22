import type { PrismaClient } from "@prisma/client";

/**
 * Generate the next sequence number for a given code.
 * Handles year-based reset and padding.
 *
 * @returns e.g. "INV/2026/00001"
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

  // Check if we need to reset (yearly/monthly)
  let nextNumber = sequence.nextNumber;
  const lastResetYear = sequence.lastReset.getFullYear();
  const lastResetMonth = sequence.lastReset.getMonth();

  if (
    (sequence.resetPolicy === "yearly" && lastResetYear < year) ||
    (sequence.resetPolicy === "monthly" &&
      (lastResetYear < year || lastResetMonth < now.getMonth()))
  ) {
    nextNumber = 1;
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
