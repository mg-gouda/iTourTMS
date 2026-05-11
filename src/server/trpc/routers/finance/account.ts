import { z } from "zod";

import { accountGroupSchema, accountSchema } from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const accountRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z.object({
        search: z.string().optional(),
        accountType: z.string().optional(),
        groupId: z.string().optional(),
        includeDeprecated: z.boolean().default(false),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = input ?? ({} as NonNullable<typeof input>);
      const where: Record<string, unknown> = { companyId: ctx.companyId };

      if (filters.search) {
        where.OR = [
          { code: { contains: filters.search, mode: "insensitive" } },
          { name: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      if (filters.accountType) where.accountType = filters.accountType;
      if (filters.groupId) where.groupId = filters.groupId;
      if (!filters.includeDeprecated) where.deprecated = false;

      const items = await ctx.db.finAccount.findMany({
        where: where as any,
        include: { group: true, tags: true, currency: true },
        orderBy: { code: "asc" },
        take: filters.limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (items.length > filters.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.finAccount.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: { group: true, tags: true, currency: true, defaultTaxes: true },
      });
    }),

  create: financeProcedure
    .input(accountSchema)
    .mutation(async ({ ctx, input }) => {
      const { tagIds, ...data } = input;

      return ctx.db.finAccount.create({
        data: {
          ...data,
          companyId: ctx.companyId,
          tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        },
      });
    }),

  update: financeProcedure
    .input(z.object({ id: z.string() }).merge(accountSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, tagIds, ...data } = input;

      return ctx.db.finAccount.update({
        where: { id },
        data: {
          ...data,
          ...(tagIds !== undefined
            ? { tags: { set: tagIds.map((tid) => ({ id: tid })) } }
            : {}),
        },
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.finAccount.delete({ where: { id: input.id } });
    }),

  // ── Account Groups ──

  listGroups: financeProcedure.query(async ({ ctx }) => {
    return ctx.db.accountGroup.findMany({
      where: { companyId: ctx.companyId },
      include: { parent: true, _count: { select: { accounts: true } } },
      orderBy: { codePrefixStart: "asc" },
    });
  }),

  createGroup: financeProcedure
    .input(accountGroupSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountGroup.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  updateGroup: financeProcedure
    .input(z.object({ id: z.string() }).merge(accountGroupSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.accountGroup.update({ where: { id }, data });
    }),

  deleteGroup: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountGroup.delete({ where: { id: input.id } });
    }),

  // ── Account Tags ──

  listTags: financeProcedure.query(async ({ ctx }) => {
    return ctx.db.accountTag.findMany({ orderBy: { name: "asc" } });
  }),

  createTag: financeProcedure
    .input(z.object({ name: z.string().min(1), color: z.number().default(0) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountTag.create({ data: input });
    }),

  deleteTag: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountTag.delete({ where: { id: input.id } });
    }),

  // ── Tree (all accounts, no pagination) ──

  listTree: financeProcedure.query(async ({ ctx }) => {
    return ctx.db.finAccount.findMany({
      where: { companyId: ctx.companyId, deprecated: false },
      select: {
        id: true,
        code: true,
        name: true,
        accountType: true,
        isGroup: true,
        parentId: true,
        reconcile: true,
        deprecated: true,
        group: { select: { name: true } },
      },
      orderBy: { code: "asc" },
    });
  }),

  // ── Bulk Import ──

  bulkImport: financeProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            code: z.string().min(1).max(20),
            name: z.string().min(1).max(256),
            accountType: z.string().min(1),
            reconcile: z.boolean(),
            deprecated: z.boolean(),
            groupName: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Load ALL account groups for this company (for both name-match and range-match)
      const allGroups = await ctx.db.accountGroup.findMany({
        where: { companyId: ctx.companyId },
        select: { id: true, name: true, codePrefixStart: true, codePrefixEnd: true },
        orderBy: { codePrefixStart: "asc" },
      });

      const groupByName = new Map(allGroups.map((g) => [g.name.toLowerCase(), g.id]));

      // Find best group for an account code by range (codePrefixStart ≤ code ≤ codePrefixEnd)
      function resolveGroupByCode(code: string): string | null {
        // Prefer the most specific (longest prefix) range that matches
        let best: { id: string; prefixLen: number } | null = null;
        for (const g of allGroups) {
          if (code >= g.codePrefixStart && code <= g.codePrefixEnd) {
            const len = g.codePrefixStart.length;
            if (!best || len > best.prefixLen) best = { id: g.id, prefixLen: len };
          }
        }
        return best?.id ?? null;
      }

      // Fetch existing codes to skip duplicates
      const existingCodes = new Set(
        (await ctx.db.finAccount.findMany({
          where: { companyId: ctx.companyId },
          select: { code: true },
        })).map((a) => a.code),
      );

      let created = 0;
      let skipped = 0;
      const unknownGroups: string[] = [];

      for (const row of input.rows) {
        if (existingCodes.has(row.code)) { skipped++; continue; }

        // 1. Explicit name from file  2. Range auto-match
        let groupId: string | null = null;
        if (row.groupName) {
          groupId = groupByName.get(row.groupName.toLowerCase()) ?? null;
          if (!groupId) unknownGroups.push(row.groupName);
        }
        if (!groupId) {
          groupId = resolveGroupByCode(row.code);
        }

        await ctx.db.finAccount.create({
          data: {
            code: row.code,
            name: row.name,
            accountType: row.accountType as never,
            reconcile: row.reconcile,
            deprecated: row.deprecated,
            groupId: groupId ?? undefined,
            companyId: ctx.companyId,
          },
        });
        created++;
      }

      return { created, skipped, unknownGroups: [...new Set(unknownGroups)] };
    }),

  // ── Partner list for invoice/bill partner selection ──

  listPartners: financeProcedure
    .input(
      z.object({
        type: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.partner.findMany({
        where: {
          companyId: ctx.companyId,
          isActive: true,
          ...(input?.type ? { type: input.type as never } : {}),
          ...(input?.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" as const } },
                  { email: { contains: input.search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        select: { id: true, name: true, type: true, email: true },
        orderBy: { name: "asc" },
        take: 200,
      });
    }),
});
