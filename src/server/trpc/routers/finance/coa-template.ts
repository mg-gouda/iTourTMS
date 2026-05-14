import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, moduleProcedure, protectedProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const coaTemplateRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.coaTemplate.findMany({
      include: {
        _count: { select: { groups: true, accounts: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tpl = await ctx.db.coaTemplate.findUnique({
        where: { id: input.id },
        include: {
          groups: { orderBy: { codePrefixStart: "asc" } },
          accounts: { orderBy: { code: "asc" } },
        },
      });
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });
      return tpl;
    }),

  // Save the calling company's current COA (accounts + groups) as a named template
  saveFromCompany: financeProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      locale: z.string().default("en"),
      overwrite: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;

      const existing = await ctx.db.coaTemplate.findUnique({ where: { name: input.name } });
      if (existing && !input.overwrite) {
        throw new TRPCError({ code: "CONFLICT", message: `Template "${input.name}" already exists. Use overwrite: true to replace it.` });
      }

      // Load company's groups and accounts
      const [groups, accounts] = await Promise.all([
        ctx.db.accountGroup.findMany({
          where: { companyId },
          select: { name: true, codePrefixStart: true, codePrefixEnd: true },
          orderBy: { codePrefixStart: "asc" },
        }),
        ctx.db.finAccount.findMany({
          where: { companyId },
          select: {
            code: true,
            name: true,
            accountType: true,
            reconcile: true,
            deprecated: true,
            group: { select: { name: true } },
          },
          orderBy: { code: "asc" },
        }),
      ]);

      if (accounts.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No accounts found. Import a chart of accounts first." });
      }

      // Delete existing template if overwriting
      if (existing) await ctx.db.coaTemplate.delete({ where: { id: existing.id } });

      const template = await ctx.db.coaTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          locale: input.locale,
          groups: {
            createMany: {
              data: groups.map((g) => ({
                name: g.name,
                codePrefixStart: g.codePrefixStart,
                codePrefixEnd: g.codePrefixEnd,
              })),
            },
          },
          accounts: {
            createMany: {
              data: accounts.map((a) => ({
                code: a.code,
                name: a.name,
                accountType: a.accountType,
                reconcile: a.reconcile,
                deprecated: a.deprecated,
                groupName: a.group?.name ?? null,
              })),
            },
          },
        },
        include: { _count: { select: { groups: true, accounts: true } } },
      });

      return template;
    }),

  // Apply a template to the calling company (creates groups then accounts, skips duplicates)
  applyToCompany: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      skipExisting: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;

      const tpl = await ctx.db.coaTemplate.findUnique({
        where: { id: input.templateId },
        include: {
          groups: true,
          accounts: { orderBy: { code: "asc" } },
        },
      });
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });

      // Create groups (skip duplicates by name)
      const existingGroupNames = new Set(
        (await ctx.db.accountGroup.findMany({
          where: { companyId },
          select: { name: true },
        })).map((g) => g.name),
      );

      const groupIdMap = new Map<string, string>(); // template group name → new id

      for (const g of tpl.groups) {
        if (existingGroupNames.has(g.name)) {
          const existing = await ctx.db.accountGroup.findFirst({
            where: { companyId, name: g.name },
            select: { id: true },
          });
          if (existing) groupIdMap.set(g.name, existing.id);
        } else {
          const created = await ctx.db.accountGroup.create({
            data: {
              companyId,
              name: g.name,
              codePrefixStart: g.codePrefixStart,
              codePrefixEnd: g.codePrefixEnd,
            },
          });
          groupIdMap.set(g.name, created.id);
        }
      }

      // Create accounts (skip duplicates by code)
      const existingCodes = new Set(
        (await ctx.db.finAccount.findMany({
          where: { companyId },
          select: { code: true },
        })).map((a) => a.code),
      );

      let created = 0;
      let skipped = 0;

      for (const a of tpl.accounts) {
        if (input.skipExisting && existingCodes.has(a.code)) { skipped++; continue; }
        const groupId = a.groupName ? groupIdMap.get(a.groupName) : undefined;
        await ctx.db.finAccount.create({
          data: {
            companyId,
            code: a.code,
            name: a.name,
            accountType: a.accountType as never,
            reconcile: a.reconcile,
            deprecated: a.deprecated,
            groupId: groupId ?? undefined,
          },
        });
        created++;
      }

      return { created, skipped, groups: groupIdMap.size };
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.coaTemplate.delete({ where: { id: input.id } });
    }),
});
