import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseChildPolicyBulkSaveSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseChildPolicyRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseChildPolicy.findMany({
        where: { contractId: input.contractId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  bulkSave: p("nile-cruises:contract:update")
    .input(cruiseChildPolicyBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseChildPolicy.deleteMany({ where: { contractId: input.contractId } });
      if (input.policies.length === 0) return { count: 0 };
      return ctx.db.cruiseChildPolicy.createMany({
        data: input.policies.map((p, i) => ({
          ...p,
          contractId: input.contractId,
          sortOrder: i,
        })),
      });
    }),
});
