import { z } from "zod";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

const ticketCreateSchema = z.object({
  tourOperatorId: z.string().optional(),
  hotelId: z.string(),
  excursionId: z.string(),
  guestName: z.string().optional(),
  guestMobile: z.string().optional(),
  hotelGuideName: z.string().optional(),
  arrivalDate: z.string().optional(), // ISO date string
  price: z.number().min(0).optional(),
  priceCurrency: z.string().optional(),
  pickupTime: z.string().optional(),
  roomNo: z.string().optional(),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  excursionDate: z.string(), // ISO date string
  language: z.string().default("EN"),
  remarks: z.string().optional(),
  source: z.enum(["MANUAL", "B2C", "HOTEL_GUIDE", "B2B"]).default("MANUAL"),
});

const TICKET_SELECT = {
  id: true,
  ticketNo: true,
  tourOperatorId: true,
  hotelId: true,
  excursionId: true,
  guestName: true,
  guestMobile: true,
  hotelGuideName: true,
  arrivalDate: true,
  price: true,
  priceCurrency: true,
  pickupTime: true,
  roomNo: true,
  adults: true,
  children: true,
  excursionDate: true,
  language: true,
  remarks: true,
  source: true,
  status: true,
  breakdownId: true,
  createdAt: true,
  tourOperator: { select: { id: true, name: true, code: true } },
  hotel: { select: { id: true, name: true, code: true } },
  excursion: { select: { id: true, name: true, code: true } },
} as const;

export const excursionTicketRouter = createTRPCRouter({
  list: proc
    .input(
      z.object({
        excursionId: z.string().optional(),
        hotelId: z.string().optional(),
        tourOperatorId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW"]).optional(),
        source: z.enum(["MANUAL", "B2C", "HOTEL_GUIDE", "B2B"]).optional(),
        language: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.crmExcursionTicket.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.excursionId && { excursionId: input.excursionId }),
          ...(input?.hotelId && { hotelId: input.hotelId }),
          ...(input?.tourOperatorId && { tourOperatorId: input.tourOperatorId }),
          ...(input?.status && { status: input.status }),
          ...(input?.source && { source: input.source }),
          ...(input?.language && { language: input.language }),
          ...(input?.dateFrom || input?.dateTo
            ? {
                excursionDate: {
                  ...(input?.dateFrom && { gte: new Date(input.dateFrom) }),
                  ...(input?.dateTo && { lte: new Date(input.dateTo) }),
                },
              }
            : {}),
        },
        select: TICKET_SELECT,
        orderBy: [{ excursionDate: "desc" }, { createdAt: "desc" }],
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmExcursionTicket.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        select: TICKET_SELECT,
      });
    }),

  // Auto-fill pickup time from the pickup time sheet
  getPickupTime: proc
    .input(z.object({ hotelId: z.string(), excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pt = await ctx.db.crmPickupTime.findFirst({
        where: { companyId: ctx.companyId, hotelId: input.hotelId, excursionId: input.excursionId },
        select: { pickupTime: true },
      });
      return pt?.pickupTime ?? null;
    }),

  create: proc
    .input(ticketCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "excursion_ticket" } },
        create: { companyId: ctx.companyId, code: "excursion_ticket", prefix: "TKT", padding: 5, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const num = seq.nextNumber - 1;
      const ticketNo = `TKT-${String(num).padStart(5, "0")}`;

      // Auto-fill pickup time if not provided
      let pickupTime = input.pickupTime;
      if (!pickupTime && input.hotelId && input.excursionId) {
        const pt = await ctx.db.crmPickupTime.findFirst({
          where: { companyId: ctx.companyId, hotelId: input.hotelId, excursionId: input.excursionId },
          select: { pickupTime: true },
        });
        pickupTime = pt?.pickupTime ?? undefined;
      }

      return ctx.db.crmExcursionTicket.create({
        data: {
          companyId: ctx.companyId,
          ticketNo,
          tourOperatorId: input.tourOperatorId || null,
          hotelId: input.hotelId,
          excursionId: input.excursionId,
          guestName: input.guestName || null,
          guestMobile: input.guestMobile || null,
          hotelGuideName: input.hotelGuideName || null,
          arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) : null,
          price: input.price != null ? input.price : null,
          priceCurrency: input.priceCurrency || null,
          pickupTime: pickupTime || null,
          roomNo: input.roomNo || null,
          adults: input.adults,
          children: input.children,
          excursionDate: new Date(input.excursionDate),
          language: input.language,
          remarks: input.remarks || null,
          source: input.source,
          status: "PENDING",
        },
        select: TICKET_SELECT,
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: ticketCreateSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursionTicket.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return ctx.db.crmExcursionTicket.update({
        where: { id: input.id },
        data: {
          ...(input.data.tourOperatorId !== undefined && { tourOperatorId: input.data.tourOperatorId || null }),
          ...(input.data.hotelId && { hotelId: input.data.hotelId }),
          ...(input.data.excursionId && { excursionId: input.data.excursionId }),
          ...(input.data.guestName !== undefined && { guestName: input.data.guestName || null }),
          ...(input.data.guestMobile !== undefined && { guestMobile: input.data.guestMobile || null }),
          ...(input.data.hotelGuideName !== undefined && { hotelGuideName: input.data.hotelGuideName || null }),
          ...(input.data.arrivalDate !== undefined && { arrivalDate: input.data.arrivalDate ? new Date(input.data.arrivalDate) : null }),
          ...(input.data.price !== undefined && { price: input.data.price }),
          ...(input.data.priceCurrency !== undefined && { priceCurrency: input.data.priceCurrency || null }),
          ...(input.data.pickupTime !== undefined && { pickupTime: input.data.pickupTime || null }),
          ...(input.data.roomNo !== undefined && { roomNo: input.data.roomNo || null }),
          ...(input.data.adults !== undefined && { adults: input.data.adults }),
          ...(input.data.children !== undefined && { children: input.data.children }),
          ...(input.data.excursionDate && { excursionDate: new Date(input.data.excursionDate) }),
          ...(input.data.language && { language: input.data.language }),
          ...(input.data.remarks !== undefined && { remarks: input.data.remarks || null }),
          ...(input.data.source && { source: input.data.source }),
        },
        select: TICKET_SELECT,
      });
    }),

  setStatus: proc
    .input(z.object({ id: z.string(), status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursionTicket.findFirstOrThrow({ where: { id: input.id, companyId: ctx.companyId } });
      return ctx.db.crmExcursionTicket.update({ where: { id: input.id }, data: { status: input.status }, select: TICKET_SELECT });
    }),

  // Supporting dropdowns
  listTourOperators: proc.query(async ({ ctx }) => {
    return ctx.db.tourOperator.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),

  listHotels: proc.query(async ({ ctx }) => {
    return ctx.db.hotel.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true, destinationId: true, destination: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
  }),

  listExcursions: proc.query(async ({ ctx }) => {
    return ctx.db.crmExcursion.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),

  // Fetch adult selling price for an excursion (first active cost sheet → first adult-like price)
  getExcursionPrice: proc
    .input(z.object({ excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirst({
        where: { excursionId: input.excursionId },
        orderBy: { createdAt: "asc" },
        select: {
          sellingPrices: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            select: { label: true, sellingPrice: true, currency: true },
          },
        },
      });
      if (!sheet || sheet.sellingPrices.length === 0) return null;
      // Prefer adult-labelled price, fall back to first
      const adult = sheet.sellingPrices.find((p) => /adult/i.test(p.label)) ?? sheet.sellingPrices[0];
      return { price: Number(adult.sellingPrice), currency: adult.currency };
    }),
});
