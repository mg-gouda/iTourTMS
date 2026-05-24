import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  cruiseItineraryCreateSchema,
  cruiseItineraryUpdateSchema,
  cruiseSaveDaysSchema,
} from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseItineraryRouter = createTRPCRouter({
  list: p("nile-cruises:boat:read").query(async ({ ctx }) => {
    return ctx.db.cruiseItinerary.findMany({
      where: { companyId: ctx.companyId },
      include: {
        boat: { select: { id: true, name: true } },
        cruiseType: { select: { id: true, name: true, code: true } },
        _count: { select: { days: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: p("nile-cruises:boat:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseItinerary.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          boat: { select: { id: true, name: true } },
          cruiseType: true,
          days: {
            include: {
              excursions: {
                include: { excursion: { select: { id: true, name: true, code: true } } },
              },
            },
            orderBy: { dayNumber: "asc" },
          },
        },
      });
    }),

  create: p("nile-cruises:boat:create")
    .input(cruiseItineraryCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseItinerary.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), data: cruiseItineraryUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseItinerary.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("nile-cruises:boat:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseItinerary.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  listDays: p("nile-cruises:boat:read")
    .input(z.object({ itineraryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseItineraryDay.findMany({
        where: { itineraryId: input.itineraryId },
        include: {
          excursions: {
            include: { excursion: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { dayNumber: "asc" },
      });
    }),

  saveDays: p("nile-cruises:boat:update")
    .input(cruiseSaveDaysSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseItineraryDay.deleteMany({ where: { itineraryId: input.itineraryId } });
      return ctx.db.cruiseItineraryDay.createMany({
        data: input.days.map((d) => ({ ...d, itineraryId: input.itineraryId })),
      });
    }),

  listExcursions: p("nile-cruises:boat:read")
    .input(z.object({ dayId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseItineraryDayExcursion.findMany({
        where: { dayId: input.dayId },
        include: { excursion: { select: { id: true, name: true, code: true } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  addExcursion: p("nile-cruises:boat:update")
    .input(z.object({
      dayId: z.string(),
      excursionId: z.string(),
      isIncluded: z.boolean().default(true),
      optionalPricePax: z.number().optional(),
      optionalCurrency: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseItineraryDayExcursion.create({ data: input });
    }),

  removeExcursion: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseItineraryDayExcursion.delete({ where: { id: input.id } });
    }),
});
