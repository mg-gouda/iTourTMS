import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { dispatchOpsFile } from "@/server/services/tour-ops/dispatch";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);

export const opsDispatchRouter = createTRPCRouter({
  dispatchFile: p("tour-ops:dispatch:manage")
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.opsFile.findFirst({
        where: { id: input.fileId, companyId: ctx.companyId },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });
      if (file.status !== "CONFIRMED" && file.status !== "IN_PROGRESS") {
        throw new TRPCError({ code: "FORBIDDEN", message: "File must be confirmed before dispatch" });
      }
      await dispatchOpsFile(ctx.db, input.fileId, ctx.companyId, ctx.session.user.id);
      return { success: true };
    }),
});
