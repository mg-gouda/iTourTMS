import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { formatSeasonLabel } from "@/lib/utils";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const reportsRouter = createTRPCRouter({
  /**
   * Contract Summary – groups contracts by hotel, status, or currency.
   */
  contractSummary: proc
    .input(
      z
        .object({
          groupBy: z.enum(["hotel", "status", "currency"]).default("hotel"),
        })
        .default({ groupBy: "hotel" })
    )
    .query(async ({ ctx, input }) => {
      const contracts = await ctx.db.contract.findMany({
        where: { companyId: ctx.companyId, isTemplate: false },
        include: {
          hotel: { select: { id: true, name: true } },
          baseCurrency: { select: { id: true, code: true } },
          _count: { select: { seasons: true, roomTypes: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Build a flat list of contract summaries
      const contractSummaries = contracts.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status,
        validFrom: c.validFrom,
        validTo: c.validTo,
        hotelName: c.hotel.name,
        currencyCode: c.baseCurrency.code,
        seasonCount: c._count.seasons,
        roomTypeCount: c._count.roomTypes,
      }));

      // Group by the requested dimension
      const grouped = new Map<
        string,
        { groupKey: string; groupLabel: string; contracts: typeof contractSummaries }
      >();

      for (const cs of contractSummaries) {
        let key: string;
        let label: string;

        switch (input.groupBy) {
          case "hotel":
            key = cs.hotelName;
            label = cs.hotelName;
            break;
          case "status":
            key = cs.status;
            label = cs.status;
            break;
          case "currency":
            key = cs.currencyCode;
            label = cs.currencyCode;
            break;
        }

        if (!grouped.has(key)) {
          grouped.set(key, { groupKey: key, groupLabel: label, contracts: [] });
        }
        grouped.get(key)!.contracts.push(cs);
      }

      // Compute aggregate stats per group
      const groups = Array.from(grouped.values()).map((g) => ({
        groupKey: g.groupKey,
        groupLabel: g.groupLabel,
        contractCount: g.contracts.length,
        avgSeasons:
          g.contracts.length > 0
            ? Math.round(
                (g.contracts.reduce((sum, c) => sum + c.seasonCount, 0) /
                  g.contracts.length) *
                  100
              ) / 100
            : 0,
        avgRoomTypes:
          g.contracts.length > 0
            ? Math.round(
                (g.contracts.reduce((sum, c) => sum + c.roomTypeCount, 0) /
                  g.contracts.length) *
                  100
              ) / 100
            : 0,
        contracts: g.contracts,
      }));

      return groups;
    }),

  /**
   * Rate Comparison – returns all contracts for a specific hotel with
   * their seasons and base rates so they can be compared side-by-side.
   */
  rateComparison: proc
    .input(z.object({ hotelId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the hotel belongs to the current company
      const hotel = await ctx.db.hotel.findFirst({
        where: { id: input.hotelId, companyId: ctx.companyId },
        select: { id: true, name: true },
      });

      if (!hotel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hotel not found or does not belong to your company.",
        });
      }

      const contracts = await ctx.db.contract.findMany({
        where: {
          companyId: ctx.companyId,
          hotelId: input.hotelId,
          isTemplate: false,
        },
        include: {
          seasons: { orderBy: { sortOrder: "asc" } },
          baseRates: {
            include: {
              season: { select: { id: true, dateFrom: true, dateTo: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        hotelName: hotel.name,
        contracts,
      };
    }),

  /**
   * Season Coverage – returns contracts with their season date ranges
   * so a timeline / coverage chart can be rendered.
   */
  seasonCoverage: proc
    .input(
      z
        .object({
          hotelId: z.string().optional(),
        })
        .default({})
    )
    .query(async ({ ctx, input }) => {
      const where: {
        companyId: string;
        isTemplate: boolean;
        hotelId?: string;
      } = {
        companyId: ctx.companyId,
        isTemplate: false,
      };

      if (input.hotelId) {
        // Verify the hotel belongs to the company
        const hotel = await ctx.db.hotel.findFirst({
          where: { id: input.hotelId, companyId: ctx.companyId },
          select: { id: true },
        });

        if (!hotel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hotel not found or does not belong to your company.",
          });
        }

        where.hotelId = input.hotelId;
      }

      const contracts = await ctx.db.contract.findMany({
        where,
        include: {
          hotel: { select: { id: true, name: true } },
          seasons: {
            select: {
              id: true,
              dateFrom: true,
              dateTo: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return contracts;
    }),

  /**
   * Seasonal Offers Report – offers grouped by season with conditions.
   */
  seasonalOffers: proc
    .input(
      z
        .object({
          hotelId: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const contractWhere: Record<string, unknown> = {
        companyId: ctx.companyId,
        isTemplate: false,
      };
      if (input.hotelId) contractWhere.hotelId = input.hotelId;

      const contracts = await ctx.db.contract.findMany({
        where: contractWhere,
        include: {
          hotel: { select: { id: true, name: true } },
          seasons: {
            select: { id: true, dateFrom: true, dateTo: true },
            orderBy: { sortOrder: "asc" },
          },
          specialOffers: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return contracts.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        hotelName: c.hotel.name,
        seasons: c.seasons,
        offers: c.specialOffers.map((o) => ({
          id: o.id,
          name: o.name,
          offerType: o.offerType,
          discountType: o.discountType,
          discountValue: o.discountValue.toString(),
          validFrom: o.validFrom,
          validTo: o.validTo,
          bookByDate: o.bookByDate,
          minimumNights: o.minimumNights,
          advanceBookDays: o.advanceBookDays,
          stayNights: o.stayNights,
          payNights: o.payNights,
          combinable: o.combinable,
        })),
      }));
    }),

  /**
   * EBD Conditions Report – cross-contract EBD comparison matrix.
   */
  ebdConditions: proc
    .input(
      z
        .object({
          hotelId: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const contractWhere: Record<string, unknown> = {
        companyId: ctx.companyId,
        isTemplate: false,
      };
      if (input.hotelId) contractWhere.hotelId = input.hotelId;

      const contracts = await ctx.db.contract.findMany({
        where: contractWhere,
        include: {
          hotel: { select: { id: true, name: true } },
          specialOffers: {
            where: { active: true, offerType: "EARLY_BIRD" },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return contracts
        .filter((c) => c.specialOffers.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          hotelName: c.hotel.name,
          ebdOffers: c.specialOffers.map((o) => ({
            id: o.id,
            name: o.name,
            discountType: o.discountType,
            discountValue: o.discountValue.toString(),
            bookByDate: o.bookByDate,
            bookFromDate: o.bookFromDate,
            advanceBookDays: o.advanceBookDays,
            validFrom: o.validFrom,
            validTo: o.validTo,
            minimumNights: o.minimumNights,
            stayDateType: o.stayDateType,
            paymentPct: o.paymentPct,
            paymentDeadline: o.paymentDeadline,
            roomingListBy: o.roomingListBy,
          })),
        }));
    }),

  /**
   * Allotment Utilization Report – utilization percentages per contract/room type.
   */
  allotmentUtilization: proc
    .input(
      z
        .object({
          hotelId: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const contractWhere: Record<string, unknown> = {
        companyId: ctx.companyId,
        isTemplate: false,
      };
      if (input.hotelId) contractWhere.hotelId = input.hotelId;

      const contracts = await ctx.db.contract.findMany({
        where: contractWhere,
        select: {
          id: true,
          name: true,
          code: true,
          hotel: { select: { id: true, name: true } },
          allotments: {
            include: {
              season: { select: { id: true, dateFrom: true, dateTo: true } },
              roomType: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return contracts
        .filter((c) => c.allotments.length > 0)
        .map((c) => {
          const totalRooms = c.allotments.reduce((s, a) => s + a.totalRooms, 0);
          const soldRooms = c.allotments.reduce((s, a) => s + a.soldRooms, 0);
          const utilization = totalRooms > 0 ? Math.round((soldRooms / totalRooms) * 100) : 0;

          return {
            id: c.id,
            name: c.name,
            code: c.code,
            hotelName: c.hotel.name,
            totalRooms,
            soldRooms,
            utilization,
            allotments: c.allotments.map((a) => ({
              id: a.id,
              roomTypeName: a.roomType.name,
              roomTypeCode: a.roomType.code,
              seasonName: formatSeasonLabel(a.season.dateFrom, a.season.dateTo),
              basis: a.basis,
              totalRooms: a.totalRooms,
              soldRooms: a.soldRooms,
              freeSale: a.freeSale,
              utilization: a.totalRooms > 0 ? Math.round((a.soldRooms / a.totalRooms) * 100) : 0,
            })),
          };
        });
    }),
});
