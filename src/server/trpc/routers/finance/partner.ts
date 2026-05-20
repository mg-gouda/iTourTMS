import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

const partnerCreateSchema = z.object({
  type: z.enum(["customer", "supplier"]),
  isCompany: z.boolean().default(false),
  name: z.string().min(1, "Name is required"),
  titleId: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  taxId: z.string().optional().or(z.literal("")),
  street: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  stateId: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  countryId: z.string().optional().or(z.literal("")),
  paymentTermId: z.string().optional().or(z.literal("")),
  accountReceivableId: z.string().optional().or(z.literal("")),
  accountPayableId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

const partnerUpdateSchema = partnerCreateSchema.partial().omit({ type: true });

export const partnerRouter = createTRPCRouter({
  list: p("finance:partner:read")
    .input(z.object({
      type: z.enum(["customer", "supplier"]),
      search: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.partner.findMany({
        where: {
          companyId: ctx.companyId,
          type: input.type,
          isActive: input.isActive ?? true,
          ...(input.search ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" as const } },
              { email: { contains: input.search, mode: "insensitive" as const } },
              { phone: { contains: input.search, mode: "insensitive" as const } },
              { taxId: { contains: input.search, mode: "insensitive" as const } },
            ],
          } : {}),
        },
        include: {
          country: { select: { id: true, name: true } },
          paymentTerm: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      });
    }),

  listAll: p("finance:partner:read")
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.partner.findMany({
        where: {
          companyId: ctx.companyId,
          isActive: true,
          ...(input?.search ? {
            name: { contains: input.search, mode: "insensitive" as const },
          } : {}),
        },
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      });
    }),

  getById: p("finance:partner:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const partner = await ctx.db.partner.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          title: true,
          country: { select: { id: true, name: true, code: true } },
          state: { select: { id: true, name: true } },
          paymentTerm: { select: { id: true, name: true } },
          accountReceivable: { select: { id: true, code: true, name: true } },
          accountPayable: { select: { id: true, code: true, name: true } },
        },
      });
      if (!partner) throw new TRPCError({ code: "NOT_FOUND" });
      return partner;
    }),

  create: p("finance:partner:create")
    .input(partnerCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.partner.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          titleId: input.titleId || null,
          stateId: input.stateId || null,
          countryId: input.countryId || null,
          paymentTermId: input.paymentTermId || null,
          accountReceivableId: input.accountReceivableId || null,
          accountPayableId: input.accountPayableId || null,
        },
      });
    }),

  update: p("finance:partner:update")
    .input(z.object({ id: z.string(), data: partnerUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const partner = await ctx.db.partner.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!partner) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.partner.update({
        where: { id: input.id },
        data: {
          ...input.data,
          titleId: input.data.titleId !== undefined ? (input.data.titleId || null) : undefined,
          stateId: input.data.stateId !== undefined ? (input.data.stateId || null) : undefined,
          countryId: input.data.countryId !== undefined ? (input.data.countryId || null) : undefined,
          paymentTermId: input.data.paymentTermId !== undefined ? (input.data.paymentTermId || null) : undefined,
          accountReceivableId: input.data.accountReceivableId !== undefined ? (input.data.accountReceivableId || null) : undefined,
          accountPayableId: input.data.accountPayableId !== undefined ? (input.data.accountPayableId || null) : undefined,
        },
      });
    }),

  toggleActive: p("finance:partner:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const partner = await ctx.db.partner.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!partner) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.partner.update({
        where: { id: input.id },
        data: { isActive: !partner.isActive },
      });
    }),

  // Aggregate stats across ALL partners of a given type (for list pages)
  getAggregateStats: p("finance:partner:read")
    .input(z.object({ partnerType: z.enum(["customer", "supplier"]) }))
    .query(async ({ ctx, input }) => {
      const cid = ctx.companyId;
      const ptype = input.partnerType;

      const [
        salesCount,
        salesAgg,
        invoicedAgg,
        vendorBillsAgg,
        dueAgg,
        purchasesCount,
        purchasesAgg,
        contractsCount,
      ] = await Promise.all([
        ctx.db.move.count({
          where: { companyId: cid, moveType: "OUT_INVOICE", partner: { type: ptype } },
        }),
        ctx.db.move.aggregate({
          where: { companyId: cid, moveType: "OUT_INVOICE", partner: { type: ptype } },
          _sum: { amountTotal: true },
        }),
        ctx.db.move.aggregate({
          where: { companyId: cid, moveType: "OUT_INVOICE", state: "POSTED", partner: { type: ptype } },
          _sum: { amountTotal: true },
        }),
        ctx.db.move.aggregate({
          where: { companyId: cid, moveType: "IN_INVOICE", state: "POSTED", partner: { type: ptype } },
          _sum: { amountTotal: true },
        }),
        ctx.db.move.aggregate({
          where: { companyId: cid, state: "POSTED", partner: { type: ptype } },
          _sum: { amountResidual: true },
        }),
        ctx.db.move.count({
          where: { companyId: cid, moveType: "IN_INVOICE", partner: { type: ptype } },
        }),
        ctx.db.move.aggregate({
          where: { companyId: cid, moveType: "IN_INVOICE", partner: { type: ptype } },
          _sum: { amountTotal: true },
        }),
        ctx.db.crmBooking.count({
          where: { companyId: cid, customer: { partner: { type: ptype } } },
        }),
      ]);

      return {
        salesCount,
        salesAmount: Number(salesAgg._sum.amountTotal ?? 0),
        invoicedAmount: Number(invoicedAgg._sum.amountTotal ?? 0),
        vendorBillsAmount: Number(vendorBillsAgg._sum.amountTotal ?? 0),
        dueAmount: Number(dueAgg._sum.amountResidual ?? 0),
        purchasesCount,
        purchasesAmount: Number(purchasesAgg._sum.amountTotal ?? 0),
        contractsCount,
      };
    }),

  // Rich stats for a partner — 6 KPI cards
  getStats: p("finance:partner:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cid = ctx.companyId;
      const pid = input.id;

      const [
        salesCount,
        salesAgg,
        invoicedAgg,
        vendorBillsAgg,
        dueAgg,
        purchasesCount,
        purchasesAgg,
        contractsCount,
      ] = await Promise.all([
        // Sales: total OUT_INVOICE count (all states)
        ctx.db.move.count({
          where: { companyId: cid, partnerId: pid, moveType: "OUT_INVOICE" },
        }),
        // Sales total amount (all states)
        ctx.db.move.aggregate({
          where: { companyId: cid, partnerId: pid, moveType: "OUT_INVOICE" },
          _sum: { amountTotal: true },
        }),
        // Invoiced: POSTED OUT_INVOICE amountTotal
        ctx.db.move.aggregate({
          where: { companyId: cid, partnerId: pid, moveType: "OUT_INVOICE", state: "POSTED" },
          _sum: { amountTotal: true },
        }),
        // Vendor Bills: POSTED IN_INVOICE amountTotal
        ctx.db.move.aggregate({
          where: { companyId: cid, partnerId: pid, moveType: "IN_INVOICE", state: "POSTED" },
          _sum: { amountTotal: true },
        }),
        // Due: all POSTED moves amountResidual (outstanding balance)
        ctx.db.move.aggregate({
          where: { companyId: cid, partnerId: pid, state: "POSTED" },
          _sum: { amountResidual: true },
        }),
        // Purchases: total IN_INVOICE count (all states)
        ctx.db.move.count({
          where: { companyId: cid, partnerId: pid, moveType: "IN_INVOICE" },
        }),
        // Purchases total amount (all states)
        ctx.db.move.aggregate({
          where: { companyId: cid, partnerId: pid, moveType: "IN_INVOICE" },
          _sum: { amountTotal: true },
        }),
        // Contracts: CRM bookings linked via this partner's CrmCustomer records
        ctx.db.crmBooking.count({
          where: { companyId: cid, customer: { partnerId: pid } },
        }),
      ]);

      return {
        salesCount,
        salesAmount: Number(salesAgg._sum.amountTotal ?? 0),
        invoicedAmount: Number(invoicedAgg._sum.amountTotal ?? 0),
        vendorBillsAmount: Number(vendorBillsAgg._sum.amountTotal ?? 0),
        dueAmount: Number(dueAgg._sum.amountResidual ?? 0),
        purchasesCount,
        purchasesAmount: Number(purchasesAgg._sum.amountTotal ?? 0),
        contractsCount,
        // kept for backward compat
        outstanding: Number(dueAgg._sum.amountResidual ?? 0),
        totalPayments: 0,
      };
    }),
});
