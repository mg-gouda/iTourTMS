import { ttSettingsUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("traffic", code);

export const settingsRouter = createTRPCRouter({
  get: p("traffic:settings:read").query(async ({ ctx }) => {
    return ctx.db.ttSettings.findUnique({
      where: { companyId: ctx.companyId },
    });
  }),

  update: p("traffic:settings:update")
    .input(ttSettingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttSettings.upsert({
        where: { companyId: ctx.companyId },
        update: input,
        create: { ...input, companyId: ctx.companyId },
      });
    }),
});
