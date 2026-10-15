import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { forgetBranches } from "@/server/branch-scope";
import { adminProcedure, createTRPCRouter, protectedProcedure } from "@/server/trpc";

const branchInput = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,8}$/, "2–8 letters or digits, e.g. HRG"),
  name: z.string().trim().min(1),
  destinationIds: z.array(z.string()).default([]),
  isHq: z.boolean().default(false),
  active: z.boolean().default(true),
});

/** Everyone in the company who can see all branches has a stale list after any branch edit. */
async function forgetCompany(ctx: { db: import("@prisma/client").PrismaClient; redis: import("ioredis").Redis }, companyId: string) {
  const users = await ctx.db.user.findMany({ where: { companyId }, select: { id: true } });
  forgetBranches(ctx.redis, ...users.map((u) => u.id));
}

export const branchRouter = createTRPCRouter({
  /** What the top-bar switcher shows: the caller's branches and which one is active. */
  mine: protectedProcedure.query(({ ctx }) => ({
    branches: ctx.branches,
    activeId: ctx.branch.activeId,
  })),

  list: adminProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    const [branches, destinations] = await Promise.all([
      ctx.db.branch.findMany({
        where: { companyId },
        include: { _count: { select: { users: true } } },
        orderBy: [{ isHq: "desc" }, { name: "asc" }],
      }),
      ctx.db.destination.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { branches, destinations };
  }),

  save: adminProcedure
    .input(branchInput.extend({ id: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;

      const current = id
        ? await ctx.db.branch.findFirst({ where: { id, companyId }, select: { isHq: true } })
        : null;
      if (id && !current) throw new TRPCError({ code: "NOT_FOUND" });
      // Something has to be the fallback for records no branch claims.
      if (current?.isHq && (!data.isHq || !data.active)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Make another branch head office first.",
        });
      }

      const clash = await ctx.db.branch.findFirst({
        where: { companyId, code: data.code, NOT: id ? { id } : undefined },
        select: { id: true },
      });
      if (clash) throw new TRPCError({ code: "CONFLICT", message: `Code ${data.code} is taken.` });

      const saved = await ctx.db.$transaction(async (tx) => {
        if (data.isHq) {
          await tx.branch.updateMany({ where: { companyId, isHq: true }, data: { isHq: false } });
        }
        return id
          ? tx.branch.update({ where: { id }, data })
          : tx.branch.create({ data: { ...data, companyId } });
      });

      await forgetCompany(ctx, companyId);
      return saved;
    }),

  /** Which branches a user works in. */
  setForUser: adminProcedure
    .input(z.object({ userId: z.string(), allBranches: z.boolean(), branchIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const user = await ctx.db.user.findFirst({
        where: { id: input.userId, companyId },
        select: { id: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const valid = await ctx.db.branch.findMany({
        where: { companyId, id: { in: input.branchIds } },
        select: { id: true },
      });

      await ctx.db.$transaction([
        ctx.db.user.update({ where: { id: user.id }, data: { allBranches: input.allBranches } }),
        ctx.db.userBranch.deleteMany({ where: { userId: user.id } }),
        ctx.db.userBranch.createMany({
          data: valid.map((b) => ({ userId: user.id, branchId: b.id })),
        }),
      ]);

      forgetBranches(ctx.redis, user.id);
      return { ok: true };
    }),
});
