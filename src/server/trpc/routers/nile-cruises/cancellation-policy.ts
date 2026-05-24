import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  cruiseCancellationPolicyCreateSchema,
  cruiseCancellationPolicyUpdateSchema,
  cruiseSaveTiersSchema,
} from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseCancellationPolicyRouter = createTRPCRouter({
  list: p("nile-cruises:contract:read").query(async ({ ctx }) => {
    return ctx.db.cruiseCancellationPolicy.findMany({
      where: { companyId: ctx.companyId },
      include: {
        _count: { select: { tiers: true, contracts: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: p("nile-cruises:contract:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseCancellationPolicy.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: { tiers: { orderBy: { daysBefore: "desc" } } },
      });
    }),

  create: p("nile-cruises:contract:create")
    .input(cruiseCancellationPolicyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCancellationPolicy.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string(), data: cruiseCancellationPolicyUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCancellationPolicy.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("nile-cruises:contract:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCancellationPolicy.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  listTiers: p("nile-cruises:contract:read")
    .input(z.object({ policyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseCancellationPolicyTier.findMany({
        where: { policyId: input.policyId },
        orderBy: { daysBefore: "desc" },
      });
    }),

  saveTiers: p("nile-cruises:contract:update")
    .input(cruiseSaveTiersSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseCancellationPolicyTier.deleteMany({ where: { policyId: input.policyId } });
      if (input.tiers.length === 0) return { count: 0 };
      return ctx.db.cruiseCancellationPolicyTier.createMany({
        data: input.tiers.map((t) => ({ ...t, policyId: input.policyId })),
      });
    }),
});
