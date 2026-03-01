import { z } from "zod";

import { partnerPriceOverrideCreateSchema, partnerPriceOverrideUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const partnerPriceOverrideRouter = createTRPCRouter({
  list: proc
    .input(z.object({ partnerId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.ttPartnerPriceOverride.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.partnerId ? { partnerId: input.partnerId } : {}),
        },
        include: {
          partner: { select: { id: true, name: true } },
          priceItem: {
            include: {
              vehicleType: { select: { id: true, name: true } },
              fromZone: { select: { id: true, name: true } },
              toZone: { select: { id: true, name: true } },
              currency: { select: { id: true, code: true, symbol: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: proc
    .input(partnerPriceOverrideCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttPartnerPriceOverride.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: partnerPriceOverrideUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttPartnerPriceOverride.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttPartnerPriceOverride.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
