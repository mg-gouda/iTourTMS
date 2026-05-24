import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  cruiseDepartureCreateSchema,
  cruiseDepartureUpdateSchema,
  cruiseDeparturePatternCreateSchema,
} from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

const departureInclude = {
  boat: { select: { id: true, name: true, code: true, boatClass: true } },
  cruiseType: { select: { id: true, name: true, code: true, durationNights: true } },
  contract: { select: { id: true, code: true, name: true } },
  _count: { select: { bookings: true, cabinAssignments: true } },
};

export const cruiseDepartureRouter = createTRPCRouter({
  list: p("nile-cruises:departure:read")
    .input(z.object({
      boatId: z.string().optional(),
      status: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.boatId ? { boatId: input.boatId } : {}),
          ...(input.status ? { status: input.status as never } : {}),
          ...(input.from ? { embarkDate: { gte: new Date(input.from) } } : {}),
          ...(input.to ? { embarkDate: { lte: new Date(input.to) } } : {}),
        },
        include: departureInclude,
        orderBy: { embarkDate: "asc" },
      });
    }),

  calendar: p("nile-cruises:departure:read")
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to = new Date(input.year, input.month, 0, 23, 59, 59);
      return ctx.db.cruiseDeparture.findMany({
        where: { companyId: ctx.companyId, embarkDate: { gte: from, lte: to } },
        include: departureInclude,
        orderBy: { embarkDate: "asc" },
      });
    }),

  getById: p("nile-cruises:departure:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparture.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          ...departureInclude,
          itinerary: { include: { days: { orderBy: { dayNumber: "asc" } } } },
          allotments: { include: { cabinCategory: true } },
          stopSales: { where: { active: true } },
          manifest: true,
        },
      });
    }),

  create: p("nile-cruises:departure:create")
    .input(cruiseDepartureCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "cruise_departure" } },
        update: { nextNumber: { increment: 1 } },
        create: { companyId: ctx.companyId, code: "cruise_departure", prefix: "NC-DEP", nextNumber: 2, padding: 5 },
      });
      const code = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
      return ctx.db.cruiseDeparture.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          code,
          embarkDate: new Date(input.embarkDate as string),
          disembarkDate: new Date(input.disembarkDate as string),
          cutoffDate: input.cutoffDate ? new Date(input.cutoffDate) : null,
        },
      });
    }),

  update: p("nile-cruises:departure:update")
    .input(z.object({ id: z.string(), data: cruiseDepartureUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.embarkDate) data.embarkDate = new Date(data.embarkDate as string);
      if (data.disembarkDate) data.disembarkDate = new Date(data.disembarkDate as string);
      if (data.cutoffDate) data.cutoffDate = new Date(data.cutoffDate as string);
      return ctx.db.cruiseDeparture.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  delete: p("nile-cruises:departure:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparture.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  transitionStatus: p("nile-cruises:departure:update")
    .input(z.object({
      id: z.string(),
      status: z.enum(["SCHEDULED","OPEN_FOR_SALE","CLOSED_FOR_SALE","EMBARKING","SAILING","DISEMBARKED","CANCELLED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparture.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { status: input.status },
      });
    }),

  listByBoat: p("nile-cruises:departure:read")
    .input(z.object({ boatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparture.findMany({
        where: { boatId: input.boatId, companyId: ctx.companyId },
        include: departureInclude,
        orderBy: { embarkDate: "asc" },
      });
    }),

  generateFromPattern: p("nile-cruises:departure:create")
    .input(z.object({ patternId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pattern = await ctx.db.cruiseDeparturePattern.findFirstOrThrow({
        where: { id: input.patternId, companyId: ctx.companyId },
      });
      const cruiseType = await ctx.db.cruiseType.findFirstOrThrow({
        where: { id: pattern.cruiseTypeId, companyId: ctx.companyId },
      });
      const boat = await ctx.db.cruiseBoat.findFirstOrThrow({ where: { id: pattern.boatId } });

      const created: string[] = [];
      const current = new Date(pattern.startDate);
      const end = new Date(pattern.endDate);

      while (current <= end) {
        const dow = current.getDay() === 0 ? 7 : current.getDay(); // 1=Mon…7=Sun
        const matches = pattern.daysOfWeek.includes(dow);
        if (matches) {
          const seq = await ctx.db.sequence.upsert({
            where: { companyId_code: { companyId: ctx.companyId, code: "cruise_departure" } },
            update: { nextNumber: { increment: 1 } },
            create: { companyId: ctx.companyId, code: "cruise_departure", prefix: "NC-DEP", nextNumber: 2, padding: 5 },
          });
          const code = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
          const embarkDate = new Date(current);
          const disembarkDate = new Date(current);
          disembarkDate.setDate(disembarkDate.getDate() + cruiseType.durationNights);
          const dep = await ctx.db.cruiseDeparture.create({
            data: {
              companyId: ctx.companyId,
              code,
              boatId: pattern.boatId,
              cruiseTypeId: pattern.cruiseTypeId,
              contractId: pattern.contractId,
              embarkDate,
              disembarkDate,
              embarkPort: pattern.embarkPort,
              disembarkPort: pattern.disembarkPort,
              totalCabins: boat.totalCabins,
              totalPaxCapacity: boat.maxPax,
              generatedFromPatternId: pattern.id,
              status: "SCHEDULED",
            },
          });
          created.push(dep.id);
        }
        current.setDate(current.getDate() + 1);
      }
      await ctx.db.cruiseDeparturePattern.update({
        where: { id: pattern.id },
        data: { generatedCount: { increment: created.length } },
      });
      return { created: created.length };
    }),
});

export const cruiseDeparturePatternRouter = createTRPCRouter({
  list: p("nile-cruises:departure:read").query(async ({ ctx }) => {
    return ctx.db.cruiseDeparturePattern.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { startDate: "asc" },
    });
  }),

  getById: p("nile-cruises:departure:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparturePattern.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  create: p("nile-cruises:departure:create")
    .input(cruiseDeparturePatternCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparturePattern.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          startDate: new Date(input.startDate as string),
          endDate: new Date(input.endDate as string),
        },
      });
    }),

  update: p("nile-cruises:departure:update")
    .input(z.object({ id: z.string(), data: cruiseDeparturePatternCreateSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparturePattern.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("nile-cruises:departure:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparturePattern.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  generate: p("nile-cruises:departure:create")
    .input(z.object({ patternId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delegates to departure.generateFromPattern logic
      return { patternId: input.patternId, message: "Use departure.generateFromPattern" };
    }),
});
