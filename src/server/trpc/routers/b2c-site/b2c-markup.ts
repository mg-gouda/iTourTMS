import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  b2cMarkupRuleCreateSchema,
  b2cMarkupRuleUpdateSchema,
} from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const b2cMarkupRouter = createTRPCRouter({
  list: p("b2c-site:markup:read").query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.b2cMarkupRule.findMany({
      where: { companyId },
      include: {
        tiers: { orderBy: { sortOrder: "asc" } },
        destination: { select: { id: true, name: true } },
        hotel: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: p("b2c-site:markup:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const rule = await ctx.db.b2cMarkupRule.findFirst({
        where: { id: input.id, companyId },
        include: {
          tiers: { orderBy: { sortOrder: "asc" } },
          destination: { select: { id: true, name: true } },
          hotel: { select: { id: true, name: true, code: true } },
        },
      });
      if (!rule) throw new TRPCError({ code: "NOT_FOUND" });
      return rule;
    }),

  create: p("b2c-site:markup:create")
    .input(b2cMarkupRuleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { tiers, ...ruleData } = input;

      return ctx.db.b2cMarkupRule.create({
        data: {
          companyId,
          ...ruleData,
          destinationId: ruleData.destinationId || null,
          hotelId: ruleData.hotelId || null,
          tiers: {
            create: tiers.map((t, i) => ({
              dateFrom: new Date(t.dateFrom),
              dateTo: new Date(t.dateTo),
              markupType: t.markupType,
              value: t.value,
              sortOrder: t.sortOrder ?? i,
            })),
          },
        },
        include: { tiers: true },
      });
    }),

  update: p("b2c-site:markup:update")
    .input(b2cMarkupRuleUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, tiers, ...ruleData } = input;

      return ctx.db.$transaction(async (tx) => {
        // Update rule fields — updateMany so the companyId predicate applies;
        // count === 0 means the rule is missing or owned by another tenant, and
        // must be rejected before the tier deleteMany below runs.
        const { count } = await tx.b2cMarkupRule.updateMany({
          where: { id, companyId },
          data: {
            ...ruleData,
            destinationId: ruleData.destinationId ?? undefined,
            hotelId: ruleData.hotelId ?? undefined,
          },
        });
        if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });

        // Replace tiers if provided
        if (tiers) {
          await tx.b2cMarkupTier.deleteMany({ where: { ruleId: id } });
          if (tiers.length > 0) {
            await tx.b2cMarkupTier.createMany({
              data: tiers.map((t, i) => ({
                ruleId: id,
                dateFrom: new Date(t.dateFrom),
                dateTo: new Date(t.dateTo),
                markupType: t.markupType,
                value: t.value,
                sortOrder: t.sortOrder ?? i,
              })),
            });
          }
        }

        return tx.b2cMarkupRule.findUniqueOrThrow({
          where: { id },
          include: { tiers: { orderBy: { sortOrder: "asc" } } },
        });
      });
    }),

  delete: p("b2c-site:markup:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { count } = await ctx.db.b2cMarkupRule.deleteMany({
        where: { id: input.id, companyId },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
});
