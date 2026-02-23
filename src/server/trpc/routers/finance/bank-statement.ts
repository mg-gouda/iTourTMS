import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import {
  bankStatementCreateSchema,
  bankStatementImportSchema,
  bankStatementUpdateSchema,
} from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  buildStatementMoveLines,
  computeBalanceEnd,
  parseCSVStatementLines,
} from "@/server/services/finance/bank-statement-engine";
import { validateBalance } from "@/server/services/finance/move-engine";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

const financeProcedure = moduleProcedure("finance");

export const bankStatementRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z
        .object({
          journalId: z.string().optional(),
          state: z.enum(["DRAFT", "VALIDATED"]).optional(),
          dateFrom: z.coerce.date().optional(),
          dateTo: z.coerce.date().optional(),
          cursor: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const where: Record<string, unknown> = { companyId: ctx.companyId };

      if (input?.journalId) where.journalId = input.journalId;
      if (input?.state) where.state = input.state;
      if (input?.dateFrom || input?.dateTo) {
        where.date = {
          ...(input.dateFrom && { gte: input.dateFrom }),
          ...(input.dateTo && { lte: input.dateTo }),
        };
      }

      const items = await ctx.db.bankStatement.findMany({
        where: where as any,
        include: {
          journal: { select: { id: true, code: true, name: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { date: "desc" },
        take: limit + 1,
        ...(input?.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const statement = await ctx.db.bankStatement.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          journal: { select: { id: true, code: true, name: true, type: true } },
          lines: {
            include: {
              partner: { select: { id: true, name: true } },
              moveLine: {
                select: {
                  id: true,
                  name: true,
                  debit: true,
                  credit: true,
                  account: { select: { id: true, code: true, name: true } },
                },
              },
            },
            orderBy: { sequence: "asc" },
          },
        },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank statement not found",
        });
      }

      return statement;
    }),

  create: financeProcedure
    .input(bankStatementCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { lines, ...data } = input;

      return ctx.db.bankStatement.create({
        data: {
          ...data,
          companyId: ctx.companyId,
          state: "DRAFT",
          lines: {
            create: lines.map((line, idx) => ({
              ...line,
              sequence: line.sequence ?? (idx + 1) * 10,
            })),
          },
        },
        include: {
          journal: { select: { id: true, code: true, name: true } },
          lines: { orderBy: { sequence: "asc" } },
        },
      });
    }),

  update: financeProcedure
    .input(
      z.object({ id: z.string() }).merge(bankStatementUpdateSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, lines, ...data } = input;

      const statement = await ctx.db.bankStatement.findFirst({
        where: { id, companyId: ctx.companyId },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank statement not found",
        });
      }

      if (statement.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft statements can be updated",
        });
      }

      return ctx.db.$transaction(async (tx: any) => {
        // Delete existing lines if new ones are provided
        if (lines) {
          await tx.bankStatementLine.deleteMany({
            where: { statementId: id },
          });
        }

        return tx.bankStatement.update({
          where: { id },
          data: {
            ...data,
            ...(lines && {
              lines: {
                create: lines.map((line, idx) => ({
                  ...line,
                  sequence: line.sequence ?? (idx + 1) * 10,
                })),
              },
            }),
          },
          include: {
            journal: { select: { id: true, code: true, name: true } },
            lines: { orderBy: { sequence: "asc" } },
          },
        });
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const statement = await ctx.db.bankStatement.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank statement not found",
        });
      }

      if (statement.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft statements can be deleted",
        });
      }

      return ctx.db.bankStatement.delete({ where: { id: input.id } });
    }),

  validate: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const statement = await ctx.db.bankStatement.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          journal: {
            select: {
              id: true,
              defaultAccountId: true,
              suspenseAccountId: true,
              type: true,
            },
          },
          lines: {
            orderBy: { sequence: "asc" },
          },
        },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank statement not found",
        });
      }

      if (statement.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft statements can be validated",
        });
      }

      if (statement.lines.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Statement must have at least one line",
        });
      }

      const bankAccountId = statement.journal.defaultAccountId;
      const suspenseAccountId = statement.journal.suspenseAccountId;

      if (!bankAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Journal must have a default account (bank account) configured",
        });
      }

      if (!suspenseAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Journal must have a suspense account configured",
        });
      }

      // Build move lines for the statement
      const lineInputs = statement.lines.map((line) => ({
        date: line.date,
        name: line.name,
        ref: line.ref,
        partnerId: line.partnerId,
        amount: new Decimal(line.amount.toString()),
        sequence: line.sequence,
      }));

      const moveLines = buildStatementMoveLines(
        lineInputs,
        bankAccountId,
        suspenseAccountId,
      );

      validateBalance(moveLines);

      // Compute real ending balance
      const balanceEndReal = computeBalanceEnd(
        new Decimal(statement.balanceStart.toString()),
        statement.lines.map((l) => ({
          amount: new Decimal(l.amount.toString()),
        })),
      );

      // Generate sequence
      const name = await generateSequenceNumber(
        ctx.db,
        ctx.companyId,
        "bank_statement",
      );

      // Get company currency
      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });

      return ctx.db.$transaction(async (tx: any) => {
        // 1. Create Move with all line pairs
        const move = await tx.move.create({
          data: {
            companyId: ctx.companyId,
            name: `${name} - Bank Statement`,
            moveType: "ENTRY",
            state: "POSTED",
            date: statement.date,
            journalId: statement.journalId,
            currencyId: company.baseCurrencyId,
            companyCurrencyId: company.baseCurrencyId,
            amountUntaxed: 0,
            amountTax: 0,
            amountTotal: 0,
            amountResidual: 0,
            ref: name,
            postedAt: new Date(),
            lineItems: {
              create: moveLines.map((line) => ({
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
          include: {
            lineItems: {
              select: { id: true, accountId: true, sequence: true },
              orderBy: { sequence: "asc" },
            },
          },
        });

        // 2. Link each statement line to its suspense-side MoveLineItem
        // Move lines are created in pairs: [bank, suspense, bank, suspense, ...]
        // Suspense lines are at odd indices (1, 3, 5, ...)
        for (let i = 0; i < statement.lines.length; i++) {
          const suspenseLineIndex = i * 2 + 1; // suspense side
          const suspenseMoveLineId = move.lineItems[suspenseLineIndex]?.id;

          if (suspenseMoveLineId) {
            await tx.bankStatementLine.update({
              where: { id: statement.lines[i].id },
              data: { moveLineId: suspenseMoveLineId },
            });
          }
        }

        // 3. Update statement state
        const updatedStatement = await tx.bankStatement.update({
          where: { id: input.id },
          data: {
            state: "VALIDATED",
            name,
            balanceEndReal,
          },
          include: {
            journal: { select: { id: true, code: true, name: true } },
            lines: {
              include: {
                partner: { select: { id: true, name: true } },
              },
              orderBy: { sequence: "asc" },
            },
          },
        });

        return updatedStatement;
      });
    }),

  import: financeProcedure
    .input(bankStatementImportSchema)
    .mutation(async ({ ctx, input }) => {
      // Parse CSV content
      const parsedLines = parseCSVStatementLines(input.csvContent);

      // Compute balance end
      const balanceEnd = computeBalanceEnd(
        input.balanceStart,
        parsedLines.map((l) => ({ amount: l.amount })),
      );

      return ctx.db.bankStatement.create({
        data: {
          companyId: ctx.companyId,
          journalId: input.journalId,
          date: input.date,
          balanceStart: input.balanceStart,
          balanceEnd: Number(balanceEnd.toString()),
          state: "DRAFT",
          lines: {
            create: parsedLines.map((line, idx) => ({
              date: line.date,
              name: line.name,
              ref: line.ref,
              amount: line.amount,
              sequence: (idx + 1) * 10,
            })),
          },
        },
        include: {
          journal: { select: { id: true, code: true, name: true } },
          lines: { orderBy: { sequence: "asc" } },
        },
      });
    }),
});
