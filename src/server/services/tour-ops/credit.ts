import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";

export interface CreditStatus {
  hasLimit: boolean;
  creditLimit: number;
  creditUsed: number;
  availableCredit: number;
  paymentTermDays: number;
}

export interface CreditCheckResult {
  allowed: boolean;
  status: CreditStatus;
  requestedAmount: number;
  overageAmount: number;
}

export async function getCreditStatus(
  db: PrismaClient,
  companyId: string,
  tourOperatorId: string,
): Promise<CreditStatus | null> {
  const to = await db.tourOperator.findFirst({
    where: { id: tourOperatorId, companyId },
    select: {
      paymentTermDays: true,
      partner: { select: { creditLimit: true, creditUsed: true } },
    },
  });
  if (!to) return null;

  const creditLimit = Number(to.partner?.creditLimit ?? 0);
  const creditUsed = Number(to.partner?.creditUsed ?? 0);

  return {
    hasLimit: creditLimit > 0,
    creditLimit,
    creditUsed,
    availableCredit: new Decimal(creditLimit).minus(creditUsed).toNumber(),
    paymentTermDays: to.paymentTermDays ?? 0,
  };
}

export function checkCredit(status: CreditStatus, requestedAmount: number): CreditCheckResult {
  if (!status.hasLimit) {
    return { allowed: true, status, requestedAmount, overageAmount: 0 };
  }

  const projectedUsed = new Decimal(status.creditUsed).plus(requestedAmount);
  const overage = projectedUsed.minus(status.creditLimit);
  const allowed = overage.lte(0);

  return {
    allowed,
    status,
    requestedAmount,
    overageAmount: allowed ? 0 : overage.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Recalculates creditUsed on the Partner linked to a TourOperator by summing
 * totalSelling from the final quotation of all active OpsFiles.
 */
export async function recalcCreditUsed(
  db: PrismaClient,
  companyId: string,
  tourOperatorId: string,
): Promise<void> {
  const to = await db.tourOperator.findFirst({
    where: { id: tourOperatorId, companyId },
    select: { partnerId: true },
  });
  if (!to?.partnerId) return;

  const activeFiles = await db.opsFile.findMany({
    where: {
      companyId,
      tourOperatorId,
      status: { in: ["QUOTED", "CONFIRMED", "IN_PROGRESS"] },
    },
    select: {
      quotations: {
        where: { isFinal: true },
        select: { totalSelling: true },
        take: 1,
      },
    },
  });

  const totalUsed = activeFiles.reduce((sum, f) => {
    const qt = f.quotations[0];
    return qt ? sum.plus(qt.totalSelling) : sum;
  }, new Decimal(0));

  await db.partner.update({
    where: { id: to.partnerId },
    data: { creditUsed: totalUsed.toDecimalPlaces(2).toNumber() },
  });
}
