import { z } from "zod";

import { contractChildPolicyUpsertSchema } from "@/lib/validations/contracting";
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

export const contractChildPolicyRouter = createTRPCRouter({
  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractChildPolicy.findMany({
        where: { contractId: input.contractId },
        orderBy: { ageFrom: "asc" },
      });
    }),

  upsert: proc
    .input(contractChildPolicyUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      const existing = await ctx.db.contractChildPolicy.findUnique({
        where: {
          contractId_category: {
            contractId: input.contractId,
            category: input.category,
          },
        },
      });

      if (existing) {
        return ctx.db.contractChildPolicy.update({
          where: { id: existing.id },
          data: {
            ageFrom: input.ageFrom,
            ageTo: input.ageTo,
            label: input.label,
            freeInSharing: input.freeInSharing,
            maxFreePerRoom: input.maxFreePerRoom,
            extraBedAllowed: input.extraBedAllowed,
            mealsIncluded: input.mealsIncluded,
            notes: input.notes ?? null,
          },
        });
      }

      return ctx.db.contractChildPolicy.create({
        data: {
          contractId: input.contractId,
          category: input.category,
          ageFrom: input.ageFrom,
          ageTo: input.ageTo,
          label: input.label,
          freeInSharing: input.freeInSharing,
          maxFreePerRoom: input.maxFreePerRoom,
          extraBedAllowed: input.extraBedAllowed,
          mealsIncluded: input.mealsIncluded,
          notes: input.notes ?? null,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string(), contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractChildPolicy.delete({
        where: { id: input.id, contractId: input.contractId },
      });
    }),
});
