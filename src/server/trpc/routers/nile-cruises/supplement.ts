import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBulkSaveSupplementsSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseSupplementRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string(), type: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseSupplement.findMany({
        where: {
          contractId: input.contractId,
          ...(input.type ? { type: input.type as never } : {}),
        },
        include: {
          season: true,
          cabinCategory: true,
          market: { select: { id: true, name: true } },
        },
        orderBy: { season: { dateFrom: "asc" } },
      });
    }),

  bulkSaveByType: p("nile-cruises:contract:update")
    .input(cruiseBulkSaveSupplementsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseSupplement.deleteMany({
        where: { contractId: input.contractId, type: input.type },
      });
      if (input.supplements.length === 0) return { count: 0 };
      return ctx.db.cruiseSupplement.createMany({
        data: input.supplements.map((s) => ({
          ...s,
          contractId: input.contractId,
          type: input.type,
        })),
      });
    }),

  getMatrixByType: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string(), type: z.string() }))
    .query(async ({ ctx, input }) => {
      const [supplements, seasons] = await Promise.all([
        ctx.db.cruiseSupplement.findMany({
          where: { contractId: input.contractId, type: input.type as never },
        }),
        ctx.db.cruiseSeason.findMany({
          where: { contractId: input.contractId },
          orderBy: { dateFrom: "asc" },
        }),
      ]);
      return { supplements, seasons };
    }),
});
