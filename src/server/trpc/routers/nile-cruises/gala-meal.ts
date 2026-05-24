import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseGalaMealCreateSchema, cruiseGalaMealUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseGalaMealRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseGalaMeal.findMany({
        where: { contractId: input.contractId },
        orderBy: { applicableDate: "asc" },
      });
    }),

  create: p("nile-cruises:contract:update")
    .input(cruiseGalaMealCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseGalaMeal.create({
        data: {
          ...input,
          applicableDate: new Date(input.applicableDate as string),
        },
      });
    }),

  update: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string(), data: cruiseGalaMealUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.applicableDate) data.applicableDate = new Date(data.applicableDate as string);
      return ctx.db.cruiseGalaMeal.update({ where: { id: input.id }, data });
    }),

  delete: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseGalaMeal.delete({ where: { id: input.id } });
    }),
});
