import { z } from "zod";

import { addonCreateSchema, addonUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const addonRouter = createTRPCRouter({
  listByExcursion: proc
    .input(z.object({ excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmExcursionAddon.findMany({
        where: { excursionId: input.excursionId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: proc
    .input(addonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmExcursionAddon.create({
        data: {
          excursionId: input.excursionId,
          name: input.name,
          description: input.description || null,
          price: input.price ?? null,
          sortOrder: input.sortOrder,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: addonUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const addon = await ctx.db.crmExcursionAddon.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (addon.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      const data: Record<string, unknown> = { ...input.data };
      if (data.description !== undefined) data.description = data.description || null;
      if (data.price !== undefined) data.price = data.price ?? null;
      return ctx.db.crmExcursionAddon.update({ where: { id: input.id }, data });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const addon = await ctx.db.crmExcursionAddon.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (addon.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.crmExcursionAddon.delete({ where: { id: input.id } });
    }),
});
