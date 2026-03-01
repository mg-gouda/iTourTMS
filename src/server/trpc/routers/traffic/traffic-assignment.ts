import { z } from "zod";

import { trafficAssignmentCreateSchema, trafficAssignmentUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const trafficAssignmentRouter = createTRPCRouter({
  list: proc
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

  create: proc
    .input(trafficAssignmentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.ttTrafficAssignment.create({
        data: { ...input, companyId: ctx.companyId },
      });
      // Auto-transition job to ASSIGNED if currently CONFIRMED
      const job = await ctx.db.ttTrafficJob.findFirst({
        where: { id: input.jobId, companyId: ctx.companyId },
      });
      if (job && job.status === "CONFIRMED") {
        await ctx.db.ttTrafficJob.update({
          where: { id: input.jobId },
          data: { status: "ASSIGNED" },
        });
      }
      return assignment;
    }),

  update: proc
    .input(z.object({ id: z.string(), data: trafficAssignmentUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficAssignment.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficAssignment.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
