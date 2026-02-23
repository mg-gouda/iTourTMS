import { z } from "zod";

import {
  supplementChildBulkSaveSchema,
  supplementExtraBedBulkSaveSchema,
  supplementMealBulkSaveSchema,
  supplementOccupancyBulkSaveSchema,
  supplementRoomTypeBulkSaveSchema,
  supplementViewCreateSchema,
  supplementViewUpdateSchema,
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

export const contractSupplementRouter = createTRPCRouter({
  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      return ctx.db.contractSupplement.findMany({
        where: { contractId: input.contractId },
        include: {
          season: { select: { id: true, name: true, code: true } },
          roomType: { select: { id: true, name: true, code: true } },
          mealBasis: { select: { id: true, name: true, mealCode: true } },
        },
        orderBy: [{ supplementType: "asc" }, { sortOrder: "asc" }],
      });
    }),

  bulkSaveRoomType: proc
    .input(supplementRoomTypeBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      await ctx.db.$transaction(async (tx) => {
        await tx.contractSupplement.deleteMany({
          where: { contractId: input.contractId, supplementType: "ROOM_TYPE" },
        });

        if (input.items.length > 0) {
          await tx.contractSupplement.createMany({
            data: input.items.map((item) => ({
              contractId: input.contractId,
              seasonId: item.seasonId,
              supplementType: "ROOM_TYPE" as const,
              roomTypeId: item.roomTypeId,
              value: item.value,
              valueType: item.valueType,
              perPerson: item.perPerson,
              perNight: item.perNight,
            })),
          });
        }
      });

      return { success: true };
    }),

  bulkSaveMeal: proc
    .input(supplementMealBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      await ctx.db.$transaction(async (tx) => {
        await tx.contractSupplement.deleteMany({
          where: { contractId: input.contractId, supplementType: "MEAL" },
        });

        if (input.items.length > 0) {
          await tx.contractSupplement.createMany({
            data: input.items.map((item) => ({
              contractId: input.contractId,
              seasonId: item.seasonId,
              supplementType: "MEAL" as const,
              mealBasisId: item.mealBasisId,
              value: item.value,
              valueType: item.valueType,
              isReduction: item.isReduction,
              perPerson: item.perPerson,
              perNight: item.perNight,
            })),
          });
        }
      });

      return { success: true };
    }),

  bulkSaveOccupancy: proc
    .input(supplementOccupancyBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      await ctx.db.$transaction(async (tx) => {
        await tx.contractSupplement.deleteMany({
          where: { contractId: input.contractId, supplementType: "OCCUPANCY" },
        });

        if (input.items.length > 0) {
          await tx.contractSupplement.createMany({
            data: input.items.map((item) => ({
              contractId: input.contractId,
              seasonId: item.seasonId,
              supplementType: "OCCUPANCY" as const,
              forAdults: item.forAdults,
              value: item.value,
              valueType: item.valueType,
              isReduction: item.isReduction,
              perNight: item.perNight,
            })),
          });
        }
      });

      return { success: true };
    }),

  bulkSaveChild: proc
    .input(supplementChildBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      await ctx.db.$transaction(async (tx) => {
        await tx.contractSupplement.deleteMany({
          where: { contractId: input.contractId, supplementType: "CHILD" },
        });

        if (input.items.length > 0) {
          await tx.contractSupplement.createMany({
            data: input.items.map((item) => ({
              contractId: input.contractId,
              seasonId: item.seasonId,
              supplementType: "CHILD" as const,
              forChildCategory: item.forChildCategory,
              forChildBedding: item.forChildBedding,
              value: item.value,
              valueType: item.valueType,
              perNight: item.perNight,
            })),
          });
        }
      });

      return { success: true };
    }),

  bulkSaveExtraBed: proc
    .input(supplementExtraBedBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      await ctx.db.$transaction(async (tx) => {
        await tx.contractSupplement.deleteMany({
          where: { contractId: input.contractId, supplementType: "EXTRA_BED" },
        });

        if (input.items.length > 0) {
          await tx.contractSupplement.createMany({
            data: input.items.map((item) => ({
              contractId: input.contractId,
              seasonId: item.seasonId,
              supplementType: "EXTRA_BED" as const,
              value: item.value,
              valueType: item.valueType,
              perNight: item.perNight,
            })),
          });
        }
      });

      return { success: true };
    }),

  createView: proc
    .input(supplementViewCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      return ctx.db.contractSupplement.create({
        data: {
          contractId: input.contractId,
          seasonId: input.seasonId,
          supplementType: "VIEW",
          label: input.label,
          value: input.value,
          valueType: input.valueType,
          perPerson: input.perPerson,
          perNight: input.perNight,
          notes: input.notes ?? null,
          sortOrder: input.sortOrder,
        },
      });
    }),

  updateView: proc
    .input(z.object({ id: z.string(), data: supplementViewUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const supplement = await ctx.db.contractSupplement.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });

      if (supplement.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      return ctx.db.contractSupplement.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supplement = await ctx.db.contractSupplement.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });

      if (supplement.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      return ctx.db.contractSupplement.delete({ where: { id: input.id } });
    }),
});
