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
export const BRANCH_OWNED: Partial<Record<Prisma.ModelName, Rule>> = {
  // Traffic: jobs, fleet and people are local; zones, vehicle types and
  // price lists are shared.
  TtTrafficJob: { direct: true },
  TtTrafficFlight: { direct: true },
  TtVehicle: { direct: true },
  TtDriver: { direct: true },
  TtRep: { direct: true },
  TtGuestBooking: { direct: true },
  TtTrafficAssignment: { via: (ids) => ({ job: { branchId: { in: ids } } }) },
  TtStatusChangeLog: { via: (ids) => ({ job: { branchId: { in: ids } } }) },
  TtNoShowEvidence: { via: (ids) => ({ job: { branchId: { in: ids } } }) },
  TtOperationalCost: { via: (ids) => ({ job: { branchId: { in: ids } } }) },
  TtVehicleCompliance: { via: (ids) => ({ vehicle: { branchId: { in: ids } } }) },
  TtDriverVehicle: { via: (ids) => ({ driver: { branchId: { in: ids } } }) },
  TtRepZone: { via: (ids) => ({ rep: { branchId: { in: ids } } }) },
  TtGuestPayment: { via: (ids) => ({ guestBooking: { branchId: { in: ids } } }) },

  // CRM: the pipeline and daily excursion operations; the excursion
  // catalogue, cost sheets, customers and suppliers are shared.
  CrmLead: { direct: true },
  CrmOpportunity: { direct: true },
  CrmActivity: { direct: true },
  CrmBooking: { direct: true },
  CrmProgramPlan: { direct: true },
  CrmExcursionTicket: { direct: true },
  CrmExcursionBreakdown: { direct: true },
  CrmExcursionDispatch: { direct: true },
  CrmSalesTeam: { direct: true },
  CrmMailing: { direct: true },
  CrmMailingRecipient: { via: (ids) => ({ mailing: { branchId: { in: ids } } }) },
  CrmBookingItem: { via: (ids) => ({ booking: { branchId: { in: ids } } }) },
  CrmProgramPlanItem: { via: (ids) => ({ programPlan: { branchId: { in: ids } } }) },
  CrmProgramTourOperator: { via: (ids) => ({ programPlan: { branchId: { in: ids } } }) },
  CrmDispatchRun: { via: (ids) => ({ dispatch: { branchId: { in: ids } } }) },
  CrmDispatchRunStop: { via: (ids) => ({ run: { dispatch: { branchId: { in: ids } } } }) },

  // Tour Ops: files and what hangs off them; rate sheets are shared, and so
  // are template packages (no file).
  OpsFile: { direct: true },
  OpsFlightTicket: { direct: true },
  OpsQuotation: { via: (ids) => ({ file: { branchId: { in: ids } } }) },
  OpsPnL: { via: (ids) => ({ file: { branchId: { in: ids } } }) },
  OpsPackage: { via: (ids) => opsPackageScope(ids) },
  OpsPackageComponent: { via: (ids) => ({ package: opsPackageScope(ids) }) },
  OpsFlightLeg: { via: (ids) => ({ ticket: { branchId: { in: ids } } }) },
  OpsFlightFareLine: { via: (ids) => ({ ticket: { branchId: { in: ids } } }) },

  // Finance: each branch keeps its own books. The chart of accounts, taxes,
  // fiscal years, lock dates and loans are company-wide. A journal is either a
  // branch's own (its cash, its bank) or shared by every branch.
  Move: { direct: true },
  Payment: { direct: true },
  BankStatement: { direct: true },
  BatchPayment: { direct: true },
  RecurringEntry: { direct: true },
  MoveLineItem: { via: (ids) => ({ move: { branchId: { in: ids } } }) },
  BankStatementLine: { via: (ids) => ({ statement: { branchId: { in: ids } } }) },
  RecurringEntryLine: { via: (ids) => ({ recurringEntry: { branchId: { in: ids } } }) },
  PartialReconcile: { via: (ids) => ({ debitMoveLine: { move: { branchId: { in: ids } } } }) },
  Journal: { via: (ids) => ({ OR: [{ branchId: null }, { branchId: { in: ids } }] }) },
  AccountAsset: { direct: true },
  DeferredRevenue: { direct: true },
  DeferredExpense: { direct: true },
  AccountAssetLine: { via: (ids) => ({ asset: { branchId: { in: ids } } }) },
  DeferredRevenueSchedule: { via: (ids) => ({ deferred: { branchId: { in: ids } } }) },
  DeferredExpenseSchedule: { via: (ids) => ({ deferred: { branchId: { in: ids } } }) },
};

