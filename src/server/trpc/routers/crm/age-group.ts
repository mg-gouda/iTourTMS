import { z } from "zod";

import { ageGroupCreateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const ageGroupRouter = createTRPCRouter({
  listByExcursion: proc
    .input(z.object({ excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmExcursionAgeGroup.findMany({
        where: { excursionId: input.excursionId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: proc
    .input(ageGroupCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmExcursionAgeGroup.create({
        data: {
          excursionId: input.excursionId,
          label: input.label,
          minAge: input.minAge,
          maxAge: input.maxAge,
          sortOrder: input.sortOrder,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ag = await ctx.db.crmExcursionAgeGroup.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (ag.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.crmExcursionAgeGroup.delete({ where: { id: input.id } });
    }),
});
