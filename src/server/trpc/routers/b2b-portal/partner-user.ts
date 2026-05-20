import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

export const partnerUserRouter = createTRPCRouter({
  list: p("b2b-portal:partnerUser:read")
    .input(z.object({ tourOperatorId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          companyId: ctx.companyId,
          tourOperatorId: input?.tourOperatorId ?? { not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          tourOperator: { select: { id: true, name: true, code: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: p("b2b-portal:partnerUser:create")
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        tourOperatorId: z.string().min(1),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(input.password, 10);

      const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (existing)
        throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

      return ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hash,
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          isActive: input.isActive,
        },
      });
    }),

  toggleActive: p("b2b-portal:partnerUser:update")
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  resetPassword: p("b2b-portal:partnerUser:manage")
    .input(z.object({ id: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(input.newPassword, 10);
      return ctx.db.user.update({
        where: { id: input.id },
        data: { password: hash },
      });
    }),
});
