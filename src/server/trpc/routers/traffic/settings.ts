import { ttSettingsUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const settingsRouter = createTRPCRouter({
  get: proc.query(async ({ ctx }) => {
    return ctx.db.ttSettings.findUnique({
      where: { companyId: ctx.companyId },
    });
  }),

  update: proc
    .input(ttSettingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttSettings.upsert({
        where: { companyId: ctx.companyId },
        update: input,
        create: { ...input, companyId: ctx.companyId },
      });
    }),
});
