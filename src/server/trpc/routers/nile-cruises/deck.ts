import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseDeckCreateSchema, cruiseDeckUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseDeckRouter = createTRPCRouter({
  listByBoat: p("nile-cruises:boat:read")
    .input(z.object({ boatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseDeck.findMany({
        where: { boatId: input.boatId },
        include: { _count: { select: { cabins: true } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: p("nile-cruises:boat:update")
    .input(cruiseDeckCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeck.create({ data: input });
    }),

  update: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), data: cruiseDeckUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeck.update({ where: { id: input.id }, data: input.data });
    }),

  delete: p("nile-cruises:boat:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeck.delete({ where: { id: input.id } });
    }),

  savePlanLayout: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), planLayout: z.any() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeck.update({
        where: { id: input.id },
        data: { planLayout: input.planLayout },
      });
    }),
});
