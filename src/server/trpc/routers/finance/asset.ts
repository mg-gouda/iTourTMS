import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

function buildDepreciationSchedule(
  originalValue: Decimal,
  salvageValue: Decimal,
  usefulLifeYears: number,
  acquisitionDate: Date,
  method: string,
): { name: string; date: Date; depreciation: Decimal; residual: Decimal }[] {
  const depreciable = originalValue.minus(salvageValue);
  const annualDep = depreciable.div(usefulLifeYears);
  const lines = [];
  let residual = originalValue;
  for (let y = 1; y <= usefulLifeYears; y++) {
    const date = new Date(acquisitionDate);
    date.setFullYear(date.getFullYear() + y);
    residual = residual.minus(annualDep);
    lines.push({ name: `Depreciation ${y}/${usefulLifeYears}`, date, depreciation: annualDep, residual: residual.lt(salvageValue) ? salvageValue : residual });
  }
  return lines;
}

export const assetRouter = createTRPCRouter({
  list: financeProcedure
    .input(z.object({ state: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.accountAsset.findMany({
        where: { companyId: ctx.session.user.companyId, ...(input.state ? { state: input.state as any } : {}) },
        include: {
          account: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, name: true } },
          _count: { select: { depreciationLines: true } },
        },
        orderBy: { acquisitionDate: "desc" },
      });
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const asset = await (ctx.db.accountAsset as any).findFirst({
        where: { id: input.id, companyId: ctx.session.user.companyId },
        include: {
          account: { select: { id: true, code: true, name: true } },
          depreciationAccount: { select: { id: true, code: true, name: true } },
          accumulationAccount: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, name: true } },
          depreciationLines: { orderBy: { date: "asc" } },
        },
      });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      return asset;
    }),

  create: financeProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      accountId: z.string(),
      depreciationAccountId: z.string().optional(),
      accumulationAccountId: z.string().optional(),
      partnerId: z.string().optional(),
      method: z.enum(["STRAIGHT_LINE", "DEGRESSIVE", "DEGRESSIVE_THEN_STRAIGHT_LINE"]).default("STRAIGHT_LINE"),
      originalValue: z.number().positive(),
      salvageValue: z.number().min(0).default(0),
      usefulLifeYears: z.number().int().min(1).default(5),
      acquisitionDate: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { acquisitionDate, originalValue, salvageValue, ...rest } = input;
      return ctx.db.accountAsset.create({
        data: {
          ...rest,
          companyId: ctx.session.user.companyId,
          acquisitionDate: new Date(acquisitionDate),
          originalValue: new Decimal(originalValue),
          salvageValue: new Decimal(salvageValue),
          netBookValue: new Decimal(originalValue),
        },
      });
    }),

  update: financeProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      notes: z.string().optional().nullable(),
      depreciationAccountId: z.string().optional().nullable(),
      accumulationAccountId: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, notes, depreciationAccountId, accumulationAccountId, ...rest } = input;
      return ctx.db.accountAsset.update({
        where: { id, companyId: ctx.session.user.companyId },
        data: {
          ...rest,
          notes: notes ?? undefined,
          depreciationAccountId: depreciationAccountId ?? undefined,
          accumulationAccountId: accumulationAccountId ?? undefined,
        },
      });
    }),

  compute: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await (ctx.db.accountAsset as any).findFirst({
        where: { id: input.id, companyId: ctx.session.user.companyId },
      });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      if (asset.state !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "Asset must be in DRAFT state" });

      const lines = buildDepreciationSchedule(
        new Decimal(asset.originalValue.toString()),
        new Decimal(asset.salvageValue.toString()),
        asset.usefulLifeYears,
        asset.acquisitionDate,
        asset.method,
      );

      await ctx.db.accountAssetLine.deleteMany({ where: { assetId: input.id } });
      await ctx.db.accountAssetLine.createMany({
        data: lines.map((l) => ({
          assetId: input.id,
          name: l.name,
          date: l.date,
          depreciation: l.depreciation,
          residual: l.residual,
        })),
      });
      return ctx.db.accountAsset.update({
        where: { id: input.id },
        data: { state: "OPEN" },
      });
    }),

  close: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountAsset.update({
        where: { id: input.id, companyId: ctx.session.user.companyId },
        data: { state: "CLOSED" },
      });
    }),
});
