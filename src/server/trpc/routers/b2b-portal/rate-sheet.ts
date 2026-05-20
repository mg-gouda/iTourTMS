import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

export const rateSheetRouter = createTRPCRouter({
  list: p("b2b-portal:rateSheet:read")
    .input(
      z
        .object({
          tourOperatorId: z.string().optional(),
          contractId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TariffWhereInput = { companyId: ctx.companyId };
      if (input?.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input?.contractId) where.contractId = input.contractId;

      return ctx.db.tariff.findMany({
        where,
        include: {
          contract: { select: { id: true, code: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          markupRule: { select: { id: true, name: true, markupType: true, value: true } },
        },
        orderBy: { generatedAt: "desc" },
      });
    }),

  getById: p("b2b-portal:rateSheet:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tariff = await ctx.db.tariff.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contract: { select: { id: true, code: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          markupRule: true,
        },
      });
      if (!tariff)
        throw new TRPCError({ code: "NOT_FOUND", message: "Rate sheet not found" });
      return tariff;
    }),
});
