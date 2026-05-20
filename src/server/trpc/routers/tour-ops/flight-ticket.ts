import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import type { OpsFlightTicketStatus, OpsFlightType, OpsMarkupType, OpsPricingBasis, OpsFlightTxType } from "@prisma/client";
import { createFlightTicketAccountingMoves } from "@/server/services/tour-ops/flight-ticket-accounting";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);

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

const fareLineSchema = z.object({
  sequence: z.number().int().min(1),
  passengerLabel: z.string().optional(),
  classCode: z.string().optional(),
  baseFare: z.number().min(0).default(0),
  taxes: z.number().min(0).default(0),
  aviationCommType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  aviationCommValue: z.number().min(0).default(0),
  employeeId: z.string().optional(),
  empCommType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  empCommValue: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
});

function calcFareLine(input: {
  baseFare: number;
  taxes: number;
  aviationCommType: string;
  aviationCommValue: number;
  empCommType: string;
  empCommValue: number;
  sellingPrice: number;
}) {
  const base = new Decimal(input.baseFare);
  const taxes = new Decimal(input.taxes);
  const aviationComm =
    input.aviationCommType === "PERCENTAGE"
      ? base.times(input.aviationCommValue).div(100)
      : new Decimal(input.aviationCommValue);
  const empComm =
    input.empCommType === "PERCENTAGE"
      ? base.times(input.empCommValue).div(100)
      : new Decimal(input.empCommValue);
  const totalCost = base.plus(taxes).plus(empComm).minus(aviationComm);
  const selling = new Decimal(input.sellingPrice);
  const profit = selling.minus(totalCost);
  const marginPct = totalCost.gt(0) ? profit.div(totalCost).times(100) : new Decimal(0);
  return {
    aviationCommAmount: aviationComm.toDecimalPlaces(2).toNumber(),
    empCommAmount: empComm.toDecimalPlaces(2).toNumber(),
    totalCost: totalCost.toDecimalPlaces(2).toNumber(),
    profit: profit.toDecimalPlaces(2).toNumber(),
    marginPct: marginPct.toDecimalPlaces(4).toNumber(),
  };
}

function calcPnLFromFareLines(fareLines: Array<{ totalCost: number; sellingPrice: number }>) {
  const totalCost = fareLines.reduce((s, l) => s + l.totalCost, 0);
  const totalRevenue = fareLines.reduce((s, l) => s + l.sellingPrice, 0);
  const profit = totalRevenue - totalCost;
  const marginPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return { totalCost, totalRevenue, profit, marginPct };
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
  // Transaction & accounting
  transactionType: z.enum(["ISSUE", "REISSUE", "REFUND", "VOID", "REVALIDATE"]).default("ISSUE"),
  vendorId: z.string().optional(),
  customerPartnerId: z.string().optional(),
  changeFees: z.number().optional(),
  priceDifference: z.number().optional(),
  cancellationFees: z.number().optional(),
  voidFee: z.number().optional(),
  // Fare lines (individual pricing per passenger/class)
  fareLines: z.array(fareLineSchema).optional(),
  // Legacy aggregate fields (kept for MULTI_LEG / BULK compatibility)
  pricingBasis: z.enum(["PER_PERSON", "BULK"]).default("PER_PERSON"),
  pax: z.number().int().min(1).default(1),
  buyingRate: z.number().min(0).default(0),
  sellingRate: z.number().min(0).default(0),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  commissionValue: z.number().min(0).default(0),
  notes: z.string().optional(),
  createAccountingMoves: z.boolean().default(false),
  parentTicketId: z.string().optional(),
  currencyId: z.string().optional(),
});

