import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { postTwoLineEntry } from "@/server/services/finance/simple-entry";

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

      const [from, to, account] = await Promise.all([
        ctx.db.journal.findFirst({ where: { id: input.fromJournalId, companyId: ctx.companyId } }),
        ctx.db.journal.findFirst({ where: { id: input.toJournalId, companyId: ctx.companyId } }),
        ctx.db.finAccount.findFirst({ where: { id: input.interBranchAccountId, companyId: ctx.companyId } }),
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

      const amount = new Decimal(input.amount);
      const ref = input.ref || "Inter-branch transfer";
      const common = { companyId: ctx.companyId, date: input.date, ref, amount };
      const [sent, received] = await ctx.db.$transaction(async (tx) => [
        await postTwoLineEntry(tx, {
          ...common,
          branchId: input.fromBranchId,
          journalId: from.id,
          debitAccountId: account.id,
          creditAccountId: from.defaultAccountId!,
        }),
        await postTwoLineEntry(tx, {
          ...common,
          branchId: input.toBranchId,
          journalId: to.id,
          debitAccountId: to.defaultAccountId!,
          creditAccountId: account.id,
        }),
      ]);
      return { sentId: sent.id, sentName: sent.name, receivedId: received.id, receivedName: received.name };
    }),
});
