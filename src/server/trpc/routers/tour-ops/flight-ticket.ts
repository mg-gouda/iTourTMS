import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import type { OpsFlightTicketStatus, OpsFlightType, OpsMarkupType, OpsPricingBasis } from "@prisma/client";

const proc = moduleProcedure("tour-ops");

const legSchema = z.object({
  sequence: z.number().int().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  date: z.string().min(1),
  takeOffTime: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  terminal: z.string().optional(),
});

function calcPnL(input: {
  pricingBasis: OpsPricingBasis;
  pax: number;
  buyingRate: number;
  sellingRate: number;
  commissionType: OpsMarkupType;
  commissionValue: number;
}) {
  const { pricingBasis, pax, buyingRate, sellingRate, commissionType, commissionValue } = input;
  const mult = pricingBasis === "PER_PERSON" ? pax : 1;
  const totalBuying = new Decimal(buyingRate).times(mult);
  const totalRevenue = new Decimal(sellingRate).times(mult);
  const commissionAmount =
    commissionType === "PERCENTAGE"
      ? totalBuying.times(commissionValue).div(100)
      : new Decimal(commissionValue);
  const totalCost = totalBuying.plus(commissionAmount);
  const profit = totalRevenue.minus(totalCost);
  const marginPct = totalCost.gt(0) ? profit.div(totalCost).times(100) : new Decimal(0);
  return {
    commissionAmount: commissionAmount.toDecimalPlaces(2).toNumber(),
    totalCost: totalCost.toDecimalPlaces(2).toNumber(),
    totalRevenue: totalRevenue.toDecimalPlaces(2).toNumber(),
    profit: profit.toDecimalPlaces(2).toNumber(),
    marginPct: marginPct.toDecimalPlaces(4).toNumber(),
  };
}

