import { z } from "zod";

import {
  contractChildPolicyCreateSchema,
  contractChildPolicyUpdateSchema,
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

  create: proc
    .input(contractChildPolicyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

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

  update: proc
    .input(contractChildPolicyUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      const { id, contractId, ...data } = input;
      return ctx.db.contractChildPolicy.update({
        where: { id, contractId },
        data,
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
