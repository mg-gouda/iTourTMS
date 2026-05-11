import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Decimal } from "decimal.js";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { opsComponentBulkSaveSchema } from "@/lib/validations/tour-ops";

const tourOpsProcedure = moduleProcedure("tour-ops");

function computeComponent(c: {
  type: string;
  pricingBasis: string;
  nights: number;
  qty: number;
  unitCost: number;
  exchangeRate: number;
  markupType: string;
  markupValue: number;
}) {
  const hasNights = c.type === "ACCOMMODATION" || c.type === "NILE_CRUISE";
  const nightsFactor = hasNights ? Math.max(1, c.nights) : 1;

  // BULK: unitCost × nights × exchangeRate (qty is informational)
  // PER_PERSON: qty × unitCost × nights × exchangeRate
  const totalCost = c.pricingBasis === "BULK"
    ? new Decimal(c.unitCost).times(nightsFactor).times(c.exchangeRate).toDecimalPlaces(2)
    : new Decimal(c.qty).times(c.unitCost).times(nightsFactor).times(c.exchangeRate).toDecimalPlaces(2);

  let sellingPrice: Decimal;
  if (c.markupType === "PERCENTAGE") {
    sellingPrice = totalCost.times(new Decimal(1).plus(new Decimal(c.markupValue).div(100))).toDecimalPlaces(2);
  } else {
    sellingPrice = totalCost.plus(c.markupValue).toDecimalPlaces(2);
  }
  return { totalCost, sellingPrice };
}

export const opsComponentRouter = createTRPCRouter({
  bulkSave: tourOpsProcedure
    .input(opsComponentBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db.opsPackage.findFirst({
        where: { id: input.packageId, companyId: ctx.companyId },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.$transaction(async (tx) => {
        await tx.opsPackageComponent.deleteMany({ where: { packageId: input.packageId } });

        if (input.components.length > 0) {
          await tx.opsPackageComponent.createMany({
            data: input.components.map((c, i) => {
              const { totalCost, sellingPrice } = computeComponent(c);
              return {
                packageId: input.packageId,
                type: c.type,
                description: c.description,
                supplierId: c.supplierId || null,
                serviceDate: c.serviceDate ? new Date(c.serviceDate) : null,
                pricingBasis: c.pricingBasis,
                nights: c.nights,
                qty: c.qty,
                unitCost: c.unitCost,
                currency: c.currency,
                exchangeRate: c.exchangeRate,
                totalCost: totalCost.toNumber(),
                markupType: c.markupType,
                markupValue: c.markupValue,
                sellingPrice: sellingPrice.toNumber(),
                refModuleEntityId: c.refModuleEntityId || null,
                refModuleEntityType: c.refModuleEntityType || null,
                notes: c.notes || null,
                sortOrder: c.sortOrder ?? i,
              };
            }),
          });
        }

        const agg = await tx.opsPackageComponent.aggregate({
          where: { packageId: input.packageId },
          _sum: { totalCost: true },
        });
        await tx.opsPackage.update({
          where: { id: input.packageId },
          data: { totalCost: agg._sum.totalCost ?? 0 },
        });
      });

      return ctx.db.opsPackageComponent.findMany({
        where: { packageId: input.packageId },
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  reorder: tourOpsProcedure
    .input(z.object({ packageId: z.string(), ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.ids.map((id, i) =>
          ctx.db.opsPackageComponent.update({ where: { id }, data: { sortOrder: i } })
        )
      );
    }),
});
