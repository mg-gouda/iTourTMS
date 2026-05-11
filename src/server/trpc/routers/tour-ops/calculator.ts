import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("tour-ops");

const generatedComponentSchema = z.object({
  type: z.enum([
    "ACCOMMODATION",
    "NILE_CRUISE",
    "TRANSFER",
    "EXCURSION",
    "GUIDANCE",
    "MEAL",
    "MISC",
  ]),
  description: z.string().min(1),
  unitCost: z.number().min(0),
  qty: z.number().min(0).default(1),
  nights: z.number().int().min(1).default(1),
  pricingBasis: z.enum(["PER_PERSON", "BULK"]).default("PER_PERSON"),
  notes: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const opsCalculatorRouter = createTRPCRouter({
  generateComponents: proc
    .input(
      z.object({
        packageId: z.string().min(1),
        components: z.array(generatedComponentSchema).min(1),
        replaceExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db.opsPackage.findFirst({
        where: { id: input.packageId, companyId: ctx.companyId },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.$transaction(async (tx) => {
        if (input.replaceExisting) {
          await tx.opsPackageComponent.deleteMany({
            where: { packageId: input.packageId },
          });
        }

        await tx.opsPackageComponent.createMany({
          data: input.components.map((c, i) => {
            const isNightsBased = c.type === "ACCOMMODATION" || c.type === "NILE_CRUISE";
            const nightsFactor = isNightsBased ? Math.max(1, c.nights) : 1;
            const totalCost =
              c.pricingBasis === "BULK"
                ? new Decimal(c.unitCost).times(nightsFactor).toDecimalPlaces(2)
                : new Decimal(c.qty).times(c.unitCost).times(nightsFactor).toDecimalPlaces(2);

            return {
              packageId: input.packageId,
              type: c.type,
              description: c.description,
              pricingBasis: c.pricingBasis,
              nights: c.nights,
              qty: c.qty,
              unitCost: c.unitCost,
              currency: "USD",
              exchangeRate: 1,
              totalCost: totalCost.toNumber(),
              markupType: "PERCENTAGE" as const,
              markupValue: 0,
              sellingPrice: totalCost.toNumber(),
              notes: c.notes ?? null,
              sortOrder: c.sortOrder ?? i,
            };
          }),
        });

        const agg = await tx.opsPackageComponent.aggregate({
          where: { packageId: input.packageId },
          _sum: { totalCost: true },
        });
        await tx.opsPackage.update({
          where: { id: input.packageId },
          data: { totalCost: agg._sum.totalCost ?? 0 },
        });
      });

      return { success: true };
    }),
});
