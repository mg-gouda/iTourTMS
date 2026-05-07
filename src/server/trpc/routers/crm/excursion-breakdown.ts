import { z } from "zod";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

const BREAKDOWN_SELECT = {
  id: true,
  excursionId: true,
  excursionDate: true,
  language: true,
  repId: true,
  vehicleId: true,
  driverId: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  excursion: { select: { id: true, name: true, code: true } },
  rep: { select: { id: true, user: { select: { name: true } } } },
  vehicle: { select: { id: true, plateNumber: true, make: true, model: true, vehicleType: { select: { name: true, capacity: true } } } },
  driver: { select: { id: true, user: { select: { name: true } } } },
  tickets: {
    select: {
      id: true,
      ticketNo: true,
      adults: true,
      children: true,
      roomNo: true,
      pickupTime: true,
      remarks: true,
      status: true,
      source: true,
      hotel: { select: { id: true, name: true, code: true } },
      tourOperator: { select: { id: true, name: true } },
    },
    orderBy: { pickupTime: "asc" as const },
  },
} as const;

export const excursionBreakdownRouter = createTRPCRouter({
  list: proc
    .input(
      z.object({
        excursionId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        language: z.string().optional(),
        status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.crmExcursionBreakdown.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.excursionId && { excursionId: input.excursionId }),
          ...(input?.language && { language: input.language }),
          ...(input?.status && { status: input.status }),
          ...(input?.dateFrom || input?.dateTo
            ? {
                excursionDate: {
                  ...(input?.dateFrom && { gte: new Date(input.dateFrom) }),
                  ...(input?.dateTo && { lte: new Date(input.dateTo) }),
                },
              }
            : {}),
        },
        select: BREAKDOWN_SELECT,
        orderBy: [{ excursionDate: "desc" }],
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmExcursionBreakdown.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        select: BREAKDOWN_SELECT,
      });
    }),

  // Find or create breakdown for a given excursion+date+language, then attach tickets
  saveBreakdown: proc
    .input(
      z.object({
        excursionId: z.string(),
        excursionDate: z.string(),
        language: z.string().default("EN"),
        ticketIds: z.array(z.string()),
        repId: z.string().optional(),
        vehicleId: z.string().optional(),
        driverId: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const date = new Date(input.excursionDate);

      const breakdown = await ctx.db.crmExcursionBreakdown.upsert({
        where: {
          companyId_excursionId_excursionDate_language: {
            companyId: ctx.companyId,
            excursionId: input.excursionId,
            excursionDate: date,
            language: input.language,
          },
        },
        create: {
          companyId: ctx.companyId,
          excursionId: input.excursionId,
          excursionDate: date,
          language: input.language,
          repId: input.repId || null,
          vehicleId: input.vehicleId || null,
          driverId: input.driverId || null,
          notes: input.notes || null,
          status: "DRAFT",
        },
        update: {
          repId: input.repId || null,
          vehicleId: input.vehicleId || null,
          driverId: input.driverId || null,
          notes: input.notes || null,
        },
        select: { id: true },
      });

      // Detach tickets that were previously in this breakdown but not in the new selection
      await ctx.db.crmExcursionTicket.updateMany({
        where: { breakdownId: breakdown.id, id: { notIn: input.ticketIds } },
        data: { breakdownId: null },
      });

      // Attach selected tickets
      if (input.ticketIds.length > 0) {
        await ctx.db.crmExcursionTicket.updateMany({
          where: { companyId: ctx.companyId, id: { in: input.ticketIds } },
          data: { breakdownId: breakdown.id },
        });
      }

      return ctx.db.crmExcursionBreakdown.findUniqueOrThrow({
        where: { id: breakdown.id },
        select: BREAKDOWN_SELECT,
      });
    }),

  assign: proc
    .input(
      z.object({
        id: z.string(),
        repId: z.string().nullish(),
        vehicleId: z.string().nullish(),
        driverId: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursionBreakdown.findFirstOrThrow({ where: { id: input.id, companyId: ctx.companyId } });
      return ctx.db.crmExcursionBreakdown.update({
        where: { id: input.id },
        data: {
          repId: input.repId ?? null,
          vehicleId: input.vehicleId ?? null,
          driverId: input.driverId ?? null,
        },
        select: BREAKDOWN_SELECT,
      });
    }),

  publish: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursionBreakdown.findFirstOrThrow({ where: { id: input.id, companyId: ctx.companyId } });
      return ctx.db.crmExcursionBreakdown.update({
        where: { id: input.id },
        data: { status: "PUBLISHED" },
        select: { id: true, status: true },
      });
    }),

  unpublish: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursionBreakdown.findFirstOrThrow({ where: { id: input.id, companyId: ctx.companyId } });
      return ctx.db.crmExcursionBreakdown.update({
        where: { id: input.id },
        data: { status: "DRAFT" },
        select: { id: true, status: true },
      });
    }),

  // Supporting dropdowns for traffic pool
  listReps: proc.query(async ({ ctx }) => {
    return ctx.db.ttRep.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });
  }),

  listVehicles: proc.query(async ({ ctx }) => {
    return ctx.db.ttVehicle.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, plateNumber: true, make: true, model: true, vehicleType: { select: { name: true, capacity: true } } },
      orderBy: { plateNumber: "asc" },
    });
  }),

  listDrivers: proc.query(async ({ ctx }) => {
    return ctx.db.ttDriver.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    });
  }),
});
