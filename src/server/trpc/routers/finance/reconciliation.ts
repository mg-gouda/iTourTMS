import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import { reconcileSchema, unreconcileSchema } from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  suggestMatches,
  validateReconciliation,
  buildWriteOffMoveLines,
} from "@/server/services/finance/reconciliation-engine";
import { validateBalance } from "@/server/services/finance/move-engine";
import { updateMovePaymentState } from "@/server/services/finance/payment-engine";

const financeProcedure = moduleProcedure("finance");

export const reconciliationRouter = createTRPCRouter({
  getUnreconciledStatementLines: financeProcedure
    .input(
      z.object({
        journalId: z.string(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const lines = await ctx.db.bankStatementLine.findMany({
        where: {
          isReconciled: false,
          statement: {
            companyId: ctx.companyId,
            journalId: input.journalId,
            state: "VALIDATED",
          },
          ...(input.dateFrom || input.dateTo
            ? {
                date: {
                  ...(input.dateFrom && { gte: input.dateFrom }),
                  ...(input.dateTo && { lte: input.dateTo }),
                },
              }
            : {}),
        },
        include: {
          partner: { select: { id: true, name: true } },
          statement: { select: { id: true, name: true, date: true } },
        },
        orderBy: { date: "asc" },
      });

      return lines;
    }),

  getUnreconciledJournalItems: financeProcedure
    .input(
      z.object({
        journalId: z.string(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get the journal's suspense account to find matching move line items
      const journal = await ctx.db.journal.findUniqueOrThrow({
        where: { id: input.journalId },
        select: { suspenseAccountId: true },
      });

      if (!journal.suspenseAccountId) {
        return [];
      }

      // Find unreconciled move line items on reconcilable accounts
      // that aren't already fully reconciled
      const items = await ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
          },
          account: {
            reconcile: true,
          },
          // Exclude suspense account lines (those are statement-side)
          NOT: {
            accountId: journal.suspenseAccountId,
          },
          // Exclude lines that are already linked to bank statement lines
          bankStatementLine: null,
          ...(input.dateFrom || input.dateTo
            ? {
                move: {
                  companyId: ctx.companyId,
                  state: "POSTED",
                  date: {
                    ...(input.dateFrom && { gte: input.dateFrom }),
                    ...(input.dateTo && { lte: input.dateTo }),
                  },
                },
              }
            : {}),
        },
        include: {
          account: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, name: true } },
          move: { select: { id: true, name: true, ref: true, date: true, moveType: true } },
          debitReconciles: { select: { amount: true } },
          creditReconciles: { select: { amount: true } },
        },
        orderBy: { move: { date: "asc" } },
      });

      // Filter out fully reconciled items
      return items.filter((item) => {
        const lineAmount = new Decimal(item.debit.toString())
          .plus(new Decimal(item.credit.toString()));
        let reconciledAmount = new Decimal(0);
        for (const rec of item.debitReconciles) {
          reconciledAmount = reconciledAmount.plus(new Decimal(rec.amount.toString()));
        }
        for (const rec of item.creditReconciles) {
          reconciledAmount = reconciledAmount.plus(new Decimal(rec.amount.toString()));
        }
        return reconciledAmount.lessThan(lineAmount);
      });
    }),

  suggestMatches: financeProcedure
    .input(z.object({ journalId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch unreconciled statement lines
      const statementLines = await ctx.db.bankStatementLine.findMany({
        where: {
          isReconciled: false,
          statement: {
            companyId: ctx.companyId,
            journalId: input.journalId,
            state: "VALIDATED",
          },
        },
        select: {
          id: true,
          date: true,
          name: true,
          ref: true,
          amount: true,
          partnerId: true,
        },
      });

      // Fetch the journal's suspense account
      const journal = await ctx.db.journal.findUniqueOrThrow({
        where: { id: input.journalId },
        select: { suspenseAccountId: true },
      });

      if (!journal.suspenseAccountId || statementLines.length === 0) {
        return [];
      }

      // Fetch unreconciled journal items
      const journalItems = await ctx.db.moveLineItem.findMany({
        where: {
          move: { companyId: ctx.companyId, state: "POSTED" },
          account: { reconcile: true },
          NOT: { accountId: journal.suspenseAccountId },
          bankStatementLine: null,
        },
        select: {
          id: true,
          name: true,
          debit: true,
          credit: true,
          partnerId: true,
          move: { select: { date: true, ref: true } },
        },
      });

      const stLines = statementLines.map((l) => ({
        id: l.id,
        date: l.date,
        name: l.name,
        ref: l.ref,
        amount: new Decimal(l.amount.toString()),
        partnerId: l.partnerId,
      }));

      const jItems = journalItems.map((j) => ({
        id: j.id,
        date: j.move.date,
        name: j.name,
        debit: new Decimal(j.debit.toString()),
        credit: new Decimal(j.credit.toString()),
        partnerId: j.partnerId,
        moveRef: j.move.ref,
      }));

      return suggestMatches(stLines, jItems);
    }),

  reconcile: financeProcedure
    .input(reconcileSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch selected statement lines
      const statementLines = await ctx.db.bankStatementLine.findMany({
        where: {
          id: { in: input.bankStatementLineIds },
          isReconciled: false,
          statement: {
            companyId: ctx.companyId,
            state: "VALIDATED",
          },
        },
        include: {
          statement: {
            select: {
              journalId: true,
              journal: {
                select: {
                  defaultAccountId: true,
                  suspenseAccountId: true,
                },
              },
            },
          },
        },
      });

      if (statementLines.length !== input.bankStatementLineIds.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Some statement lines are invalid or already reconciled",
        });
      }

      // 2. Fetch selected journal items
      const journalItems = await ctx.db.moveLineItem.findMany({
        where: {
          id: { in: input.moveLineIds },
          move: { companyId: ctx.companyId, state: "POSTED" },
        },
        include: {
          move: { select: { id: true, moveType: true } },
        },
      });

      if (journalItems.length !== input.moveLineIds.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Some journal items are invalid",
        });
      }

      // 3. Validate reconciliation balances
      const stAmounts = statementLines.map((l) => new Decimal(l.amount.toString()));
      const jiBalances = journalItems.map((j) => ({
        debit: new Decimal(j.debit.toString()),
        credit: new Decimal(j.credit.toString()),
      }));

      const validation = validateReconciliation(
        stAmounts,
        jiBalances,
        input.writeOffAmount ?? 0,
      );

      if (!validation.isValid && !input.writeOffAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Reconciliation is unbalanced by ${validation.difference.toFixed(4)}. Provide a write-off account to cover the difference.`,
        });
      }

      const journal = statementLines[0].statement.journal;
      const suspenseAccountId = journal.suspenseAccountId!;
      const bankAccountId = journal.defaultAccountId!;

      // Get company currency
      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });

      return ctx.db.$transaction(async (tx: any) => {
        // 4. Optionally create write-off Move
        if (
          input.writeOffAmount &&
          Math.abs(input.writeOffAmount) > 0.01 &&
          input.writeOffAccountId
        ) {
          const writeOffLines = buildWriteOffMoveLines(
            input.writeOffAmount,
            bankAccountId,
            input.writeOffAccountId,
          );

          validateBalance(writeOffLines);

          await tx.move.create({
            data: {
              companyId: ctx.companyId,
              name: "Write-Off",
              moveType: "ENTRY",
              state: "POSTED",
              date: new Date(),
              journalId: statementLines[0].statement.journalId,
              currencyId: company.baseCurrencyId,
              companyCurrencyId: company.baseCurrencyId,
              amountUntaxed: 0,
              amountTax: 0,
              amountTotal: 0,
              amountResidual: 0,
              postedAt: new Date(),
              lineItems: {
                create: writeOffLines.map((line) => ({
                  accountId: line.accountId,
                  partnerId: line.partnerId,
                  name: line.name,
                  displayType: line.displayType as any,
                  debit: line.debit,
                  credit: line.credit,
                  balance: line.balance,
                  amountCurrency: line.amountCurrency,
                  quantity: line.quantity,
                  priceUnit: line.priceUnit,
                  discount: line.discount,
                  sequence: line.sequence,
                })),
              },
            },
          });
        }

        // 5. Create PartialReconcile records
        // Link each statement line's suspense move line to the counterpart journal items
        const affectedMoveIds = new Set<string>();

        for (const stLine of statementLines) {
          const suspenseMoveLineId = stLine.moveLineId;
          if (!suspenseMoveLineId) continue;

          // For each journal item, create a reconcile record
          for (const jItem of journalItems) {
            const jDebit = new Decimal(jItem.debit.toString());
            const jCredit = new Decimal(jItem.credit.toString());
            const reconcileAmount = jDebit.plus(jCredit).abs().toDecimalPlaces(4);

            if (reconcileAmount.greaterThan(0)) {
              // Determine debit/credit: suspense line credit matches against counterpart debit
              const stAmount = new Decimal(stLine.amount.toString());
              const isDeposit = stAmount.greaterThanOrEqualTo(0);

              await tx.partialReconcile.create({
                data: {
                  companyId: ctx.companyId,
                  // For deposits: suspense has credit, counterpart has debit
                  // For withdrawals: suspense has debit, counterpart has credit
                  debitMoveLineId: isDeposit ? jItem.id : suspenseMoveLineId,
                  creditMoveLineId: isDeposit ? suspenseMoveLineId : jItem.id,
                  amount: reconcileAmount,
                },
              });

              affectedMoveIds.add(jItem.move.id);
            }
          }
        }

        // 6. Mark statement lines as reconciled
        await tx.bankStatementLine.updateMany({
          where: { id: { in: input.bankStatementLineIds } },
          data: { isReconciled: true },
        });

        // 7. Update payment state on affected invoice moves
        for (const moveId of affectedMoveIds) {
          const move = await tx.move.findUnique({
            where: { id: moveId },
            select: { moveType: true },
          });
          if (
            move &&
            ["OUT_INVOICE", "OUT_REFUND", "IN_INVOICE", "IN_REFUND"].includes(
              move.moveType,
            )
          ) {
            await updateMovePaymentState(tx, moveId);
          }
        }

        return { reconciledCount: statementLines.length };
      });
    }),

  unreconcile: financeProcedure
    .input(unreconcileSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch the statement lines with their move line IDs
      const statementLines = await ctx.db.bankStatementLine.findMany({
        where: {
          id: { in: input.bankStatementLineIds },
          isReconciled: true,
          statement: { companyId: ctx.companyId },
        },
        select: { id: true, moveLineId: true },
      });

      if (statementLines.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No reconciled statement lines found",
        });
      }

      const moveLineIds = statementLines
        .map((l) => l.moveLineId)
        .filter(Boolean) as string[];

      return ctx.db.$transaction(async (tx: any) => {
        // 1. Find affected reconcile records and their invoice moves
        const reconciles = await tx.partialReconcile.findMany({
          where: {
            OR: [
              { debitMoveLineId: { in: moveLineIds } },
              { creditMoveLineId: { in: moveLineIds } },
            ],
          },
          select: {
            id: true,
            debitMoveLine: { select: { move: { select: { id: true, moveType: true } } } },
            creditMoveLine: { select: { move: { select: { id: true, moveType: true } } } },
          },
        });

        const affectedMoveIds = new Set<string>();
        for (const rec of reconciles) {
          const debitMove = rec.debitMoveLine.move;
          const creditMove = rec.creditMoveLine.move;
          if (
            ["OUT_INVOICE", "OUT_REFUND", "IN_INVOICE", "IN_REFUND"].includes(
              debitMove.moveType,
            )
          ) {
            affectedMoveIds.add(debitMove.id);
          }
          if (
            ["OUT_INVOICE", "OUT_REFUND", "IN_INVOICE", "IN_REFUND"].includes(
              creditMove.moveType,
            )
          ) {
            affectedMoveIds.add(creditMove.id);
          }
        }

        // 2. Delete reconcile records
        await tx.partialReconcile.deleteMany({
          where: {
            OR: [
              { debitMoveLineId: { in: moveLineIds } },
              { creditMoveLineId: { in: moveLineIds } },
            ],
          },
        });

        // 3. Mark statement lines as unreconciled
        await tx.bankStatementLine.updateMany({
          where: { id: { in: input.bankStatementLineIds } },
          data: { isReconciled: false },
        });

        // 4. Revert payment state on affected invoices
        for (const moveId of affectedMoveIds) {
          await updateMovePaymentState(tx, moveId);
        }

        return { unreconciledCount: statementLines.length };
      });
    }),
});
