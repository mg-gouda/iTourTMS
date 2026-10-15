import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

/**
 * Branch scoping — the one place that decides which branch's records a staff
 * request can see or write.
 *
 * Rather than adding `branchId` to some 800 hand-written queries, every staff
 * request gets a Prisma client whose queries on branch-owned models are
 * narrowed here. A router that forgets about branches is still scoped; a
 * router that asks for another branch's record by id gets not-found.
 *
 * Not covered, by construction: raw SQL, the global `db` (cron, API routes,
 * server components), and nested `include`s that reach a branch-owned model
 * from a shared one. Those are audited by hand.
 */

export const BRANCH_COOKIE = "itms-branch";
export const ALL_BRANCHES = "all";

export interface BranchScope {
  /** Branches the request may read and write. */
  ids: string[];
  /** Where new records go; null while an HQ user views all branches. */
  activeId: string | null;
}

export interface AllowedBranch {
  id: string;
  code: string;
  name: string;
  isHq: boolean;
}

type Rule =
  /** The model carries `branchId` itself; creates are stamped with it. */
  | { direct: true }
  /** The model is reached through a parent that carries `branchId`. */
  | { via: (ids: string[]) => Record<string, unknown> };

/** Branch-owned models. Everything not listed is shared across branches. */
export const BRANCH_OWNED: Partial<Record<Prisma.ModelName, Rule>> = {};

const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);
const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);

const NO_BRANCH = "Pick a branch in the top bar first — records belong to one branch.";

type Args = Record<string, unknown> & { where?: Record<string, unknown> };

/** Stamps or checks the branch on one row of create/update data. */
function stampRow(row: Record<string, unknown>, scope: BranchScope, creating: boolean) {
  const given = (row.branchId ??
    (row.branch as { connect?: { id?: string } } | undefined)?.connect?.id) as string | undefined;
  if (given) {
    if (!scope.ids.includes(given)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "That branch is not one of yours." });
    }
    return row;
  }
  if (!creating) return row;
  if (!scope.activeId) throw new TRPCError({ code: "BAD_REQUEST", message: NO_BRANCH });
  // Checked inputs connect relations (they always connect `company`); mixing in
  // a scalar FK there is a Prisma validation error.
  return "company" in row
    ? { ...row, branch: { connect: { id: scope.activeId } } }
    : { ...row, branchId: scope.activeId };
}

/** Rewrites one query's args so it cannot leave the caller's branches. Pure, for testing. */
export function scopeArgs(rule: Rule, operation: string, args: Args, scope: BranchScope): Args {
  const next: Args = { ...args };

  if (WHERE_OPS.has(operation)) {
    const filter = "direct" in rule ? { branchId: { in: scope.ids } } : rule.via(scope.ids);
    const where = next.where ?? {};
    const and = where.AND === undefined ? [] : Array.isArray(where.AND) ? where.AND : [where.AND];
    // Spread rather than wrap: findUnique/update need their unique key at the top level.
    next.where = { ...where, AND: [...and, filter] };
  }

  if (!("direct" in rule)) return next;

  if (CREATE_OPS.has(operation)) {
    next.data = Array.isArray(next.data)
      ? next.data.map((r) => stampRow(r as Record<string, unknown>, scope, true))
      : stampRow(next.data as Record<string, unknown>, scope, true);
  } else if (operation === "upsert") {
    next.create = stampRow(next.create as Record<string, unknown>, scope, true);
    next.update = stampRow(next.update as Record<string, unknown>, scope, false);
  } else if (operation === "update" || operation === "updateMany" || operation === "updateManyAndReturn") {
    next.data = stampRow(next.data as Record<string, unknown>, scope, false);
  }
  return next;
}

/** A client whose branch-owned queries are confined to `scope`. */
export function scopeDb(db: PrismaClient, scope: BranchScope): PrismaClient {
  type Op = { model?: string; operation: string; args: Args; query: (a: Args) => Promise<unknown> };
  // ponytail: typed loosely on purpose — Prisma's own extension types for
  // $allModels blow the compiler's union limit on a 250-model schema. At
  // runtime the result is a drop-in PrismaClient, which is what services take.
  const extend = db.$extends as unknown as (ext: object) => unknown;
  return extend.call(db, {
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }: Op) {
          const rule = BRANCH_OWNED[model as Prisma.ModelName];
          return query(rule ? scopeArgs(rule, operation, args, scope) : args);
        },
      },
    },
  }) as PrismaClient;
}

const cacheKey = (userId: string) => `branches:${userId}`;

/** Drop a user's cached branch list after their access changes. */
export function forgetBranches(redis: Redis, ...userIds: string[]) {
  if (userIds.length) void redis.del(...userIds.map(cacheKey)).catch(() => {});
}

/** The branches a user may work in: all of them for HQ staff, else their assignments. */
export async function allowedBranches(
  db: PrismaClient,
  redis: Redis,
  user: { id: string; companyId: string; roles?: string[] },
): Promise<AllowedBranch[]> {
  const cached = await redis.get(cacheKey(user.id)).catch(() => null);
  if (cached) return JSON.parse(cached) as AllowedBranch[];

  const me = await db.user.findUnique({
    where: { id: user.id },
    select: { allBranches: true, branches: { select: { branchId: true } } },
  });
  const seesAll = user.roles?.includes("super_admin") || me?.allBranches;
  const branches = await db.branch.findMany({
    where: {
      companyId: user.companyId,
      active: true,
      ...(seesAll ? {} : { id: { in: me?.branches.map((b) => b.branchId) ?? [] } }),
    },
    select: { id: true, code: true, name: true, isHq: true },
    orderBy: [{ isHq: "desc" }, { name: "asc" }],
  });

  await redis.setex(cacheKey(user.id), 60, JSON.stringify(branches)).catch(() => {});
  return branches;
}

/** Narrows the allowed branches to the one picked in the top bar, if any. */
export function pickScope(allowed: AllowedBranch[], cookie: string | undefined): BranchScope {
  const picked = allowed.find((b) => b.id === cookie);
  if (picked) return { ids: [picked.id], activeId: picked.id };
  const ids = allowed.map((b) => b.id);
  return { ids, activeId: ids.length === 1 ? ids[0] : null };
}

export function readBranchCookie(headers: Headers | undefined): string | undefined {
  const raw = headers?.get("cookie") ?? "";
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(`${BRANCH_COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(BRANCH_COOKIE.length + 1)) : undefined;
}
