import { z } from "zod";

import { BRANCH_COOKIE } from "@/server/branch-scope";
import { db } from "@/server/db";
import { createCallerFactory, createTRPCRouter, modulePermissionProcedure, type TRPCContext } from "@/server/trpc";
import { reportRouter } from "./report";

const p = (code: string) => modulePermissionProcedure("finance", code);
const reports = createCallerFactory(reportRouter);

/**
 * Head office comparing branches side by side.
 *
 * Rather than re-implement each report per branch, this runs the report
 * itself once per branch, as the same user with that branch picked — the
 * normal branch scope does the narrowing. The consolidated column is the
 * same report with "All branches", which the page already has.
 */
async function perBranch<T>(
  ctx: TRPCContext & { branch: { ids: string[] }; branches: { id: string; code: string; name: string }[] },
  run: (caller: ReturnType<typeof reports>) => Promise<T>,
) {
  const mine = ctx.branches.filter((b) => ctx.branch.ids.includes(b.id));
  return Promise.all(
    mine.map(async (branch) => ({
      branch: { id: branch.id, code: branch.code, name: branch.name },
      report: await run(
        reports({
          db,
          redis: ctx.redis,
          session: ctx.session,
          logger: ctx.logger,
          clientIp: ctx.clientIp,
          headers: new Headers({ cookie: `${BRANCH_COOKIE}=${branch.id}` }),
        }),
      ),
    })),
  );
}

export const branchReportRouter = createTRPCRouter({
  profitAndLoss: p("finance:report:read")
    .input(z.object({ dateFrom: z.coerce.date(), dateTo: z.coerce.date() }))
    .query(({ ctx, input }) => perBranch(ctx, (r) => r.profitAndLoss(input))),

  balanceSheet: p("finance:report:read")
    .input(z.object({ asOfDate: z.coerce.date() }))
    .query(({ ctx, input }) => perBranch(ctx, (r) => r.balanceSheet(input))),
});
