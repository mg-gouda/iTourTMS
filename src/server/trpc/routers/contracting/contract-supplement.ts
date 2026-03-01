import { z } from "zod";

import {
  supplementExtraBedBulkSaveSchema,
  supplementMealBulkSaveSchema,
  supplementOccupancyBulkSaveSchema,
  supplementRoomTypeBulkSaveSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { logContractAction } from "@/server/services/contracting/audit-logger";
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

export const contractSupplementRouter = createTRPCRouter({
  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      return ctx.db.contractSupplement.findMany({
        where: { contractId: input.contractId },
        include: {
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

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "UPDATE",
        entity: "SUPPLEMENT",
        summary: `Updated supplements`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "rates.updated");

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

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "UPDATE",
        entity: "SUPPLEMENT",
        summary: `Updated supplements`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "rates.updated");

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

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "UPDATE",
        entity: "SUPPLEMENT",
        summary: `Updated supplements`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "rates.updated");

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
              supplementType: "EXTRA_BED" as const,
              value: item.value,
              valueType: item.valueType,
              perNight: item.perNight,
            })),
          });
        }
      });

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "UPDATE",
        entity: "SUPPLEMENT",
        summary: `Updated supplements`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "rates.updated");

      return { success: true };
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

      const deleted = await ctx.db.contractSupplement.delete({ where: { id: input.id } });

      await logContractAction(ctx.db, {
        contractId: supplement.contractId,
        action: "DELETE",
        entity: "SUPPLEMENT",
        entityId: input.id,
        summary: `Deleted supplement`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return deleted;
    }),
});
