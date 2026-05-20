import { z } from "zod";

import { TT_JOB_STATUS_TRANSITIONS } from "@/lib/constants/traffic";
import { trafficJobCreateSchema, trafficJobUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

const p = (code: string) => modulePermissionProcedure("traffic", code);

export const trafficJobRouter = createTRPCRouter({
  list: p("traffic:job:read")
    .input(
      z.object({
        serviceDate: z.coerce.date().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        status: z.string().optional(),
        serviceType: z.string().optional(),
        partnerId: z.string().optional(),
        bookingId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const dateFilter = input?.dateFrom || input?.dateTo
        ? {
            serviceDate: {
              ...(input.dateFrom ? { gte: input.dateFrom } : {}),
              ...(input.dateTo ? { lte: input.dateTo } : {}),
            },
          }
        : input?.serviceDate
          ? { serviceDate: input.serviceDate }
          : {};

      return ctx.db.ttTrafficJob.findMany({
        where: {
          companyId: ctx.companyId,
          ...dateFilter,
          ...(input?.status ? { status: input.status as never } : {}),
          ...(input?.serviceType ? { serviceType: input.serviceType as never } : {}),
          ...(input?.partnerId ? { partnerId: input.partnerId } : {}),
          ...(input?.bookingId ? { bookingId: input.bookingId } : {}),
        },
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          pickupAirport: { select: { id: true, code: true, name: true } },
          pickupHotel: { select: { id: true, name: true, code: true } },
          dropoffAirport: { select: { id: true, code: true, name: true } },
          dropoffHotel: { select: { id: true, name: true, code: true } },
          partner: { select: { id: true, name: true } },
          flight: { select: { id: true, flightNumber: true, arrTime: true, depTime: true } },
          booking: {
            select: {
              id: true,
              code: true,
              arrivalFlightNo: true,
              arrivalTime: true,
              arrivalOriginApt: true,
              arrivalDestApt: true,
              arrivalTerminal: true,
              departFlightNo: true,
              departTime: true,
              departOriginApt: true,
              departDestApt: true,
              departTerminal: true,
              hotel: { select: { name: true } },
            },
          },
          currency: { select: { id: true, code: true, symbol: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: [{ serviceDate: "asc" }, { pickupTime: "asc" }],
      });
    }),

  getById: p("traffic:job:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [job, dispatchRun] = await Promise.all([
        ctx.db.ttTrafficJob.findFirstOrThrow({
          where: { id: input.id, companyId: ctx.companyId },
          include: {
            vehicleType: { select: { id: true, name: true, code: true } },
            pickupAirport: { select: { id: true, code: true, name: true } },
            pickupHotel: { select: { id: true, name: true, code: true } },
            dropoffAirport: { select: { id: true, code: true, name: true } },
            dropoffHotel: { select: { id: true, name: true, code: true } },
            zone: { select: { id: true, name: true, code: true } },
            partner: { select: { id: true, name: true } },
            booking: {
              select: {
                id: true,
                code: true,
                arrivalFlightNo: true,
                arrivalTime: true,
                arrivalOriginApt: true,
                arrivalDestApt: true,
                arrivalTerminal: true,
                departFlightNo: true,
                departTime: true,
                departOriginApt: true,
                departDestApt: true,
                departTerminal: true,
                hotel: { select: { name: true } },
                leadGuestName: true,
                adults: true,
                children: true,
                infants: true,
              },
            },
            flight: true,
            currency: { select: { id: true, code: true, symbol: true } },
            createdBy: { select: { id: true, name: true } },
            assignments: {
              include: {
                vehicle: { select: { id: true, plateNumber: true } },
                driver: { include: { user: { select: { id: true, name: true } } } },
                rep: { include: { user: { select: { id: true, name: true } } } },
              },
            },
            statusLogs: { orderBy: { createdAt: "desc" } },
            operationalCosts: {
              include: { currency: { select: { id: true, code: true, symbol: true } } },
            },
          },
        }),
        ctx.db.crmDispatchRun.findUnique({
          where: { trafficJobId: input.id },
          include: {
            dispatch: {
              select: {
                excursion: { select: { id: true, name: true, code: true } },
                assemblyPointName: true,
                dispatchDate: true,
              },
            },
            rep: { select: { id: true, user: { select: { name: true } } } },
            stops: {
              include: { hotel: { select: { id: true, name: true, code: true } } },
              orderBy: { sequence: "asc" },
            },
          },
        }),
      ]);

      return { ...job, dispatchRun: dispatchRun ?? null };
    }),

  create: p("traffic:job:create")
    .input(trafficJobCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const code = await generateSequenceNumber(ctx.db, ctx.companyId, "traffic_job");
      return ctx.db.ttTrafficJob.create({
        data: {
          ...input,
          code,
          companyId: ctx.companyId,
          createdById: ctx.session.user.id,
        },
      });
    }),

  update: p("traffic:job:update")
    .input(z.object({ id: z.string(), data: trafficJobUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficJob.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("traffic:job:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficJob.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  updateStatus: p("traffic:job:update")
    .input(z.object({
      id: z.string(),
      status: z.enum([
        "PENDING", "CONFIRMED", "ASSIGNED", "DISPATCHED",
        "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
      ]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.ttTrafficJob.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      const allowed = TT_JOB_STATUS_TRANSITIONS[job.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new Error(`Cannot transition from ${job.status} to ${input.status}.`);
      }

      const [updatedJob] = await ctx.db.$transaction([
        ctx.db.ttTrafficJob.update({
          where: { id: input.id },
          data: { status: input.status as never },
        }),
        ctx.db.ttStatusChangeLog.create({
          data: {
            jobId: input.id,
            fromStatus: job.status,
            toStatus: input.status,
            changedBy: ctx.session.user.id,
            notes: input.notes,
          },
        }),
      ]);

      return updatedJob;
    }),

  bulkCreate: p("traffic:job:import")
    .input(z.object({ jobs: z.array(trafficJobCreateSchema) }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const jobInput of input.jobs) {
        const code = await generateSequenceNumber(ctx.db, ctx.companyId, "traffic_job");
        const job = await ctx.db.ttTrafficJob.create({
          data: {
            ...jobInput,
            code,
            companyId: ctx.companyId,
            createdById: ctx.session.user.id,
          },
        });
        results.push(job);
      }
      return results;
    }),

  linkToBooking: p("traffic:job:update")
    .input(z.object({ jobId: z.string(), bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficJob.update({
        where: { id: input.jobId, companyId: ctx.companyId },
        data: { bookingId: input.bookingId },
      });
    }),

  dashboard: p("traffic:job:read").query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalJobs,
      todayJobs,
      pendingJobs,
      completedJobs,
      recentJobs,
      vehicleCount,
      driverCount,
    ] = await Promise.all([
      ctx.db.ttTrafficJob.count({ where: { companyId: ctx.companyId } }),
      ctx.db.ttTrafficJob.count({
        where: { companyId: ctx.companyId, serviceDate: { gte: today, lt: tomorrow } },
      }),
      ctx.db.ttTrafficJob.count({
        where: { companyId: ctx.companyId, status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] } },
      }),
      ctx.db.ttTrafficJob.count({
        where: { companyId: ctx.companyId, status: "COMPLETED" },
      }),
      ctx.db.ttTrafficJob.findMany({
        where: { companyId: ctx.companyId },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          vehicleType: { select: { name: true } },
          partner: { select: { name: true } },
        },
      }),
      ctx.db.ttVehicle.count({ where: { companyId: ctx.companyId, isActive: true } }),
      ctx.db.ttDriver.count({ where: { companyId: ctx.companyId, isActive: true } }),
    ]);

    return {
      totalJobs,
      todayJobs,
      pendingJobs,
      completedJobs,
      recentJobs,
      vehicleCount,
      driverCount,
    };
  }),
});

