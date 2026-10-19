import { z } from "zod";

import { trafficAssignmentCreateSchema, trafficAssignmentUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("traffic", code);

export const trafficAssignmentRouter = createTRPCRouter({
  list: p("traffic:dispatch:read")
    .input(z.object({ jobId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.ttTrafficAssignment.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.jobId ? { jobId: input.jobId } : {}),
        },
        include: {
          job: { select: { id: true, code: true, serviceDate: true, serviceType: true, status: true } },
          vehicle: {
            select: { id: true, plateNumber: true, vehicleType: { select: { name: true } } },
          },
          driver: { include: { user: { select: { id: true, name: true } } } },
          rep: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { assignedAt: "desc" },
      });
    }),

  create: p("traffic:dispatch:manage")
    .input(trafficAssignmentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.ttTrafficAssignment.create({
        data: { ...input, companyId: ctx.companyId },
      });
      // Auto-transition job to ASSIGNED if currently CONFIRMED
      const job = await ctx.db.ttTrafficJob.findFirst({
        where: { id: input.jobId, companyId: ctx.companyId },
      });
      if (job) {
        await ctx.db.ttTrafficJob.update({
          where: { id: input.jobId },
          // A new assignment needs a fresh SMS at the next dispatch lock.
          data: { smsSentAt: null, ...(job.status === "CONFIRMED" && { status: "ASSIGNED" as const }) },
        });
      }
      return assignment;
    }),

  update: p("traffic:dispatch:manage")
    .input(z.object({ id: z.string(), data: trafficAssignmentUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const a = await ctx.db.ttTrafficAssignment.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
      await ctx.db.ttTrafficJob.update({ where: { id: a.jobId }, data: { smsSentAt: null } });
      return a;
    }),

  delete: p("traffic:dispatch:manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficAssignment.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
