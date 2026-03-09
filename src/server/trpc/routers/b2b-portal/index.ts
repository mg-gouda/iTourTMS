import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { searchAvailability } from "@/server/services/b2c/availability";

const proc = moduleProcedure("b2b-portal");

// ---------------------------------------------------------------------------
// Tour Operator sub-router
// ---------------------------------------------------------------------------
const tourOperatorRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          partnerType: z.string().optional(),
          active: z.boolean().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TourOperatorWhereInput = {
        companyId: ctx.companyId,
        partnerType: input?.partnerType ?? "tour_operator",
      };
      if (input?.active !== undefined) where.active = input.active;
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { code: { contains: input.search, mode: "insensitive" } },
        ];
      }
      return ctx.db.tourOperator.findMany({
        where,
        include: {
          country: true,
          market: true,
          _count: {
            select: {
              contractAssignments: true,
              hotelAssignments: true,
              bookings: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: true,
          market: true,
          contractAssignments: {
            include: { contract: { include: { hotel: { select: { id: true, name: true } } } } },
          },
          hotelAssignments: { include: { hotel: true } },
          markupRules: true,
          tariffs: { include: { contract: { select: { id: true, code: true, name: true } } } },
        },
      });
      if (!record)
        throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });
      return record;
    }),

  create: proc
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        countryId: z.string().optional(),
        marketId: z.string().optional(),
        active: z.boolean().optional(),
        partnerType: z.string().default("tour_operator"),
        creditLimit: z.number().optional(),
        paymentTermDays: z.number().int().optional(),
        commissionPct: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          code: z.string().min(1).optional(),
          contactPerson: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          countryId: z.string().optional(),
          marketId: z.string().optional(),
          active: z.boolean().optional(),
          creditLimit: z.number().optional(),
          paymentTermDays: z.number().int().optional(),
          commissionPct: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});

// ---------------------------------------------------------------------------
// Travel Agent sub-router (same model, filtered to partnerType="travel_agent")
// ---------------------------------------------------------------------------
const travelAgentRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          active: z.boolean().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TourOperatorWhereInput = {
        companyId: ctx.companyId,
        partnerType: "travel_agent",
      };
      if (input?.active !== undefined) where.active = input.active;
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { code: { contains: input.search, mode: "insensitive" } },
        ];
      }
      return ctx.db.tourOperator.findMany({
        where,
        include: {
          country: true,
          market: true,
          _count: {
            select: {
              contractAssignments: true,
              hotelAssignments: true,
              bookings: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId, partnerType: "travel_agent" },
        include: {
          country: true,
          market: true,
          contractAssignments: {
            include: { contract: { include: { hotel: { select: { id: true, name: true } } } } },
          },
          hotelAssignments: { include: { hotel: true } },
          markupRules: true,
          tariffs: { include: { contract: { select: { id: true, code: true, name: true } } } },
        },
      });
      if (!record)
        throw new TRPCError({ code: "NOT_FOUND", message: "Travel agent not found" });
      return record;
    }),

  create: proc
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        countryId: z.string().optional(),
        marketId: z.string().optional(),
        active: z.boolean().optional(),
        creditLimit: z.number().optional(),
        paymentTermDays: z.number().int().optional(),
        commissionPct: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.create({
        data: { ...input, companyId: ctx.companyId, partnerType: "travel_agent" },
      });
    }),

  update: proc
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          code: z.string().min(1).optional(),
          contactPerson: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          countryId: z.string().optional(),
          marketId: z.string().optional(),
          active: z.boolean().optional(),
          creditLimit: z.number().optional(),
          paymentTermDays: z.number().int().optional(),
          commissionPct: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify it's a travel agent before deleting
      const agent = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId, partnerType: "travel_agent" },
      });
      if (!agent)
        throw new TRPCError({ code: "NOT_FOUND", message: "Travel agent not found" });
      return ctx.db.tourOperator.delete({
        where: { id: input.id },
      });
    }),
});

