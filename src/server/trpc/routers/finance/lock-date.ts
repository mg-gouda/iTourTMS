import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

export const lockDateRouter = createTRPCRouter({
  get: p("finance:lockDate:read").query(async ({ ctx }) => {
    return ctx.db.accountLockDate.findUnique({
      where: { companyId: ctx.companyId },
    });
  }),

  upsert: p("finance:lockDate:update")
    .input(z.object({
      taxLockDate: z.string().optional().nullable(),
      saleLockDate: z.string().optional().nullable(),
      purchaseLockDate: z.string().optional().nullable(),
      hardLockDate: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data = {
        taxLockDate: input.taxLockDate ? new Date(input.taxLockDate) : null,
        saleLockDate: input.saleLockDate ? new Date(input.saleLockDate) : null,
        purchaseLockDate: input.purchaseLockDate ? new Date(input.purchaseLockDate) : null,
        hardLockDate: input.hardLockDate ? new Date(input.hardLockDate) : null,
      };
      return ctx.db.accountLockDate.upsert({
        where: { companyId: ctx.companyId },
        create: { companyId: ctx.companyId, ...data },
        update: data,
      });
    }),
});
