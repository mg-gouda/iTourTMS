import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";

import { journalFor } from "@/server/branch-scope";
import { assertPeriodOpen } from "./period-engine";
import { generateSequenceNumber } from "./sequence-generator";

type Db = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">;

/**
 * Posts a balanced two-line entry — Dr one account, Cr another — in a
 * branch's books, numbered in that branch. Depreciation, revenue
 * recognition, expense amortisation and each side of an inter-branch
 * transfer are all this shape.
 */
export async function postTwoLineEntry(
  db: Db,
  e: {
    companyId: string;
    branchId: string;
    journalId: string;
    date: Date;
    ref: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: Decimal;
  },
): Promise<{ id: string; name: string | null }> {
  await assertPeriodOpen(db as PrismaClient, e.companyId, e.date);
  const company = await db.company.findUniqueOrThrow({
    where: { id: e.companyId },
    select: { baseCurrencyId: true },
  });
  const currencyId = company.baseCurrencyId;
  if (!currencyId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Company has no base currency." });

  const amount = e.amount.toDecimalPlaces(4);
  const zero = new Decimal(0);
  const line = (accountId: string, debit: Decimal, credit: Decimal, sequence: number) => ({
    accountId,
    name: e.ref,
    displayType: "PRODUCT" as const,
    currencyId,
    debit,
    credit,
    balance: debit.minus(credit),
    amountCurrency: debit.minus(credit).abs(),
    quantity: new Decimal(1),
    priceUnit: amount,
    discount: zero,
    sequence,
  });

  return db.move.create({
    data: {
      companyId: e.companyId,
      branchId: e.branchId,
      name: await generateSequenceNumber(db as PrismaClient, e.companyId, "journal_entry", e.branchId),
      moveType: "ENTRY",
      state: "POSTED",
      date: e.date,
      journalId: e.journalId,
      currencyId,
      companyCurrencyId: currencyId,
      ref: e.ref,
      amountUntaxed: amount,
      amountTax: zero,
      amountTotal: amount,
      amountResidual: zero,
      postedAt: new Date(),
      lineItems: {
        create: [line(e.debitAccountId, amount, zero, 1), line(e.creditAccountId, zero, amount, 2)],
      },
    },
    select: { id: true, name: true },
  });
}

/** The record's own journal, else the branch's (or a shared) miscellaneous journal. */
export async function postingJournal(
  db: PrismaClient,
  companyId: string,
  branchId: string,
  journalId: string | null,
): Promise<string> {
  if (journalId) return journalId;
  const journal = await journalFor(db, companyId, "GENERAL", branchId);
  if (!journal) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No miscellaneous (General) journal to post in." });
  }
  return journal.id;
}
