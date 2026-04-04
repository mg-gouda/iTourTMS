import { z } from "zod";

import {
  operationalCostCreateSchema,
  operationalCostUpdateSchema,
} from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const operationalCostRouter = createTRPCRouter({
  list: proc
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttOperationalCost.findMany({
        where: { companyId: ctx.companyId, jobId: input.jobId },
        include: {
          currency: { select: { id: true, code: true, symbol: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: proc
    .input(operationalCostCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttOperationalCost.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: operationalCostUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttOperationalCost.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttOperationalCost.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