function opsPackageScope(ids: string[]) {
  return { OR: [{ fileId: null }, { file: { branchId: { in: ids } } }] };
}

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

/** For nested relations, which the scoped client does not reach. */
export function inBranches(scope: BranchScope) {
  return { branchId: { in: scope.ids } };
}

/** The branch new records go to; refuses before anything (like a document number) is used up. */
export function activeBranch(scope: BranchScope): string {
  if (!scope.activeId) throw new TRPCError({ code: "BAD_REQUEST", message: NO_BRANCH });
  return scope.activeId;
}

/**
 * Where a record raised by a company-wide process (a hotel booking, a partner
 * request) belongs: the branch operating in that destination, else head office.
 */
export async function branchForDestination(
  db: PrismaClient,
  companyId: string,
  destinationId: string | null | undefined,
): Promise<string> {
  const branches = await db.branch.findMany({
    where: { companyId, active: true },
    select: { id: true, isHq: true, destinationIds: true },
  });
  const hit = destinationId && branches.find((b) => b.destinationIds.includes(destinationId));
  const hq = branches.find((b) => b.isHq);
  if (hit) return hit.id;
  if (!hq) throw new Error(`Company ${companyId} has no head-office branch`);
  return hq.id;
}

/**
 * Which branch's books an entry goes in: a branch journal (its cash, its bank)
 * decides; a shared journal leaves it to `fallback`.
 */
export async function entryBranch(
  db: Pick<PrismaClient, "journal">,
  journalId: string,
  fallback: () => string | Promise<string>,
): Promise<string> {
  const journal = await db.journal.findUnique({ where: { id: journalId }, select: { branchId: true } });
  return journal?.branchId ?? (await fallback());
}

/**
 * A document tied to existing entries (a payment against an invoice) lives in
 * their branch. Paying from another branch's own cash/bank would split one
 * transaction across two sets of books, so that is an inter-branch transfer.
 */
export async function assertJournalInBranch(
  db: Pick<PrismaClient, "journal">,
  journalId: string,
  branchId: string,
): Promise<void> {
  const journal = await db.journal.findUnique({ where: { id: journalId }, select: { branchId: true } });
  if (journal?.branchId && journal.branchId !== branchId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That journal belongs to another branch. Pay from this branch's journal, or record an inter-branch transfer.",
    });
  }
}

/** Branch operating at a hotel — where its transfers, invoices and bills belong. */
export async function branchForHotel(
  db: PrismaClient,
  companyId: string,
  hotelId: string,
): Promise<string> {
  const hotel = await db.hotel.findUnique({ where: { id: hotelId }, select: { destinationId: true } });
  return branchForDestination(db, companyId, hotel?.destinationId);
}

/** A journal of `type` to post in `branchId`: the branch's own if it has one, else a shared one. */
export function journalFor(
  db: PrismaClient,
  companyId: string,
  type: "SALE" | "PURCHASE" | "GENERAL" | "BANK" | "CASH",
  branchId: string,
) {
  return db.journal.findFirst({
    where: { companyId, type, OR: [{ branchId }, { branchId: null }] },
    orderBy: { branchId: { sort: "asc", nulls: "last" } },
    select: { id: true },
  });
}

export function readBranchCookie(headers: Headers | undefined): string | undefined {
  const raw = headers?.get("cookie") ?? "";
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(`${BRANCH_COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(BRANCH_COOKIE.length + 1)) : undefined;
}
