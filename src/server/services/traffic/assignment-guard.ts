import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

type Db = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">;

/**
 * An assignment may only use this company's vehicle, driver and rep from the
 * job's own branch. Ids arrive from the client; the scoped db already limits
 * lookups to the caller's branches, this also pins them to the job's branch.
 */
export async function assertAssignable(
  db: Db,
  companyId: string,
  a: { jobId: string; vehicleId?: string | null; driverId?: string | null; repId?: string | null },
) {
  const job = await db.ttTrafficJob.findFirst({ where: { id: a.jobId, companyId }, select: { branchId: true } });
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
  const where = { companyId, branchId: job.branchId };
  const checks: [string | null | undefined, () => Promise<unknown>, string][] = [
    [a.vehicleId, () => db.ttVehicle.findFirst({ where: { id: a.vehicleId!, ...where }, select: { id: true } }), "vehicle"],
    [a.driverId, () => db.ttDriver.findFirst({ where: { id: a.driverId!, ...where }, select: { id: true } }), "driver"],
    [a.repId, () => db.ttRep.findFirst({ where: { id: a.repId!, ...where }, select: { id: true } }), "rep"],
  ];
  for (const [id, find, what] of checks) {
    if (id && !(await find())) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `That ${what} isn't available for this job's branch.` });
    }
  }
}
