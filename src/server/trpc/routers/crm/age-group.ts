import { z } from "zod";

import { ageGroupCreateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("crm", code);

export const ageGroupRouter = createTRPCRouter({
  listByExcursion: p("crm:excursion:read")
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

  create: p("crm:excursion:create")
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

  delete: p("crm:excursion:delete")
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
