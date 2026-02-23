import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  fiscalYearCreateSchema,
  fiscalYearCloseSchema,
  fiscalPeriodLockSchema,
  fiscalPeriodUnlockSchema,
} from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { generatePeriods } from "@/server/services/finance/period-engine";
import { executeYearEndClose } from "@/server/services/finance/closing-engine";

const financeProcedure = moduleProcedure("finance");

export const periodRouter = createTRPCRouter({
  // ── Fiscal Year CRUD ──

  listYears: financeProcedure
    .input(
      z
        .object({ state: z.enum(["OPEN", "CLOSED"]).optional() })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.fiscalYear.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.state && { state: input.state }),
        },
        include: {
          _count: { select: { periods: true } },
          closingMove: { select: { id: true, name: true } },
        },
        orderBy: { dateFrom: "desc" },
      });
    }),

  getYear: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const year = await ctx.db.fiscalYear.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          periods: {
            orderBy: { number: "asc" },
            include: {
              lockedByUser: { select: { id: true, name: true, email: true } },
            },
          },
          closingMove: { select: { id: true, name: true } },
          closedByUser: { select: { id: true, name: true, email: true } },
        },
      });
      if (!year)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fiscal year not found",
        });
      return year;
    }),

  createYear: financeProcedure
    .input(fiscalYearCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for overlapping fiscal years
      const overlap = await ctx.db.fiscalYear.findFirst({
        where: {
          companyId: ctx.companyId,
          dateFrom: { lte: input.dateTo },
          dateTo: { gte: input.dateFrom },
        },
      });
      if (overlap) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Date range overlaps with existing fiscal year: ${overlap.name}`,
        });
      }

      const periods = generatePeriods(
        input.dateFrom,
        input.dateTo,
        input.includePeriod13,
      );

      return ctx.db.$transaction(async (tx) => {
        const fy = await tx.fiscalYear.create({
          data: {
            companyId: ctx.companyId,
            name: input.name,
            code: input.code,
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            state: "OPEN",
          },
        });

        await tx.fiscalPeriod.createMany({
          data: periods.map((p) => ({
            fiscalYearId: fy.id,
            name: p.name,
            code: p.code,
            number: p.number,
            dateFrom: p.dateFrom,
            dateTo: p.dateTo,
            state: "OPEN" as const,
          })),
        });

        return fy;
      });
    }),

  deleteYear: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const year = await ctx.db.fiscalYear.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!year)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fiscal year not found",
        });
      if (year.state !== "OPEN") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete a closed fiscal year",
        });
      }

      // Check for posted moves in the date range
      const postedCount = await ctx.db.move.count({
        where: {
          companyId: ctx.companyId,
          state: "POSTED",
          date: { gte: year.dateFrom, lte: year.dateTo },
        },
      });
      if (postedCount > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete: ${postedCount} posted journal entries exist in this period`,
        });
      }

      // Cascade delete handles periods
      return ctx.db.fiscalYear.delete({ where: { id: input.id } });
    }),

  // ── Period Locking ──

  lockPeriod: financeProcedure
    .input(fiscalPeriodLockSchema)
    .mutation(async ({ ctx, input }) => {
      const period = await ctx.db.fiscalPeriod.findFirst({
        where: { id: input.periodId },
        include: { fiscalYear: true },
      });
      if (!period || period.fiscalYear.companyId !== ctx.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Period not found",
        });
      }
      if (period.state !== "OPEN") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Period is already ${period.state.toLowerCase()}`,
        });
      }

      return ctx.db.fiscalPeriod.update({
        where: { id: input.periodId },
        data: {
          state: "LOCKED",
          lockedBy: ctx.session.user.id,
          lockedAt: new Date(),
        },
      });
    }),

  unlockPeriod: financeProcedure
    .input(fiscalPeriodUnlockSchema)
    .mutation(async ({ ctx, input }) => {
      const period = await ctx.db.fiscalPeriod.findFirst({
        where: { id: input.periodId },
        include: { fiscalYear: true },
      });
      if (!period || period.fiscalYear.companyId !== ctx.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Period not found",
        });
      }
      if (period.state !== "LOCKED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            period.state === "OPEN"
              ? "Period is already open"
              : "Cannot unlock a closed period. Reopen the fiscal year first.",
        });
      }
      if (period.fiscalYear.state !== "OPEN") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot unlock a period in a closed fiscal year",
        });
      }

      return ctx.db.fiscalPeriod.update({
        where: { id: input.periodId },
        data: {
          state: "OPEN",
          lockedBy: null,
          lockedAt: null,
        },
      });
    }),

  lockAllPeriods: financeProcedure
    .input(z.object({ fiscalYearId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const year = await ctx.db.fiscalYear.findFirst({
        where: { id: input.fiscalYearId, companyId: ctx.companyId },
      });
      if (!year)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fiscal year not found",
        });
      if (year.state !== "OPEN") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Fiscal year is already closed",
        });
      }

      return ctx.db.fiscalPeriod.updateMany({
        where: {
          fiscalYearId: input.fiscalYearId,
          state: "OPEN",
        },
        data: {
          state: "LOCKED",
          lockedBy: ctx.session.user.id,
          lockedAt: new Date(),
        },
      });
    }),

  // ── Year-End Close ──

  closeYear: financeProcedure
    .input(fiscalYearCloseSchema)
    .mutation(async ({ ctx, input }) => {
      const year = await ctx.db.fiscalYear.findFirst({
        where: { id: input.fiscalYearId, companyId: ctx.companyId },
        include: { periods: { select: { state: true } } },
      });
      if (!year)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fiscal year not found",
        });
      if (year.state !== "OPEN") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Fiscal year is already closed",
        });
      }

      // All periods must be locked
      const openPeriods = year.periods.filter((p) => p.state === "OPEN");
      if (openPeriods.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${openPeriods.length} period(s) are still open. Lock all periods before closing.`,
        });
      }

      // Validate retained earnings account
      const account = await ctx.db.finAccount.findFirst({
        where: {
          id: input.retainedEarningsAccountId,
          companyId: ctx.companyId,
          accountType: { in: ["EQUITY", "EQUITY_UNAFFECTED"] },
        },
      });
      if (!account) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid retained earnings account. Must be an equity account.",
        });
      }

      // Validate journal
      const journal = await ctx.db.journal.findFirst({
        where: {
          id: input.journalId,
          companyId: ctx.companyId,
          type: "GENERAL",
        },
      });
      if (!journal) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid closing journal. Must be a General (Miscellaneous) journal.",
        });
      }

      const closingDate = input.closingDate ?? year.dateTo;

      return executeYearEndClose(
        ctx.db as any,
        ctx.companyId,
        input.fiscalYearId,
        input.retainedEarningsAccountId,
        input.journalId,
        closingDate,
        ctx.session.user.id,
      );
    }),

  reopenYear: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const year = await ctx.db.fiscalYear.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!year)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fiscal year not found",
        });
      if (year.state !== "CLOSED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Fiscal year is not closed",
        });
      }

      // Check no subsequent closed fiscal year exists
      const laterClosed = await ctx.db.fiscalYear.findFirst({
        where: {
          companyId: ctx.companyId,
          state: "CLOSED",
          dateFrom: { gt: year.dateTo },
        },
      });
      if (laterClosed) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot reopen: a later fiscal year (${laterClosed.name}) is also closed. Reopen it first.`,
        });
      }

      return ctx.db.$transaction(async (tx) => {
        // Delete the closing move if it exists
        if (year.closingMoveId) {
          // Delete line items first, then the move
          await tx.moveLineItem.deleteMany({
            where: { moveId: year.closingMoveId },
          });
          await tx.move.delete({ where: { id: year.closingMoveId } });
        }

        // Set all periods back to LOCKED (not OPEN — intentional)
        await tx.fiscalPeriod.updateMany({
          where: { fiscalYearId: year.id },
          data: { state: "LOCKED" },
        });

        // Reopen the year
        return tx.fiscalYear.update({
          where: { id: year.id },
          data: {
            state: "OPEN",
            closingMoveId: null,
            closedBy: null,
            closedAt: null,
          },
        });
      });
    }),

  // ── Helper Queries ──

  checkDraftMoves: financeProcedure
    .input(z.object({ periodId: z.string() }))
    .query(async ({ ctx, input }) => {
      const period = await ctx.db.fiscalPeriod.findFirst({
        where: { id: input.periodId },
        include: { fiscalYear: { select: { companyId: true } } },
      });
      if (!period || period.fiscalYear.companyId !== ctx.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Period not found",
        });
      }

      const count = await ctx.db.move.count({
        where: {
          companyId: ctx.companyId,
          state: "DRAFT",
          date: { gte: period.dateFrom, lte: period.dateTo },
        },
      });

      return { count };
    }),
});