const createSchema = z.object({
  opsFileId: z.string().optional(),
  clientName: z.string().optional(),
  issueDate: z.string().optional(),
  flightType: z.enum(["ONE_WAY", "RETURN", "MULTI_LEG"]).default("ONE_WAY"),
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureDate: z.string().min(1),
  returnDate: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  returnFlightNumber: z.string().optional(),
  ticketNumber: z.string().optional(),
  takeOffTime: z.string().optional(),
  terminal: z.string().optional(),
  returnTakeOffTime: z.string().optional(),
  returnTerminal: z.string().optional(),
  returnAirline: z.string().optional(),
  legs: z.array(legSchema).optional(),
  pricingBasis: z.enum(["PER_PERSON", "BULK"]).default("PER_PERSON"),
  pax: z.number().int().min(1).default(1),
  buyingRate: z.number().min(0),
  sellingRate: z.number().min(0),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  commissionValue: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const opsFlightTicketRouter = createTRPCRouter({
  list: proc
    .input(
      z.object({
        status: z.string().optional(),
        flightType: z.string().optional(),
        opsFileId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { companyId, db } = ctx;
      const where: Record<string, unknown> = { companyId };
      if (input?.status && input.status !== "ALL") where.status = input.status;
      if (input?.flightType && input.flightType !== "ALL") where.flightType = input.flightType;
      if (input?.opsFileId) where.opsFileId = input.opsFileId;
      if (input?.dateFrom) where.departureDate = { gte: new Date(input.dateFrom) };
      if (input?.dateTo) {
        where.departureDate = {
          ...(where.departureDate as object ?? {}),
          lte: new Date(input.dateTo),
        };
      }
      if (input?.search) {
        where.OR = [
          { code: { contains: input.search, mode: "insensitive" } },
          { clientName: { contains: input.search, mode: "insensitive" } },
          { origin: { contains: input.search, mode: "insensitive" } },
          { destination: { contains: input.search, mode: "insensitive" } },
          { airline: { contains: input.search, mode: "insensitive" } },
          { ticketNumber: { contains: input.search, mode: "insensitive" } },
        ];
      }
      const skip = ((input?.page ?? 1) - 1) * (input?.pageSize ?? 50);
      const [items, total] = await Promise.all([
        db.opsFlightTicket.findMany({
          where,
          include: {
            opsFile: { select: { id: true, code: true } },
            createdBy: { select: { name: true } },
            legs: { orderBy: { sequence: "asc" } },
          },
          orderBy: { departureDate: "desc" },
          skip,
          take: input?.pageSize ?? 50,
        }),
        db.opsFlightTicket.count({ where }),
      ]);
      return { items, total };
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          opsFile: { select: { id: true, code: true } },
          createdBy: { select: { name: true } },
          legs: { orderBy: { sequence: "asc" } },
        },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      return ticket;
    }),

  create: proc
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const { companyId, db, session } = ctx;
      const seq = await db.sequence.upsert({
        where: { companyId_code: { companyId, code: "ops_flight_ticket" } },
        create: { companyId, code: "ops_flight_ticket", prefix: "TK", separator: "-", padding: 5, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const code = `${seq.prefix}${seq.separator}${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
      const pnl = calcPnL({
        pricingBasis: input.pricingBasis as OpsPricingBasis,
        pax: input.pax,
        buyingRate: input.buyingRate,
        sellingRate: input.sellingRate,
        commissionType: input.commissionType as OpsMarkupType,
        commissionValue: input.commissionValue,
      });
      return db.opsFlightTicket.create({
        data: {
          companyId,
          code,
          opsFileId: input.opsFileId || null,
          clientName: input.clientName || null,
          issueDate: input.issueDate ? new Date(input.issueDate) : null,
          flightType: input.flightType as OpsFlightType,
          origin: input.origin,
          destination: input.destination,
          departureDate: new Date(input.departureDate),
          returnDate: input.returnDate ? new Date(input.returnDate) : null,
          airline: input.airline || null,
          flightNumber: input.flightNumber || null,
          returnFlightNumber: input.returnFlightNumber || null,
          ticketNumber: input.ticketNumber || null,
          takeOffTime: input.takeOffTime || null,
          terminal: input.terminal || null,
          returnTakeOffTime: input.returnTakeOffTime || null,
          returnTerminal: input.returnTerminal || null,
          returnAirline: input.returnAirline || null,
          pricingBasis: input.pricingBasis as OpsPricingBasis,
          pax: input.pax,
          buyingRate: input.buyingRate,
          sellingRate: input.sellingRate,
          commissionType: input.commissionType as OpsMarkupType,
          commissionValue: input.commissionValue,
          ...pnl,
          notes: input.notes || null,
          createdById: session.user.id,
          legs: input.legs?.length
            ? {
                create: input.legs.map((leg) => ({
                  sequence: leg.sequence,
                  origin: leg.origin,
                  destination: leg.destination,
                  date: new Date(leg.date),
                  takeOffTime: leg.takeOffTime || null,
                  airline: leg.airline || null,
                  flightNumber: leg.flightNumber || null,
                  terminal: leg.terminal || null,
                })),
              }
            : undefined,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: createSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      if (ticket.status === "POSTED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit a posted flight ticket" });
      }
      const merged = {
        pricingBasis: (input.data.pricingBasis ?? ticket.pricingBasis) as OpsPricingBasis,
        pax: input.data.pax ?? ticket.pax,
        buyingRate: input.data.buyingRate ?? Number(ticket.buyingRate),
        sellingRate: input.data.sellingRate ?? Number(ticket.sellingRate),
        commissionType: (input.data.commissionType ?? ticket.commissionType) as OpsMarkupType,
        commissionValue: input.data.commissionValue ?? Number(ticket.commissionValue),
      };
      const pnl = calcPnL(merged);

      return ctx.db.$transaction(async (tx) => {
        if (input.data.legs !== undefined) {
          await tx.opsFlightLeg.deleteMany({ where: { ticketId: input.id } });
          if (input.data.legs.length > 0) {
            await tx.opsFlightLeg.createMany({
              data: input.data.legs.map((leg) => ({
                ticketId: input.id,
                sequence: leg.sequence,
                origin: leg.origin,
                destination: leg.destination,
                date: new Date(leg.date),
                takeOffTime: leg.takeOffTime || null,
                airline: leg.airline || null,
                flightNumber: leg.flightNumber || null,
                terminal: leg.terminal || null,
              })),
            });
          }
        }

        return tx.opsFlightTicket.update({
          where: { id: input.id },
          data: {
            ...(input.data.opsFileId !== undefined && { opsFileId: input.data.opsFileId || null }),
            ...(input.data.clientName !== undefined && { clientName: input.data.clientName || null }),
            ...(input.data.issueDate !== undefined && { issueDate: input.data.issueDate ? new Date(input.data.issueDate) : null }),
            ...(input.data.flightType && { flightType: input.data.flightType as OpsFlightType }),
            ...(input.data.origin && { origin: input.data.origin }),
            ...(input.data.destination && { destination: input.data.destination }),
            ...(input.data.departureDate && { departureDate: new Date(input.data.departureDate) }),
            ...(input.data.returnDate !== undefined && { returnDate: input.data.returnDate ? new Date(input.data.returnDate) : null }),
            ...(input.data.airline !== undefined && { airline: input.data.airline || null }),
            ...(input.data.flightNumber !== undefined && { flightNumber: input.data.flightNumber || null }),
            ...(input.data.returnFlightNumber !== undefined && { returnFlightNumber: input.data.returnFlightNumber || null }),
            ...(input.data.ticketNumber !== undefined && { ticketNumber: input.data.ticketNumber || null }),
            ...(input.data.takeOffTime !== undefined && { takeOffTime: input.data.takeOffTime || null }),
            ...(input.data.terminal !== undefined && { terminal: input.data.terminal || null }),
            ...(input.data.returnTakeOffTime !== undefined && { returnTakeOffTime: input.data.returnTakeOffTime || null }),
            ...(input.data.returnTerminal !== undefined && { returnTerminal: input.data.returnTerminal || null }),
            ...(input.data.returnAirline !== undefined && { returnAirline: input.data.returnAirline || null }),
            ...(input.data.pricingBasis && { pricingBasis: input.data.pricingBasis as OpsPricingBasis }),
            ...(input.data.pax !== undefined && { pax: input.data.pax }),
            ...(input.data.buyingRate !== undefined && { buyingRate: input.data.buyingRate }),
            ...(input.data.sellingRate !== undefined && { sellingRate: input.data.sellingRate }),
            ...(input.data.commissionType && { commissionType: input.data.commissionType as OpsMarkupType }),
            ...(input.data.commissionValue !== undefined && { commissionValue: input.data.commissionValue }),
            ...pnl,
            ...(input.data.notes !== undefined && { notes: input.data.notes || null }),
          },
        });
      });
    }),

  post: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { companyId, db } = ctx;
      const ticket = await db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      if (ticket.status !== "DRAFT") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only draft tickets can be posted" });
      }

      const journal = await db.journal.findFirst({
        where: { companyId, isActive: true, type: { in: ["GENERAL", "SALE"] } },
        orderBy: { type: "asc" },
      });
      if (!journal) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No active journal found. Please configure a journal in Finance first." });

      const [receivableAcc, revenueAcc, expenseAcc, payableAcc, currency] = await Promise.all([
        db.finAccount.findFirst({ where: { companyId, accountType: "ASSET_RECEIVABLE", deprecated: false } }),
        db.finAccount.findFirst({ where: { companyId, accountType: "INCOME", deprecated: false } }),
        db.finAccount.findFirst({ where: { companyId, accountType: "EXPENSE_DIRECT_COST", deprecated: false } }),
        db.finAccount.findFirst({ where: { companyId, accountType: "LIABILITY_PAYABLE", deprecated: false } }),
        db.currency.findFirst({ where: { code: "USD" } }),
      ]);

      if (!receivableAcc || !revenueAcc || !expenseAcc || !payableAcc) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Required chart of accounts not configured (Receivable, Income, Direct Cost, Payable).",
        });
      }
      if (!currency) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "USD currency not found." });

      const revenue = Number(ticket.totalRevenue);
      const cost = Number(ticket.totalCost);

      return db.$transaction(async (tx) => {
        const move = await tx.move.create({
          data: {
            companyId,
            moveType: "ENTRY",
            state: "POSTED",
            date: ticket.departureDate,
            journalId: journal.id,
            currencyId: currency.id,
            companyCurrencyId: currency.id,
            amountUntaxed: new Decimal(revenue).toDecimalPlaces(4).toNumber(),
            amountTotal: new Decimal(revenue).toDecimalPlaces(4).toNumber(),
            narration: `Flight Ticket ${ticket.code} — ${ticket.origin} → ${ticket.destination}`,
            postedAt: new Date(),
            lineItems: {
              create: [
                {
                  accountId: receivableAcc.id,
                  name: `Flight Revenue — ${ticket.code}`,
                  debit: new Decimal(revenue).toDecimalPlaces(4).toNumber(),
                  credit: 0,
                  balance: new Decimal(revenue).toDecimalPlaces(4).toNumber(),
                  sequence: 10,
                },
                {
                  accountId: revenueAcc.id,
                  name: `Flight Revenue — ${ticket.code}`,
                  debit: 0,
                  credit: new Decimal(revenue).toDecimalPlaces(4).toNumber(),
                  balance: new Decimal(-revenue).toDecimalPlaces(4).toNumber(),
                  sequence: 20,
                },
                {
                  accountId: expenseAcc.id,
                  name: `Flight Cost — ${ticket.code}`,
                  debit: new Decimal(cost).toDecimalPlaces(4).toNumber(),
                  credit: 0,
                  balance: new Decimal(cost).toDecimalPlaces(4).toNumber(),
                  sequence: 30,
                },
                {
                  accountId: payableAcc.id,
                  name: `Flight Cost — ${ticket.code}`,
                  debit: 0,
                  credit: new Decimal(cost).toDecimalPlaces(4).toNumber(),
                  balance: new Decimal(-cost).toDecimalPlaces(4).toNumber(),
                  sequence: 40,
                },
              ],
            },
          },
        });

        return tx.opsFlightTicket.update({
          where: { id: input.id },
          data: { status: "POSTED", journalMoveId: move.id },
        });
      });
    }),

  cancel: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      if (ticket.status === "POSTED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot cancel a posted ticket. Reverse the journal entry first." });
      }
      return ctx.db.opsFlightTicket.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      if (ticket.status === "POSTED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete a posted ticket." });
      }
      return ctx.db.opsFlightTicket.delete({ where: { id: input.id } });
    }),
});
