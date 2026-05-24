import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseContractCreateSchema, cruiseContractUpdateSchema, cruiseSaveChildPoliciesSchema } from "@/lib/validations/nile-cruises";
import { createId } from "@paralleldrive/cuid2";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

async function nextCode(db: Parameters<typeof p>[0] extends never ? never : Awaited<ReturnType<typeof p>>["_def"] extends never ? never : any, companyId: string): Promise<string> {
  return "NC-CT-00001";
}

export const cruiseContractRouter = createTRPCRouter({
  list: p("nile-cruises:contract:read").query(async ({ ctx }) => {
    return ctx.db.cruiseContract.findMany({
      where: { companyId: ctx.companyId, isTemplate: false },
      include: {
        boat: { select: { id: true, name: true, code: true } },
        _count: { select: { seasons: true, departures: true, bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: p("nile-cruises:contract:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseContract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          boat: { select: { id: true, name: true, code: true, cabinCategories: { orderBy: { sortOrder: "asc" } } } },
          cancellationPolicy: { include: { tiers: { orderBy: { daysBefore: "desc" } } } },
          seasons: { orderBy: { dateFrom: "asc" } },
          marketAssignments: { include: { market: true } },
          tourOperators: { include: { tourOperator: true } },
          childPolicies: { orderBy: { sortOrder: "asc" } },
          offers: { where: { active: true }, orderBy: { sortOrder: "asc" } },
          galaMeals: { orderBy: { applicableDate: "asc" } },
          _count: { select: { departures: true, bookings: true } },
        },
      });
    }),

  create: p("nile-cruises:contract:create")
    .input(cruiseContractCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate code via Sequence
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "cruise_contract" } },
        update: { nextNumber: { increment: 1 } },
        create: { companyId: ctx.companyId, code: "cruise_contract", prefix: "NC-CT", nextNumber: 2, padding: 5 },
      });
      const code = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
      return ctx.db.cruiseContract.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          code,
          validFrom: new Date(input.validFrom as string),
          validTo: new Date(input.validTo as string),
        },
      });
    }),

  update: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string(), data: cruiseContractUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.validFrom) data.validFrom = new Date(data.validFrom as string);
      if (data.validTo) data.validTo = new Date(data.validTo as string);
      return ctx.db.cruiseContract.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: data as Parameters<typeof ctx.db.cruiseContract.update>[0]["data"],
      });
    }),

  delete: p("nile-cruises:contract:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContract.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  post: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContract.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { status: "POSTED", postedAt: new Date() },
      });
    }),

  publish: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContract.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    }),

  clone: p("nile-cruises:contract:create")
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.cruiseContract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "cruise_contract" } },
        update: { nextNumber: { increment: 1 } },
        create: { companyId: ctx.companyId, code: "cruise_contract", prefix: "NC-CT", nextNumber: 2, padding: 5 },
      });
      const code = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
      const { id: _id, code: _code, status: _status, postedAt: _pa, publishedAt: _pua, ...rest } = source;
      return ctx.db.cruiseContract.create({
        data: {
          ...rest,
          name: input.name,
          code,
          status: "DRAFT",
          parentContractId: source.id,
          postedAt: null,
          publishedAt: null,
        },
      });
    }),

  toggleInclusion: p("nile-cruises:contract:update")
    .input(z.object({
      id: z.string(),
      field: z.enum(["includesFullBoard","includesSightseeing","includesSoftDrinks","includesVisitFees","includesTransfers","includesDomesticFlight"]),
      value: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContract.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { [input.field]: input.value },
      });
    }),

  listMarkets: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseContractMarket.findMany({
        where: { contractId: input.contractId },
        include: { market: true },
      });
    }),

  addMarket: p("nile-cruises:contract:update")
    .input(z.object({ contractId: z.string(), marketId: z.string(), markup: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContractMarket.upsert({
        where: { contractId_marketId: { contractId: input.contractId, marketId: input.marketId } },
        update: { markup: input.markup ?? null, active: true },
        create: input,
      });
    }),

  removeMarket: p("nile-cruises:contract:update")
    .input(z.object({ contractId: z.string(), marketId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContractMarket.delete({
        where: { contractId_marketId: { contractId: input.contractId, marketId: input.marketId } },
      });
    }),

  listTOs: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseContractTourOperator.findMany({
        where: { contractId: input.contractId },
        include: { tourOperator: { select: { id: true, name: true, code: true } } },
      });
    }),

  addTO: p("nile-cruises:contract:update")
    .input(z.object({
      contractId: z.string(),
      tourOperatorId: z.string(),
      markup: z.number().optional(),
      marketingContribution: z.number().optional(),
      commissionPercent: z.number().optional(),
      paymentTermDays: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContractTourOperator.upsert({
        where: { contractId_tourOperatorId: { contractId: input.contractId, tourOperatorId: input.tourOperatorId } },
        update: { ...input, active: true },
        create: input,
      });
    }),

  removeTO: p("nile-cruises:contract:update")
    .input(z.object({ contractId: z.string(), tourOperatorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContractTourOperator.delete({
        where: { contractId_tourOperatorId: { contractId: input.contractId, tourOperatorId: input.tourOperatorId } },
      });
    }),

  listChildPolicies: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseChildPolicy.findMany({
        where: { contractId: input.contractId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  saveChildPolicies: p("nile-cruises:contract:update")
    .input(cruiseSaveChildPoliciesSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseChildPolicy.deleteMany({ where: { contractId: input.contractId } });
      if (input.policies.length === 0) return { count: 0 };
      return ctx.db.cruiseChildPolicy.createMany({
        data: input.policies.map((p) => ({ ...p, contractId: input.contractId })),
      });
    }),

  verify: p("nile-cruises:contract:read")
    .input(z.object({
      contractId: z.string(),
      cabinCategoryId: z.string(),
      occupancy: z.number().int(),
      embarkDate: z.string(),
      disembarkDate: z.string(),
      marketId: z.string().optional(),
      adults: z.number().int().min(1),
      children: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Simplified verification: find base rate and return breakdown
      const contract = await ctx.db.cruiseContract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        include: { seasons: true },
      });
      const embark = new Date(input.embarkDate);
      const season = contract.seasons.find((s) => s.dateFrom <= embark && s.dateTo >= embark);
      if (!season) return { error: "No season found for this date range", rate: null };
      const baseRate = await ctx.db.cruiseBaseRate.findFirst({
        where: {
          contractId: input.contractId,
          seasonId: season.id,
          cabinCategoryId: input.cabinCategoryId,
          marketId: input.marketId ?? null,
        },
      });
      const nights = Math.ceil((new Date(input.disembarkDate).getTime() - embark.getTime()) / 86400000);
      return {
        season,
        baseRate,
        nights,
        total: baseRate ? Number(baseRate.ratePerPaxPerNight) * input.adults * nights : null,
      };
    }),

  listVerificationResults: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Stored in a JSON-compatible way via rateVerifications table if applicable
      // For now return empty list — rate verification results are ephemeral in this module
      return [];
    }),

  deleteVerificationResult: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return { id: input.id };
    }),
});
