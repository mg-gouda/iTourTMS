import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import {
  recurringEntryCreateSchema,
  recurringEntryUpdateSchema,
} from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  computeNextRunDate,
  collectDueDates,
  buildMoveDataFromTemplate,
  type RecurringTemplateWithLines,
} from "@/server/services/finance/recurring-engine";

const financeProcedure = moduleProcedure("finance");

export const recurringEntryRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z
        .object({
          state: z.enum(["ACTIVE", "PAUSED", "DONE"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.recurringEntry.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.state && { state: input.state }),
        },
        include: {
          journal: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, name: true } },
          _count: { select: { lineTemplates: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.recurringEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          journal: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, name: true } },
          lineTemplates: {
            include: {
              account: { select: { id: true, code: true, name: true } },
            },
            orderBy: { sequence: "asc" },
          },
        },
      });
      if (!entry)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring entry not found",
        });
      return entry;
    }),

  create: financeProcedure
    .input(recurringEntryCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate balance
      let totalDebit = new Decimal(0);
      let totalCredit = new Decimal(0);
      for (const line of input.lineTemplates) {
        totalDebit = totalDebit.plus(line.debit);
        totalCredit = totalCredit.plus(line.credit);
      }
      if (totalDebit.minus(totalCredit).abs().greaterThan(0.01)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Lines are unbalanced: debit ${totalDebit.toFixed(2)} ≠ credit ${totalCredit.toFixed(2)}`,
        });
      }

      return ctx.db.recurringEntry.create({
        data: {
          companyId: ctx.companyId,
          name: input.name,
          journalId: input.journalId,
          partnerId: input.partnerId,
          currencyId: input.currencyId,
          ref: input.ref,
          frequency: input.frequency,
          nextRunDate: input.nextRunDate,
          endDate: input.endDate,
          state: "ACTIVE",
          lineTemplates: {
            create: input.lineTemplates.map((l) => ({
              accountId: l.accountId,
              partnerId: l.partnerId,
              name: l.name,
              debit: l.debit,
              credit: l.credit,
              sequence: l.sequence,
            })),
          },
        },
        include: { lineTemplates: true },
      });
    }),

  update: financeProcedure
    .input(recurringEntryUpdateSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, lineTemplates, ...data } = input;
      const existing = await ctx.db.recurringEntry.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring entry not found",
        });
      if (existing.state === "DONE") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot update a completed recurring entry",
        });
      }

      if (lineTemplates) {
        // Validate balance
        let totalDebit = new Decimal(0);
        let totalCredit = new Decimal(0);
        for (const line of lineTemplates) {
          totalDebit = totalDebit.plus(line.debit);
          totalCredit = totalCredit.plus(line.credit);
        }
        if (totalDebit.minus(totalCredit).abs().greaterThan(0.01)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Lines are unbalanced: debit ${totalDebit.toFixed(2)} ≠ credit ${totalCredit.toFixed(2)}`,
          });
        }

        return ctx.db.$transaction(async (tx) => {
          await tx.recurringEntryLine.deleteMany({
            where: { recurringEntryId: id },
          });
          return tx.recurringEntry.update({
            where: { id },
            data: {
              ...data,
              lineTemplates: {
                create: lineTemplates.map((l) => ({
                  accountId: l.accountId,
                  partnerId: l.partnerId,
                  name: l.name,
                  debit: l.debit,
                  credit: l.credit,
                  sequence: l.sequence,
                })),
              },
            },
          });
        });
      }

      return ctx.db.recurringEntry.update({
        where: { id },
        data,
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.recurringEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring entry not found",
        });
      return ctx.db.recurringEntry.delete({ where: { id: input.id } });
    }),

  pause: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.recurringEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!entry)
        throw new TRPCError({ code: "NOT_FOUND" });
      if (entry.state !== "ACTIVE") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only active entries can be paused",
        });
      }
      return ctx.db.recurringEntry.update({
        where: { id: input.id },
        data: { state: "PAUSED" },
      });
    }),

  resume: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.recurringEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!entry)
        throw new TRPCError({ code: "NOT_FOUND" });
      if (entry.state !== "PAUSED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only paused entries can be resumed",
        });
      }
      return ctx.db.recurringEntry.update({
        where: { id: input.id },
        data: { state: "ACTIVE" },
      });
    }),

  generateNext: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.recurringEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { lineTemplates: true },
      });
      if (!entry)
        throw new TRPCError({ code: "NOT_FOUND" });
      if (entry.state !== "ACTIVE") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only active entries can generate moves",
        });
      }

      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });

      const template: RecurringTemplateWithLines = {
        ...entry,
        frequency: entry.frequency as any,
      };

      const moveData = buildMoveDataFromTemplate(
        template,
        entry.nextRunDate,
        company.baseCurrencyId ?? entry.currencyId,
      );

      const nextDate = computeNextRunDate(
        entry.nextRunDate,
        entry.frequency as any,
      );
      const isDone = entry.endDate && nextDate > entry.endDate;

      const move = await ctx.db.$transaction(async (tx) => {
        const created = await tx.move.create({ data: moveData as any });

        await tx.recurringEntry.update({
          where: { id: input.id },
          data: {
            lastRunDate: entry.nextRunDate,
            nextRunDate: nextDate,
            totalGenerated: entry.totalGenerated + 1,
            ...(isDone && { state: "DONE" }),
          },
        });

        return created;
      });

      return move;
    }),

  generateAllDue: financeProcedure
    .input(z.object({ asOfDate: z.coerce.date().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const targetDate = input?.asOfDate ?? new Date();

      const entries = await ctx.db.recurringEntry.findMany({
        where: {
          companyId: ctx.companyId,
          state: "ACTIVE",
          nextRunDate: { lte: targetDate },
        },
        include: { lineTemplates: true },
      });

      if (entries.length === 0) return { count: 0 };

      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });

      let totalCount = 0;

      for (const entry of entries) {
        const template: RecurringTemplateWithLines = {
          ...entry,
          frequency: entry.frequency as any,
        };

        const dueDates = collectDueDates(
          entry.nextRunDate,
          entry.endDate,
          targetDate,
          entry.frequency as any,
        );

        if (dueDates.length === 0) continue;

        await ctx.db.$transaction(async (tx) => {
          for (const date of dueDates) {
            const moveData = buildMoveDataFromTemplate(
              template,
              date,
              company.baseCurrencyId ?? entry.currencyId,
            );
            await tx.move.create({ data: moveData as any });
          }

          const lastDate = dueDates[dueDates.length - 1];
          const nextDate = computeNextRunDate(
            lastDate,
            entry.frequency as any,
          );
          const isDone = entry.endDate && nextDate > entry.endDate;

          await tx.recurringEntry.update({
            where: { id: entry.id },
            data: {
              lastRunDate: lastDate,
              nextRunDate: nextDate,
              totalGenerated: entry.totalGenerated + dueDates.length,
              ...(isDone && { state: "DONE" }),
            },
          });
        });

        totalCount += dueDates.length;
      }

      return { count: totalCount };
    }),
});
