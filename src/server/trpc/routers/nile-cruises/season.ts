import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseSeasonCreateSchema, cruiseSeasonUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseSeasonRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseSeason.findMany({
        where: { contractId: input.contractId },
        orderBy: { dateFrom: "asc" },
      });
    }),

  create: p("nile-cruises:contract:update")
    .input(cruiseSeasonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseSeason.create({
        data: {
          ...input,
          dateFrom: new Date(input.dateFrom as string),
          dateTo: new Date(input.dateTo as string),
        },
      });
    }),

  update: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string(), data: cruiseSeasonUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.dateFrom) data.dateFrom = new Date(data.dateFrom as string);
      if (data.dateTo) data.dateTo = new Date(data.dateTo as string);
      return ctx.db.cruiseSeason.update({ where: { id: input.id }, data });
    }),

  delete: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseSeason.delete({ where: { id: input.id } });
    }),
});