// ---------------------------------------------------------------------------
// Reservation sub-router
// ---------------------------------------------------------------------------
const reservationRouter = createTRPCRouter({
  list: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        status: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        companyId: ctx.companyId,
        source: "TOUR_OPERATOR",
      };
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.status) where.status = input.status as Prisma.EnumBookingStatusFilter["equals"];
      if (input.dateFrom || input.dateTo) {
        where.checkIn = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }
      if (input.search) {
        where.OR = [
          { code: { contains: input.search, mode: "insensitive" } },
          { leadGuestName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.db.booking.findMany({
          where,
          include: {
            hotel: { select: { id: true, name: true } },
            tourOperator: { select: { id: true, name: true, code: true } },
            currency: { select: { id: true, code: true, symbol: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.booking.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          hotel: { select: { id: true, name: true, code: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          currency: true,
          contract: { select: { id: true, code: true, name: true } },
          rooms: {
            include: {
              roomType: true,
              mealBasis: true,
              guests: { include: { guest: true } },
            },
          },
          guests: { include: { guest: true } },
          payments: { include: { currency: true, createdBy: true }, orderBy: { paidAt: "desc" } },
          timeline: { include: { user: true }, orderBy: { createdAt: "desc" } },
          vouchers: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
      if (!booking)
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      return booking;
    }),
});

// ---------------------------------------------------------------------------
// Voucher sub-router
// ---------------------------------------------------------------------------
const voucherRouter = createTRPCRouter({
  list: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        status: z.enum(["ISSUED", "USED", "CANCELLED"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.VoucherWhereInput = {
        companyId: ctx.companyId,
        booking: {
          source: "TOUR_OPERATOR",
          ...(input.tourOperatorId ? { tourOperatorId: input.tourOperatorId } : {}),
        },
      };
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        ctx.db.voucher.findMany({
          where,
          include: {
            booking: {
              include: {
                hotel: { select: { id: true, name: true } },
                tourOperator: { select: { id: true, name: true, code: true } },
              },
            },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.voucher.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  generate: proc
    .input(
      z.object({
        bookingId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify booking exists and belongs to company
      const booking = await ctx.db.booking.findFirst({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      if (!booking)
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      // Generate voucher code via Sequence
      const code = await ctx.db.$transaction(async (tx) => {
        const seq = await tx.sequence.upsert({
          where: {
            companyId_code: { companyId: ctx.companyId, code: "voucher" },
          },
          update: { nextNumber: { increment: 1 } },
          create: {
            companyId: ctx.companyId,
            code: "voucher",
            prefix: "VC",
            separator: "-",
            padding: 5,
            nextNumber: 2,
          },
        });
        const num = seq.nextNumber - 1;
        return `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;
      });

      return ctx.db.voucher.create({
        data: {
          companyId: ctx.companyId,
          code,
          bookingId: input.bookingId,
          notes: input.notes,
          createdById: userId,
        },
        include: {
          booking: {
            include: {
              hotel: { select: { id: true, name: true } },
              tourOperator: { select: { id: true, name: true } },
            },
          },
        },
      });
    }),
});

// ---------------------------------------------------------------------------
// Rate Sheet sub-router (uses Tariff model)
// ---------------------------------------------------------------------------
const rateSheetRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          tourOperatorId: z.string().optional(),
          contractId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TariffWhereInput = { companyId: ctx.companyId };
      if (input?.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input?.contractId) where.contractId = input.contractId;

      return ctx.db.tariff.findMany({
        where,
        include: {
          contract: { select: { id: true, code: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          markupRule: { select: { id: true, name: true, markupType: true, value: true } },
        },
        orderBy: { generatedAt: "desc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tariff = await ctx.db.tariff.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contract: { select: { id: true, code: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          markupRule: true,
        },
      });
      if (!tariff)
        throw new TRPCError({ code: "NOT_FOUND", message: "Rate sheet not found" });
      return tariff;
    }),
});

// ---------------------------------------------------------------------------
// Markup sub-router
// ---------------------------------------------------------------------------
const markupRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          tourOperatorId: z.string().optional(),
          active: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.MarkupRuleWhereInput = { companyId: ctx.companyId };
      if (input?.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input?.active !== undefined) where.active = input.active;

      return ctx.db.markupRule.findMany({
        where,
        include: {
          contract: { select: { id: true, code: true, name: true } },
          hotel: { select: { id: true, name: true } },
          destination: { select: { id: true, name: true } },
          market: { select: { id: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ priority: "desc" }, { name: "asc" }],
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rule = await ctx.db.markupRule.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contract: { select: { id: true, code: true, name: true } },
          hotel: { select: { id: true, name: true } },
          destination: { select: { id: true, name: true } },
          market: { select: { id: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          tariffs: true,
        },
      });
      if (!rule)
        throw new TRPCError({ code: "NOT_FOUND", message: "Markup rule not found" });
      return rule;
    }),

  create: proc
    .input(
      z.object({
        name: z.string().min(1),
        markupType: z.enum(["PERCENTAGE", "FIXED_PER_NIGHT", "FIXED_PER_BOOKING"]),
        value: z.number(),
        contractId: z.string().optional(),
        hotelId: z.string().optional(),
        destinationId: z.string().optional(),
        marketId: z.string().optional(),
        tourOperatorId: z.string().optional(),
        priority: z.number().int().default(0),
        active: z.boolean().default(true),
        validFrom: z.date().optional(),
        validTo: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.markupRule.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          markupType: z.enum(["PERCENTAGE", "FIXED_PER_NIGHT", "FIXED_PER_BOOKING"]).optional(),
          value: z.number().optional(),
          contractId: z.string().optional(),
          hotelId: z.string().optional(),
          destinationId: z.string().optional(),
          marketId: z.string().optional(),
          tourOperatorId: z.string().optional(),
          priority: z.number().int().optional(),
          active: z.boolean().optional(),
          validFrom: z.date().optional(),
          validTo: z.date().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.markupRule.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Markup rule not found" });
      return ctx.db.markupRule.update({ where: { id: input.id }, data: input.data });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.markupRule.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Markup rule not found" });
      return ctx.db.markupRule.delete({ where: { id: input.id } });
    }),
});

// ---------------------------------------------------------------------------
// Credit sub-router
// ---------------------------------------------------------------------------
const creditRouter = createTRPCRouter({
  summary: proc
    .input(z.object({ tourOperatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const to = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: {
          id: true,
          name: true,
          creditLimit: true,
          creditUsed: true,
        },
      });
      if (!to)
        throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

      const recentTx = await ctx.db.b2bCreditTransaction.findMany({
        where: { tourOperatorId: input.tourOperatorId, companyId: ctx.companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          booking: { select: { id: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      const creditLimit = Number(to.creditLimit);
      const creditUsed = Number(to.creditUsed);
      return {
        tourOperatorId: to.id,
        tourOperatorName: to.name,
        creditLimit,
        creditUsed,
        available: creditLimit - creditUsed,
        recentTransactions: recentTx,
      };
    }),

  listTransactions: proc
    .input(
      z.object({
        tourOperatorId: z.string(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        type: z.enum(["BOOKING_CHARGE", "PAYMENT_RECEIVED", "CREDIT_NOTE", "ADJUSTMENT"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.B2bCreditTransactionWhereInput = {
        companyId: ctx.companyId,
        tourOperatorId: input.tourOperatorId,
      };
      if (input.type) where.type = input.type;
      if (input.dateFrom || input.dateTo) {
        where.createdAt = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }

      const [items, total] = await Promise.all([
        ctx.db.b2bCreditTransaction.findMany({
          where,
          include: {
            booking: { select: { id: true, code: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.b2bCreditTransaction.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  recordPayment: proc
    .input(
      z.object({
        tourOperatorId: z.string(),
        amount: z.number().positive(),
        reference: z.string().optional(),
        bookingId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      return ctx.db.$transaction(async (tx) => {
        const to = await tx.tourOperator.findFirst({
          where: { id: input.tourOperatorId, companyId: ctx.companyId },
        });
        if (!to)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

        const newCreditUsed = Number(to.creditUsed) - input.amount;

        await tx.tourOperator.update({
          where: { id: input.tourOperatorId },
          data: { creditUsed: newCreditUsed },
        });

        return tx.b2bCreditTransaction.create({
          data: {
            companyId: ctx.companyId,
            tourOperatorId: input.tourOperatorId,
            type: "PAYMENT_RECEIVED",
            amount: input.amount,
            runningBalance: newCreditUsed,
            reference: input.reference,
            bookingId: input.bookingId,
            notes: input.notes,
            createdById: userId,
          },
        });
      });
    }),

  adjustment: proc
    .input(
      z.object({
        tourOperatorId: z.string(),
        amount: z.number(), // positive = credit (reduce used), negative = debit (increase used)
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      return ctx.db.$transaction(async (tx) => {
        const to = await tx.tourOperator.findFirst({
          where: { id: input.tourOperatorId, companyId: ctx.companyId },
        });
        if (!to)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

        const newCreditUsed = Number(to.creditUsed) - input.amount;

        await tx.tourOperator.update({
          where: { id: input.tourOperatorId },
          data: { creditUsed: newCreditUsed },
        });

        return tx.b2bCreditTransaction.create({
          data: {
            companyId: ctx.companyId,
            tourOperatorId: input.tourOperatorId,
            type: "ADJUSTMENT",
            amount: input.amount,
            runningBalance: newCreditUsed,
            reference: input.reference,
            notes: input.notes,
            createdById: userId,
          },
        });
      });
    }),
});

// ---------------------------------------------------------------------------
// Reports sub-router
// ---------------------------------------------------------------------------
const reportsRouter = createTRPCRouter({
  bookingSummary: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        companyId: ctx.companyId,
        source: "TOUR_OPERATOR",
      };
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.dateFrom || input.dateTo) {
        where.checkIn = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }

      const bookings = await ctx.db.booking.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
        _sum: { sellingTotal: true, buyingTotal: true, markupAmount: true },
      });

      const totalBookings = await ctx.db.booking.count({ where });

      return {
        totalBookings,
        byStatus: bookings.map((b) => ({
          status: b.status,
          count: b._count.id,
          sellingTotal: b._sum.sellingTotal ? Number(b._sum.sellingTotal) : 0,
          buyingTotal: b._sum.buyingTotal ? Number(b._sum.buyingTotal) : 0,
          markupAmount: b._sum.markupAmount ? Number(b._sum.markupAmount) : 0,
        })),
      };
    }),

  revenueSummary: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        groupBy: z.enum(["month", "week", "day"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        companyId: ctx.companyId,
        source: "TOUR_OPERATOR",
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
      };
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.dateFrom || input.dateTo) {
        where.checkIn = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }

      // Group by tour operator for breakdown
      const byTO = await ctx.db.booking.groupBy({
        by: ["tourOperatorId"],
        where,
        _count: { id: true },
        _sum: { sellingTotal: true, buyingTotal: true, markupAmount: true },
      });

      // Get TO names
      const toIds = byTO
        .map((r) => r.tourOperatorId)
        .filter((id): id is string => !!id);
      const tos = await ctx.db.tourOperator.findMany({
        where: { id: { in: toIds } },
        select: { id: true, name: true, code: true },
      });
      const toMap = new Map(tos.map((t) => [t.id, t]));

      return byTO.map((r) => ({
        tourOperatorId: r.tourOperatorId,
        tourOperator: r.tourOperatorId ? toMap.get(r.tourOperatorId) : null,
        bookingCount: r._count.id,
        sellingTotal: r._sum.sellingTotal ? Number(r._sum.sellingTotal) : 0,
        buyingTotal: r._sum.buyingTotal ? Number(r._sum.buyingTotal) : 0,
        markup: r._sum.markupAmount ? Number(r._sum.markupAmount) : 0,
      }));
    }),

  statement: proc
    .input(
      z.object({
        tourOperatorId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get TO info
      const to = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: { id: true, name: true, code: true, creditLimit: true, creditUsed: true },
      });
      if (!to)
        throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

      // Opening balance: sum of all transactions before dateFrom
      const openingTx = await ctx.db.b2bCreditTransaction.aggregate({
        where: {
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          createdAt: { lt: input.dateFrom },
        },
        _sum: { amount: true },
      });
      const openingBalance = openingTx._sum.amount
        ? Number(openingTx._sum.amount)
        : 0;

      // Transactions in period
      const transactions = await ctx.db.b2bCreditTransaction.findMany({
        where: {
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          createdAt: { gte: input.dateFrom, lte: input.dateTo },
        },
        include: {
          booking: { select: { id: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      // Closing balance
      const periodSum = transactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0
      );
      const closingBalance = openingBalance + periodSum;

      return {
        tourOperator: to,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        openingBalance,
        transactions,
        closingBalance,
        currentCreditUsed: Number(to.creditUsed),
        currentCreditLimit: Number(to.creditLimit),
      };
    }),
});

// ---------------------------------------------------------------------------
// Search sub-router (availability search for B2B)
// ---------------------------------------------------------------------------
const searchRouter = createTRPCRouter({
  availability: proc
    .input(
      z.object({
        destinationId: z.string().optional(),
        checkIn: z.string().min(1),
        checkOut: z.string().min(1),
        adults: z.number().int().min(1).default(2),
        children: z.number().int().min(0).default(0),
        childAges: z.array(z.number().int().min(0).max(17)).default([]),
        starRating: z.string().optional(),
        tourOperatorId: z.string().optional(),
        page: z.number().int().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await searchAvailability({
        companyId: ctx.companyId,
        destinationId: input.destinationId || undefined,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        adults: input.adults,
        children: input.children,
        childAges: input.childAges,
        starRating: input.starRating,
        page: input.page,
        pageSize: 20,
        sort: "price_asc",
      });

      // Strip B2C markup — B2B uses net rates
      for (const hotel of result.hotels) {
        for (const room of hotel.rooms) {
          room.displayTotal = room.total;
          room.markupAmount = 0;
          room.pricePerNight = room.total / hotel.nights;
        }
        hotel.cheapestTotal = Math.min(...hotel.rooms.map((r) => r.total));
        hotel.cheapestPerNight = hotel.cheapestTotal / hotel.nights;
      }

      return result;
    }),
});

// ---------------------------------------------------------------------------
// Partner User sub-router
// ---------------------------------------------------------------------------
const partnerUserRouter = createTRPCRouter({
  list: proc
    .input(z.object({ tourOperatorId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          companyId: ctx.companyId,
          tourOperatorId: input?.tourOperatorId ?? { not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          tourOperator: { select: { id: true, name: true, code: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: proc
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        tourOperatorId: z.string().min(1),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(input.password, 10);

      // Check email uniqueness
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existing)
        throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

      return ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hash,
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          isActive: input.isActive,
        },
      });
    }),

  toggleActive: proc
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  resetPassword: proc
    .input(z.object({ id: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(input.newPassword, 10);
      return ctx.db.user.update({
        where: { id: input.id },
        data: { password: hash },
      });
    }),
});

// ---------------------------------------------------------------------------
// Main B2B Portal Router
// ---------------------------------------------------------------------------
export const b2bPortalRouter = createTRPCRouter({
  tourOperator: tourOperatorRouter,
  travelAgent: travelAgentRouter,
  reservation: reservationRouter,
  voucher: voucherRouter,
  rateSheet: rateSheetRouter,
  markup: markupRouter,
  credit: creditRouter,
  reports: reportsRouter,
  search: searchRouter,
  partnerUser: partnerUserRouter,
});
