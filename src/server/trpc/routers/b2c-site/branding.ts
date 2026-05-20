import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { brandingSchema } from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const b2cSiteBrandingRouter = createTRPCRouter({
  get: p("b2c-site:branding:read").query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.publicSiteBranding.findUnique({ where: { companyId } });
  }),

  update: p("b2c-site:branding:update")
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
