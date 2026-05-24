import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseStopSaleCreateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseStopSaleRouter = createTRPCRouter({
  list: p("nile-cruises:contract:read").query(async ({ ctx }) => {
    return ctx.db.cruiseStopSale.findMany({
      where: { companyId: ctx.companyId, active: true },
      include: {
        boat: { select: { id: true, name: true } },
        contract: { select: { id: true, code: true, name: true } },
        departure: { select: { id: true, code: true, embarkDate: true } },
        market: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: p("nile-cruises:contract:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseStopSale.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  create: p("nile-cruises:contract:update")
    .input(cruiseStopSaleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseStopSale.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          createdById: ctx.session.user.id,
          fromDate: new Date(input.fromDate as string),
          toDate: new Date(input.toDate as string),
        },
      });
    }),

  update: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string(), data: cruiseStopSaleCreateSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseStopSale.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  deactivate: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseStopSale.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { active: false },
      });
    }),
});
