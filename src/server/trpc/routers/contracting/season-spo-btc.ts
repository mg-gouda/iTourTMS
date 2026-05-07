import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const seasonSpoBtcRouter = createTRPCRouter({
  listBySpo: proc
    .input(z.object({ spoId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership via SPO → contract → company
      const spo = await ctx.db.contractSeasonSpo.findFirstOrThrow({
        where: { id: input.spoId },
        include: { contract: { select: { companyId: true } } },
      });
      if (spo.contract.companyId !== ctx.companyId) throw new Error("Not found");
      return ctx.db.contractSeasonSpoBtc.findMany({
        where: { spoId: input.spoId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  upsert: proc
    .input(z.object({
      id: z.string().nullish(),
      spoId: z.string().min(1),
      dateFrom: z.string().min(1),
      dateTo: z.string().min(1),
      active: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const spo = await ctx.db.contractSeasonSpo.findFirstOrThrow({
        where: { id: input.spoId },
        include: { contract: { select: { companyId: true } } },
      });
      if (spo.contract.companyId !== ctx.companyId) throw new Error("Not found");

      const data = {
        spoId: input.spoId,
        dateFrom: new Date(input.dateFrom),
        dateTo: new Date(input.dateTo),
        active: input.active,
        sortOrder: input.sortOrder,
      };

      if (input.id) {
        return ctx.db.contractSeasonSpoBtc.update({ where: { id: input.id }, data });
      }
      return ctx.db.contractSeasonSpoBtc.create({ data });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.contractSeasonSpoBtc.findFirstOrThrow({
        where: { id: input.id },
        include: { spo: { include: { contract: { select: { companyId: true } } } } },
      });
      if (row.spo.contract.companyId !== ctx.companyId) throw new Error("Not found");
      return ctx.db.contractSeasonSpoBtc.delete({ where: { id: input.id } });
    }),
});
