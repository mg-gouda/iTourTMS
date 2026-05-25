import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseEmbarkDaySaveSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseEmbarkDayRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseContractEmbarkDay.findMany({
        where: { contractId: input.contractId },
        orderBy: [{ durationNights: "asc" }, { dayOfWeek: "asc" }],
      });
    }),

  saveForDuration: p("nile-cruises:contract:update")
    .input(cruiseEmbarkDaySaveSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseContractEmbarkDay.deleteMany({
        where: { contractId: input.contractId, durationNights: input.durationNights },
      });
      if (input.days.length === 0) return { count: 0 };
      return ctx.db.cruiseContractEmbarkDay.createMany({
        data: input.days.map((day) => ({
          contractId: input.contractId,
          durationNights: input.durationNights,
          dayOfWeek: day,
        })),
      });
    }),
});
