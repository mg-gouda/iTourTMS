import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { assertPeriodOpen } from "@/server/services/finance/period-engine";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

const p = (code: string) => modulePermissionProcedure("finance", code);

/**
 * Moving money between branches.
 *
 * Each branch keeps its own books, so one transfer is two entries:
 *   sender:   Dr inter-branch   / Cr its cash or bank
 *   receiver: Dr its cash/bank  / Cr inter-branch
 * Each branch's books balance on their own, and consolidated the
 * inter-branch account nets to zero — the elimination happens by itself.
 */
export const interBranchRouter = createTRPCRouter({
  transfer: p("finance:move:create")
    .input(
      z.object({
        fromBranchId: z.string(),
        toBranchId: z.string(),
        fromJournalId: z.string(),
        toJournalId: z.string(),
        interBranchAccountId: z.string(),
        amount: z.number().positive(),
        date: z.date(),
        ref: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.fromBranchId === input.toBranchId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pick two different branches." });
      }
      for (const id of [input.fromBranchId, input.toBranchId]) {
        if (!ctx.branch.ids.includes(id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You need access to both branches." });
        }
      }
      await assertPeriodOpen(ctx.db, ctx.companyId, input.date);

      const [from, to, account, company] = await Promise.all([
        ctx.db.journal.findFirst({ where: { id: input.fromJournalId, companyId: ctx.companyId } }),
        ctx.db.journal.findFirst({ where: { id: input.toJournalId, companyId: ctx.companyId } }),
        ctx.db.finAccount.findFirst({ where: { id: input.interBranchAccountId, companyId: ctx.companyId } }),
        ctx.db.company.findUniqueOrThrow({ where: { id: ctx.companyId }, select: { baseCurrencyId: true } }),
      ]);
      if (!from || !to || !account) throw new TRPCError({ code: "NOT_FOUND" });
      for (const [journal, branchId] of [[from, input.fromBranchId], [to, input.toBranchId]] as const) {
        if (journal.branchId && journal.branchId !== branchId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `${journal.name} belongs to another branch.` });
        }
        if (!journal.defaultAccountId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${journal.name} has no default account.` });
        }
      }
      const currencyId = company.baseCurrencyId;
      if (!currencyId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Company has no base currency." });

      const amount = new Decimal(input.amount).toDecimalPlaces(4);
      const ref = input.ref || "Inter-branch transfer";
      const line = (accountId: string, name: string, debit: Decimal, credit: Decimal, sequence: number) => ({
        accountId,
        name,
        displayType: "PRODUCT" as const,
        currencyId,
        debit,
        credit,
        balance: debit.minus(credit),
        amountCurrency: debit.minus(credit).abs(),
        quantity: new Decimal(1),
        priceUnit: amount,
        discount: new Decimal(0),
        sequence,
      });
      const zero = new Decimal(0);
      const entry = async (branchId: string, journalId: string, lines: ReturnType<typeof line>[]) => ({
        companyId: ctx.companyId,
        branchId,
        name: await generateSequenceNumber(ctx.db, ctx.companyId, "journal_entry", branchId),
        moveType: "ENTRY" as const,
        state: "POSTED" as const,
        date: input.date,
        journalId,
        currencyId,
        companyCurrencyId: currencyId,
        ref,
        amountUntaxed: amount,
        amountTax: zero,
        amountTotal: amount,
        amountResidual: zero,
        postedAt: new Date(),
        lineItems: { create: lines },
      });

      const sent = await entry(input.fromBranchId, from.id, [
        line(account.id, ref, amount, zero, 1),
        line(from.defaultAccountId!, ref, zero, amount, 2),
      ]);
      const received = await entry(input.toBranchId, to.id, [
        line(to.defaultAccountId!, ref, amount, zero, 1),
        line(account.id, ref, zero, amount, 2),
      ]);

      const [a, b] = await ctx.db.$transaction([
        ctx.db.move.create({ data: sent }),
        ctx.db.move.create({ data: received }),
      ]);
      return { sentId: a.id, sentName: a.name, receivedId: b.id, receivedName: b.name };
    }),
});
