import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("b2b-portal");

export const rateSheetRouter = createTRPCRouter({
  list: proc
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

  getById: proc
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
