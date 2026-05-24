import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseTypeCreateSchema, cruiseTypeUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseTypeRouter = createTRPCRouter({
  list: p("nile-cruises:boat:read").query(async ({ ctx }) => {
    return ctx.db.cruiseType.findMany({
      where: { companyId: ctx.companyId },
      include: { _count: { select: { itineraries: true, departures: true } } },
      orderBy: { name: "asc" },
    });
  }),

  getById: p("nile-cruises:boat:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseType.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  create: p("nile-cruises:boat:create")
    .input(cruiseTypeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseType.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), data: cruiseTypeUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseType.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("nile-cruises:boat:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseType.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
