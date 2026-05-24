import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseCabinCategoryCreateSchema, cruiseCabinCategoryUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseCabinCategoryRouter = createTRPCRouter({
  listByBoat: p("nile-cruises:boat:read")
    .input(z.object({ boatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseCabinCategory.findMany({
        where: { boatId: input.boatId },
        include: { _count: { select: { cabins: true } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  getById: p("nile-cruises:boat:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseCabinCategory.findFirstOrThrow({ where: { id: input.id } });
    }),

  create: p("nile-cruises:boat:update")
    .input(cruiseCabinCategoryCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCabinCategory.create({ data: input });
    }),

  update: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), data: cruiseCabinCategoryUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCabinCategory.update({ where: { id: input.id }, data: input.data });
    }),

  delete: p("nile-cruises:boat:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCabinCategory.delete({ where: { id: input.id } });
    }),
});
