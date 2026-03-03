import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { brandingSchema } from "@/lib/validations/b2c-site";

export const b2cSiteBrandingRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.publicSiteBranding.findUnique({ where: { companyId } });
  }),

  update: protectedProcedure
    .input(brandingSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.publicSiteBranding.upsert({
        where: { companyId },
        create: { companyId, ...input },
        update: input,
      });
    }),
});
