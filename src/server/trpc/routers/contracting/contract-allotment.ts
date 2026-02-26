import { z } from "zod";

import {
  allotmentBulkSaveSchema,
  stopSaleCreateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { maybeDispatchContractWebhook } from "@/server/services/contracting/webhook-dispatcher";
import type { PrismaClient } from "@prisma/client";

const proc = moduleProcedure("contracting");

async function verifyContract(
  db: PrismaClient,
  contractId: string,
  companyId: string,
) {
  await db.contract.findFirstOrThrow({
    where: { id: contractId, companyId },
  });
}

export const contractAllotmentRouter = createTRPCRouter({
  // ── Allotment Grid ──

  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractAllotment.findMany({
        where: { contractId: input.contractId },
        include: {
          roomType: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ roomTypeId: "asc" }],
      });
    }),

  bulkSave: proc
    .input(allotmentBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      await ctx.db.$transaction(async (tx) => {
        await tx.contractAllotment.deleteMany({
          where: { contractId: input.contractId },
        });

        if (input.items.length > 0) {
          await tx.contractAllotment.createMany({
            data: input.items.map((item) => ({
              contractId: input.contractId,
              roomTypeId: item.roomTypeId,
              seasonId: item.seasonId ?? null,
              basis: item.basis,
              totalRooms: item.freeSale ? 0 : item.totalRooms,
              freeSale: item.freeSale,
            })),
          });
        }
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "availability.updated");

      return { success: true };
    }),

  // ── Cross-Contract Calendar ──

  calendar: proc
    .input(
      z.object({
        hotelId: z.string().optional(),
        dateFrom: z.string(),
        dateTo: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const contractFilter: Record<string, unknown> = {
        companyId: ctx.companyId,
      };
      if (input.hotelId) {
        contractFilter.hotelId = input.hotelId;
      }

      const contracts = await ctx.db.contract.findMany({
        where: contractFilter,
        select: {
          id: true,
          name: true,
          code: true,
          hotel: { select: { id: true, name: true } },
        },
      });

      const contractIds = contracts.map((c) => c.id);
      if (contractIds.length === 0) return { contracts: [], allotments: [], stopSales: [] };

      const dateFrom = new Date(input.dateFrom);
      const dateTo = new Date(input.dateTo);

      const allotments = await ctx.db.contractAllotment.findMany({
        where: {
          contractId: { in: contractIds },
        },
        include: {
          roomType: { select: { id: true, name: true, code: true } },
        },
      });

      const stopSales = await ctx.db.contractStopSale.findMany({
        where: {
          contractId: { in: contractIds },
          dateFrom: { lte: dateTo },
          dateTo: { gte: dateFrom },
        },
        include: {
          roomType: { select: { id: true, name: true, code: true } },
        },
      });

      return { contracts, allotments, stopSales };
    }),

  // ── Cross-Contract Stop Sales ──

  allStopSales: proc
    .input(
      z.object({
        hotelId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const contractFilter: Record<string, unknown> = {
        companyId: ctx.companyId,
      };
      if (input.hotelId) {
        contractFilter.hotelId = input.hotelId;
      }

      const contracts = await ctx.db.contract.findMany({
        where: contractFilter,
        select: { id: true },
      });

      const contractIds = contracts.map((c) => c.id);
      if (contractIds.length === 0) return [];

      const where: Record<string, unknown> = {
        contractId: { in: contractIds },
      };
      if (input.dateFrom) {
        where.dateTo = { gte: new Date(input.dateFrom) };
      }
      if (input.dateTo) {
        where.dateFrom = { lte: new Date(input.dateTo) };
      }

      return ctx.db.contractStopSale.findMany({
        where,
        include: {
          contract: {
            select: {
              id: true,
              name: true,
              code: true,
              hotel: { select: { id: true, name: true } },
            },
          },
          roomType: { select: { id: true, name: true, code: true } },
        },
        orderBy: { dateFrom: "asc" },
      });
    }),

  // ── Stop Sales ──

  listStopSales: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractStopSale.findMany({
        where: { contractId: input.contractId },
        include: {
          roomType: { select: { id: true, name: true, code: true } },
        },
        orderBy: { dateFrom: "asc" },
      });
    }),

  createStopSale: proc
    .input(stopSaleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      const stopSale = await ctx.db.contractStopSale.create({
        data: {
          contractId: input.contractId,
          roomTypeId: input.roomTypeId ?? null,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
          reason: input.reason ?? null,
        },
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "availability.updated");

      return stopSale;
    }),

  deleteStopSale: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stopSale = await ctx.db.contractStopSale.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true, id: true } } },
      });
      if (stopSale.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      const deleted = await ctx.db.contractStopSale.delete({
        where: { id: input.id },
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, stopSale.contractId, "availability.updated");

      return deleted;
    }),
});
