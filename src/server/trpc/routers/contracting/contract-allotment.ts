import { z } from "zod";

import {
  allotmentBulkSaveSchema,
  stopSaleCreateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
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
          season: { select: { id: true, name: true, code: true } },
          roomType: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ seasonId: "asc" }],
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
              seasonId: item.seasonId,
              roomTypeId: item.roomTypeId,
              totalRooms: item.freeSale ? 0 : item.totalRooms,
              freeSale: item.freeSale,
            })),
          });
        }
      });

      return { success: true };
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
      return ctx.db.contractStopSale.create({
        data: {
          contractId: input.contractId,
          roomTypeId: input.roomTypeId ?? null,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
          reason: input.reason ?? null,
        },
      });
    }),

  deleteStopSale: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stopSale = await ctx.db.contractStopSale.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (stopSale.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.contractStopSale.delete({
        where: { id: input.id },
      });
    }),
});
