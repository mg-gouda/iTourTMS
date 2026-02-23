import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { contractMealBasisCreateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const contractMealBasisRouter = createTRPCRouter({
  list: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractMealBasis.findMany({
        where: { contractId: input.contractId },
        include: {
          mealBasis: { select: { id: true, name: true, mealCode: true } },
        },
        orderBy: { sortOrder: "asc" },
      });
    }),

  add: proc
    .input(contractMealBasisCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      // Verify meal basis belongs to contract's hotel
      await ctx.db.hotelMealBasis.findFirstOrThrow({
        where: { id: input.mealBasisId, hotelId: contract.hotelId },
      });

      return ctx.db.contractMealBasis.create({
        data: input,
      });
    }),

  remove: proc
    .input(z.object({ id: z.string(), contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      const assignment = await ctx.db.contractMealBasis.findUniqueOrThrow({
        where: { id: input.id },
      });

      if (assignment.isBase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the base meal basis from the contract",
        });
      }

      return ctx.db.contractMealBasis.delete({ where: { id: input.id } });
    }),
});
