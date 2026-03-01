import { z } from "zod";

import { priceItemCreateSchema, priceItemUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const priceItemRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.ttPriceItem.findMany({
      where: { companyId: ctx.companyId },
      include: {
        vehicleType: { select: { id: true, name: true, code: true } },
        fromZone: { select: { id: true, name: true, code: true } },
        toZone: { select: { id: true, name: true, code: true } },
        currency: { select: { id: true, code: true, symbol: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttPriceItem.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          fromZone: { select: { id: true, name: true, code: true } },
          toZone: { select: { id: true, name: true, code: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          overrides: {
            include: { partner: { select: { id: true, name: true } } },
          },
        },
      });
    }),

  create: proc
    .input(priceItemCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttPriceItem.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: priceItemUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttPriceItem.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttPriceItem.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