export const opsFlightTicketRouter = createTRPCRouter({
  list: p("tour-ops:flightTicket:read")
    .input(
      z.object({
        status: z.string().optional(),
        flightType: z.string().optional(),
        transactionType: z.string().optional(),
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
      if (input?.transactionType && input.transactionType !== "ALL") where.transactionType = input.transactionType;
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
            vendor: { select: { id: true, name: true } },
            customerPartner: { select: { id: true, name: true } },
            fareLines: { orderBy: { sequence: "asc" } },
          },
          orderBy: { departureDate: "desc" },
          skip,
          take: input?.pageSize ?? 50,
        }),
        db.opsFlightTicket.count({ where }),
      ]);
      return { items, total };
    }),

  getById: p("tour-ops:flightTicket:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          opsFile: { select: { id: true, code: true } },
          createdBy: { select: { name: true } },
          legs: { orderBy: { sequence: "asc" } },
          vendor: { select: { id: true, name: true } },
          customerPartner: { select: { id: true, name: true } },
          vendorMove: { select: { id: true, name: true, state: true, amountTotal: true } },
          customerMove: { select: { id: true, name: true, state: true, amountTotal: true } },
          fareLines: {
            orderBy: { sequence: "asc" },
            include: { employee: { select: { id: true, name: true } } },
          },
          parentTicket: { select: { id: true, code: true, ticketNumber: true } },
          derivedTickets: { select: { id: true, code: true, ticketNumber: true, transactionType: true } },
          currency: { select: { id: true, code: true, symbol: true } },
        },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      return ticket;
    }),

  // ── Lookup queries for dropdowns ──────────────────────────────────────────

  listVendors: p("tour-ops:flightTicket:read").query(async ({ ctx }) => {
    return ctx.db.partner.findMany({
      where: {
        companyId: ctx.companyId,
        type: "supplier",
        isActive: true,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }),

  listCustomers: p("tour-ops:flightTicket:read").query(async ({ ctx }) => {
    return ctx.db.partner.findMany({
      where: {
        companyId: ctx.companyId,
        type: { in: ["customer", "individual", "corporate"] },
        isActive: true,
      },
      select: { id: true, name: true, isCompany: true },
      orderBy: { name: "asc" },
    });
  }),

  listEmployees: p("tour-ops:flightTicket:read").query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: {
        companyId: ctx.companyId,
        isActive: true,
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }),

  listForLinking: p("tour-ops:flightTicket:read")
    .input(z.object({ opsFileId: z.string().optional(), excludeId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsFlightTicket.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.opsFileId ? { opsFileId: input.opsFileId } : {}),
          ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
        },
        select: {
          id: true,
          code: true,
          ticketNumber: true,
          clientName: true,
          origin: true,
          destination: true,
          departureDate: true,
          returnDate: true,
          airline: true,
          flightNumber: true,
          returnFlightNumber: true,
          flightType: true,
          takeOffTime: true,
          terminal: true,
          returnTakeOffTime: true,
          returnTerminal: true,
          returnAirline: true,
          transactionType: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }),

  listCurrencies: p("tour-ops:flightTicket:read").query(async ({ ctx }) => {
    return ctx.db.currency.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, symbol: true },
      orderBy: { code: "asc" },
    });
  }),

  // ── Create ────────────────────────────────────────────────────────────────

  create: p("tour-ops:flightTicket:create")
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const { companyId, db, session } = ctx;
      const seq = await db.sequence.upsert({
        where: { companyId_code: { companyId, code: "ops_flight_ticket" } },
        create: { companyId, code: "ops_flight_ticket", prefix: "TK", separator: "-", padding: 5, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const code = `${seq.prefix}${seq.separator}${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;

      // Compute fare lines
      const computedFareLines = (input.fareLines ?? []).map((fl, i) => {
        const calc = calcFareLine(fl);
        return { ...fl, ...calc, sequence: i + 1 };
      });

      // Aggregate PnL from fare lines (if present), else use legacy fields
      let totalCost: number, totalRevenue: number, profit: number, marginPct: number;
      let buyingRate = input.buyingRate;
      let sellingRate = input.sellingRate;

      if (computedFareLines.length > 0) {
        const agg = calcPnLFromFareLines(computedFareLines);
        totalCost = agg.totalCost;
        totalRevenue = agg.totalRevenue;
        profit = agg.profit;
        marginPct = agg.marginPct;
        buyingRate = totalCost;
        sellingRate = totalRevenue;
      } else {
        const mult = input.pricingBasis === "PER_PERSON" ? input.pax : 1;
        const tb = new Decimal(buyingRate).times(mult);
        const tr = new Decimal(sellingRate).times(mult);
        const commAmount =
          input.commissionType === "PERCENTAGE"
            ? tb.times(input.commissionValue).div(100)
            : new Decimal(input.commissionValue);
        totalCost = tb.plus(commAmount).toDecimalPlaces(2).toNumber();
        totalRevenue = tr.toDecimalPlaces(2).toNumber();
        profit = tr.minus(tb.plus(commAmount)).toDecimalPlaces(2).toNumber();
        marginPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
      }

      const ticket = await db.opsFlightTicket.create({
        data: {
          companyId,
          code,
          opsFileId: input.opsFileId || null,
          clientName: input.clientName || null,
          issueDate: input.issueDate ? new Date(input.issueDate) : null,
          flightType: input.flightType as OpsFlightType,
          transactionType: input.transactionType as OpsFlightTxType,
          vendorId: input.vendorId || null,
          customerPartnerId: input.customerPartnerId || null,
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
          changeFees: input.changeFees ?? null,
          priceDifference: input.priceDifference ?? null,
          cancellationFees: input.cancellationFees ?? null,
          voidFee: input.voidFee ?? null,
          parentTicketId: input.parentTicketId || null,
          currencyId: input.currencyId || null,
          pricingBasis: input.pricingBasis as OpsPricingBasis,
          pax: input.pax,
          buyingRate,
          sellingRate,
          commissionType: input.commissionType as OpsMarkupType,
          commissionValue: input.commissionValue,
          commissionAmount: 0,
          totalCost,
          totalRevenue,
          profit,
          marginPct,
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
          fareLines: computedFareLines.length
            ? {
                create: computedFareLines.map((fl) => ({
                  sequence: fl.sequence,
                  passengerLabel: fl.passengerLabel || null,
                  classCode: fl.classCode || null,
                  baseFare: fl.baseFare,
                  taxes: fl.taxes,
                  aviationCommType: fl.aviationCommType as OpsMarkupType,
                  aviationCommValue: fl.aviationCommValue,
                  aviationCommAmount: fl.aviationCommAmount,
                  employeeId: fl.employeeId || null,
                  empCommType: fl.empCommType as OpsMarkupType,
                  empCommValue: fl.empCommValue,
                  empCommAmount: fl.empCommAmount,
                  totalCost: fl.totalCost,
                  sellingPrice: fl.sellingPrice,
                  profit: fl.profit,
                  marginPct: fl.marginPct,
                })),
              }
            : undefined,
        },
      });

      // Auto-create vendor bill + customer invoice if requested
      if (input.createAccountingMoves && (input.vendorId || input.customerPartnerId)) {
        await createFlightTicketAccountingMoves(
          {
            id: ticket.id,
            companyId,
            transactionType: input.transactionType as OpsFlightTxType,
            vendorId: input.vendorId || null,
            customerPartnerId: input.customerPartnerId || null,
            issueDate: input.issueDate ? new Date(input.issueDate) : null,
            clientName: input.clientName || null,
            ticketNumber: input.ticketNumber || null,
            changeFees: input.changeFees ?? null,
            priceDifference: input.priceDifference ?? null,
            cancellationFees: input.cancellationFees ?? null,
            voidFee: input.voidFee ?? null,
            fareLines: computedFareLines.map((fl) => ({
              passengerLabel: fl.passengerLabel,
              classCode: fl.classCode,
              totalCost: fl.totalCost,
              sellingPrice: fl.sellingPrice,
            })),
          },
          db as any,
        ).catch((e) => ctx.logger.error({ err: e }, "Failed to create accounting moves"));
      }

      return ticket;
    }),

  // ── Update ────────────────────────────────────────────────────────────────

  update: p("tour-ops:flightTicket:update")
    .input(z.object({ id: z.string(), data: createSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      if (ticket.status === "POSTED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit a posted flight ticket" });
      }

      return ctx.db.$transaction(async (tx) => {
        // Fare lines: bulk replace if provided
        const incomingFareLines = input.data.fareLines;
        type ComputedFL = { sequence: number; passengerLabel?: string; classCode?: string; baseFare: number; taxes: number; aviationCommType: string; aviationCommValue: number; aviationCommAmount: number; employeeId?: string; empCommType: string; empCommValue: number; empCommAmount: number; totalCost: number; sellingPrice: number; profit: number; marginPct: number };
        let computedFareLines: ComputedFL[] = [];
        if (incomingFareLines !== undefined) {
          await tx.opsFlightFareLine.deleteMany({ where: { ticketId: input.id } });
          if (incomingFareLines.length > 0) {
            computedFareLines = incomingFareLines.map((fl, i) => {
              const calc = calcFareLine(fl);
              return { ...fl, ...calc, sequence: i + 1 } as ComputedFL;
            });
            await tx.opsFlightFareLine.createMany({
              data: computedFareLines.map((fl) => ({
                ticketId: input.id,
                sequence: fl.sequence,
                passengerLabel: fl.passengerLabel || null,
                classCode: fl.classCode || null,
                baseFare: fl.baseFare,
                taxes: fl.taxes,
                aviationCommType: fl.aviationCommType as OpsMarkupType,
                aviationCommValue: fl.aviationCommValue,
                aviationCommAmount: fl.aviationCommAmount,
                employeeId: fl.employeeId || null,
                empCommType: fl.empCommType as OpsMarkupType,
                empCommValue: fl.empCommValue,
                empCommAmount: fl.empCommAmount,
                totalCost: fl.totalCost,
                sellingPrice: fl.sellingPrice,
                profit: fl.profit,
                marginPct: fl.marginPct,
              })),
            });
          }
        }

        // Leg lines: bulk replace if provided
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

        // Recompute PnL
        let totalCost: number, totalRevenue: number, profit: number, marginPct: number;
        if (computedFareLines.length > 0) {
          const agg = calcPnLFromFareLines(computedFareLines);
          totalCost = agg.totalCost;
          totalRevenue = agg.totalRevenue;
          profit = agg.profit;
          marginPct = agg.marginPct;
        } else {
          const pricingBasis = (input.data.pricingBasis ?? ticket.pricingBasis) as OpsPricingBasis;
          const pax = input.data.pax ?? ticket.pax;
          const buyingRate = input.data.buyingRate ?? Number(ticket.buyingRate);
          const sellingRate = input.data.sellingRate ?? Number(ticket.sellingRate);
          const commissionType = (input.data.commissionType ?? ticket.commissionType) as OpsMarkupType;
          const commissionValue = input.data.commissionValue ?? Number(ticket.commissionValue);
          const mult = pricingBasis === "PER_PERSON" ? pax : 1;
          const tb = new Decimal(buyingRate).times(mult);
          const tr = new Decimal(sellingRate).times(mult);
          const commAmount = commissionType === "PERCENTAGE" ? tb.times(commissionValue).div(100) : new Decimal(commissionValue);
          totalCost = tb.plus(commAmount).toDecimalPlaces(2).toNumber();
          totalRevenue = tr.toDecimalPlaces(2).toNumber();
          profit = tr.minus(tb.plus(commAmount)).toDecimalPlaces(2).toNumber();
          marginPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
        }

        return tx.opsFlightTicket.update({
          where: { id: input.id },
          data: {
            ...(input.data.opsFileId !== undefined && { opsFileId: input.data.opsFileId || null }),
            ...(input.data.clientName !== undefined && { clientName: input.data.clientName || null }),
            ...(input.data.issueDate !== undefined && { issueDate: input.data.issueDate ? new Date(input.data.issueDate) : null }),
            ...(input.data.flightType && { flightType: input.data.flightType as OpsFlightType }),
            ...(input.data.transactionType && { transactionType: input.data.transactionType as OpsFlightTxType }),
            ...(input.data.vendorId !== undefined && { vendorId: input.data.vendorId || null }),
            ...(input.data.customerPartnerId !== undefined && { customerPartnerId: input.data.customerPartnerId || null }),
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
            ...(input.data.changeFees !== undefined && { changeFees: input.data.changeFees ?? null }),
            ...(input.data.priceDifference !== undefined && { priceDifference: input.data.priceDifference ?? null }),
            ...(input.data.cancellationFees !== undefined && { cancellationFees: input.data.cancellationFees ?? null }),
            ...(input.data.voidFee !== undefined && { voidFee: input.data.voidFee ?? null }),
            ...(input.data.parentTicketId !== undefined && { parentTicketId: input.data.parentTicketId || null }),
            ...(input.data.currencyId !== undefined && { currencyId: input.data.currencyId || null }),
            ...(input.data.pricingBasis && { pricingBasis: input.data.pricingBasis as OpsPricingBasis }),
            ...(input.data.pax !== undefined && { pax: input.data.pax }),
            ...(input.data.buyingRate !== undefined && { buyingRate: input.data.buyingRate }),
            ...(input.data.sellingRate !== undefined && { sellingRate: input.data.sellingRate }),
            ...(input.data.commissionType && { commissionType: input.data.commissionType as OpsMarkupType }),
            ...(input.data.commissionValue !== undefined && { commissionValue: input.data.commissionValue }),
            totalCost,
            totalRevenue,
            profit,
            marginPct,
            ...(input.data.notes !== undefined && { notes: input.data.notes || null }),
          },
        });
      });
    }),

  // ── Post (generate P&L journal entry) ─────────────────────────────────────

  post: p("tour-ops:flightTicket:confirm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { companyId, db } = ctx;
      const ticket = await db.opsFlightTicket.findFirst({
        where: { id: input.id, companyId },
        include: { fareLines: true },
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

      const [receivableAcc, revenueAcc, expenseAcc, payableAcc, company] = await Promise.all([
        db.finAccount.findFirst({ where: { companyId, accountType: "ASSET_RECEIVABLE", deprecated: false } }),
        db.finAccount.findFirst({ where: { companyId, accountType: "INCOME", deprecated: false } }),
        db.finAccount.findFirst({ where: { companyId, accountType: "EXPENSE_DIRECT_COST", deprecated: false } }),
        db.finAccount.findFirst({ where: { companyId, accountType: "LIABILITY_PAYABLE", deprecated: false } }),
        db.company.findFirst({ where: { id: companyId }, select: { baseCurrencyId: true } }),
      ]);

      if (!receivableAcc || !revenueAcc || !expenseAcc || !payableAcc) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Required chart of accounts not configured (Receivable, Income, Direct Cost, Payable).",
        });
      }
      if (!company?.baseCurrencyId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Company has no base currency." });

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
            currencyId: company.baseCurrencyId!,
            companyCurrencyId: company.baseCurrencyId!,
            amountUntaxed: new Decimal(revenue).toDecimalPlaces(4).toNumber(),
            amountTotal: new Decimal(revenue).toDecimalPlaces(4).toNumber(),
            narration: `Flight Ticket ${ticket.code} — ${ticket.origin} → ${ticket.destination}`,
            postedAt: new Date(),
            lineItems: {
              create: [
                { accountId: receivableAcc.id, name: `Flight Revenue — ${ticket.code}`, debit: new Decimal(revenue).toDecimalPlaces(4).toNumber(), credit: 0, balance: new Decimal(revenue).toDecimalPlaces(4).toNumber(), sequence: 10 },
                { accountId: revenueAcc.id, name: `Flight Revenue — ${ticket.code}`, debit: 0, credit: new Decimal(revenue).toDecimalPlaces(4).toNumber(), balance: new Decimal(-revenue).toDecimalPlaces(4).toNumber(), sequence: 20 },
                { accountId: expenseAcc.id, name: `Flight Cost — ${ticket.code}`, debit: new Decimal(cost).toDecimalPlaces(4).toNumber(), credit: 0, balance: new Decimal(cost).toDecimalPlaces(4).toNumber(), sequence: 30 },
                { accountId: payableAcc.id, name: `Flight Cost — ${ticket.code}`, debit: 0, credit: new Decimal(cost).toDecimalPlaces(4).toNumber(), balance: new Decimal(-cost).toDecimalPlaces(4).toNumber(), sequence: 40 },
              ],
            },
          },
        });

        // Also create vendor bill + customer invoice if not already created
        if (!ticket.vendorMoveId && !ticket.customerMoveId) {
          await createFlightTicketAccountingMoves(
            {
              id: ticket.id,
              companyId,
              transactionType: ticket.transactionType,
              vendorId: ticket.vendorId,
              customerPartnerId: ticket.customerPartnerId,
              issueDate: ticket.issueDate,
              clientName: ticket.clientName,
              ticketNumber: ticket.ticketNumber,
              changeFees: ticket.changeFees ? Number(ticket.changeFees) : null,
              priceDifference: ticket.priceDifference ? Number(ticket.priceDifference) : null,
              cancellationFees: ticket.cancellationFees ? Number(ticket.cancellationFees) : null,
              voidFee: ticket.voidFee ? Number(ticket.voidFee) : null,
              fareLines: ticket.fareLines.map((fl) => ({
                passengerLabel: fl.passengerLabel,
                classCode: fl.classCode,
                totalCost: Number(fl.totalCost),
                sellingPrice: Number(fl.sellingPrice),
              })),
            },
            tx as any,
          ).catch(() => null);
        }

        return tx.opsFlightTicket.update({
          where: { id: input.id },
          data: { status: "POSTED", journalMoveId: move.id },
        });
      });
    }),

  cancel: p("tour-ops:flightTicket:cancel")
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

  delete: p("tour-ops:flightTicket:delete")
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
