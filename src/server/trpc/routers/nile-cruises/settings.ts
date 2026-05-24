import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseSettingsRouter = createTRPCRouter({
  getSequences: p("nile-cruises:settings:read")
    .query(async ({ ctx }) => {
      return ctx.db.sequence.findMany({
        where: {
          companyId: ctx.companyId,
          code: { in: ["cruise_contract", "cruise_departure", "cruise_booking", "cruise_voucher"] },
        },
      });
    }),

  updateSequence: p("nile-cruises:settings:update")
    .input(z.object({
      code: z.enum(["cruise_contract", "cruise_departure", "cruise_booking", "cruise_voucher"]),
      prefix: z.string().min(1).max(10),
      padding: z.number().int().min(4).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sequence.update({
        where: { companyId_code: { companyId: ctx.companyId, code: input.code } },
        data: { prefix: input.prefix, padding: input.padding },
      });
    }),

  getDefaultSettings: p("nile-cruises:settings:read")
    .query(async () => {
      return null;
    }),

  listPermissions: p("nile-cruises:settings:read")
    .query(async ({ ctx }) => {
      return ctx.db.permission.findMany({
        where: { code: { startsWith: "nile-cruises:" } },
        orderBy: { code: "asc" },
      });
    }),

  ensureSequences: p("nile-cruises:settings:update")
    .mutation(async ({ ctx }) => {
      const defaults = [
        { code: "cruise_contract", prefix: "NC-CT", padding: 5 },
        { code: "cruise_departure", prefix: "NC-DEP", padding: 5 },
        { code: "cruise_booking", prefix: "NC-BK", padding: 5 },
        { code: "cruise_voucher", prefix: "NC-VC", padding: 5 },
      ];

      const results = await Promise.all(
        defaults.map((d) =>
          ctx.db.sequence.upsert({
            where: { companyId_code: { companyId: ctx.companyId, code: d.code } },
            update: {},
            create: {
              companyId: ctx.companyId,
              code: d.code,
              prefix: d.prefix,
              nextNumber: 1,
              padding: d.padding,
            },
          })
        )
      );

      return results;
    }),
});
