import { z } from "zod";
import { createTRPCRouter } from "@/server/trpc";
import { moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("tour-ops");

export const tourOpsLookupRouter = createTRPCRouter({
  // List tour operators or travel agents (partnerType filter)
  tourOperators: proc
    .input(z.object({ partnerType: z.enum(["tour_operator", "travel_agent"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.tourOperator.findMany({
        where: {
          companyId: ctx.companyId,
          active: true,
          ...(input.partnerType ? { partnerType: input.partnerType } : {}),
        },
        select: { id: true, name: true, code: true, email: true, creditLimit: true, creditUsed: true },
        orderBy: { name: "asc" },
      });
    }),

  // List hotels that have at least one POSTED or PUBLISHED contract
  hotels: proc.query(async ({ ctx }) => {
    const hotels = await ctx.db.hotel.findMany({
      where: {
        companyId: ctx.companyId,
        active: true,
        contracts: { some: { status: { in: ["POSTED", "PUBLISHED"] } } },
      },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        starRating: true,
      },
      orderBy: { name: "asc" },
    });
    return hotels;
  }),

  // Given a hotel, return its room types and meal bases from active contracts,
  // plus the base rates for the season overlapping serviceDate.
  hotelRates: proc
    .input(
      z.object({
        hotelId: z.string(),
        serviceDate: z.string().optional(), // ISO date string for season matching
      })
    )
    .query(async ({ ctx, input }) => {
      const { hotelId, serviceDate } = input;
      const checkDate = serviceDate ? new Date(serviceDate) : new Date();

      // Find the best contract (PUBLISHED preferred, then POSTED) covering the date
      const contracts = await ctx.db.contract.findMany({
        where: {
          companyId: ctx.companyId,
          hotelId,
          status: { in: ["POSTED", "PUBLISHED"] },
        },
        include: {
          baseCurrency: { select: { code: true } },
          baseRoomType: { select: { id: true, name: true, code: true } },
          baseMealBasis: { select: { id: true, name: true, mealCode: true } },
          roomTypes: {
            include: {
              roomType: { select: { id: true, name: true, code: true } },
            },
          },
          mealBases: {
            include: {
              mealBasis: { select: { id: true, name: true, mealCode: true } },
            },
          },
          seasons: {
            include: {
              baseRates: true,
            },
          },
        },
        orderBy: [{ status: "desc" }, { validFrom: "desc" }],
      });

      if (contracts.length === 0) return null;

      // Prefer PUBLISHED, then most recent
      const contract = contracts.find((c) => c.status === "PUBLISHED") ?? contracts[0];

      // Find the season that overlaps checkDate
      const matchingSeason = contract.seasons.find(
        (s) => s.dateFrom <= checkDate && s.dateTo >= checkDate
      ) ?? contract.seasons[0]; // fallback to first season

      const baseRate = matchingSeason
        ? contract.seasons
            .flatMap((s) => s.baseRates)
            .find((r) => r.seasonId === matchingSeason?.id)
        : null;

      // Collect all room types (base + additional contracted)
      const roomTypeIds = new Set<string>();
      const roomTypes: { id: string; name: string; code: string }[] = [];

      if (contract.baseRoomType) {
        roomTypeIds.add(contract.baseRoomType.id);
        roomTypes.push(contract.baseRoomType);
      }
      for (const crt of contract.roomTypes) {
        if (!roomTypeIds.has(crt.roomType.id)) {
          roomTypeIds.add(crt.roomType.id);
          roomTypes.push(crt.roomType);
        }
      }

      // Collect all meal bases
      const mealBasisIds = new Set<string>();
      const mealBases: { id: string; name: string; mealCode: string }[] = [];

      if (contract.baseMealBasis) {
        mealBasisIds.add(contract.baseMealBasis.id);
        mealBases.push({
          id: contract.baseMealBasis.id,
          name: contract.baseMealBasis.name,
          mealCode: contract.baseMealBasis.mealCode,
        });
      }
      for (const cmb of contract.mealBases) {
        if (!mealBasisIds.has(cmb.mealBasis.id)) {
          mealBasisIds.add(cmb.mealBasis.id);
          mealBases.push({
            id: cmb.mealBasis.id,
            name: cmb.mealBasis.name,
            mealCode: cmb.mealBasis.mealCode,
          });
        }
      }

      return {
        contractId: contract.id,
        contractName: contract.name,
        currency: contract.baseCurrency.code,
        rateBasis: contract.rateBasis,
        rates: {
          singleRate: baseRate?.singleRate ? Number(baseRate.singleRate) : null,
          doubleRate: baseRate?.doubleRate ? Number(baseRate.doubleRate) : null,
          tripleRate: baseRate?.tripleRate ? Number(baseRate.tripleRate) : null,
          baseRate: baseRate?.rate ? Number(baseRate.rate) : null,
        },
        roomTypes,
        mealBases,
        season: matchingSeason
          ? {
              id: matchingSeason.id,
              dateFrom: matchingSeason.dateFrom.toISOString(),
              dateTo: matchingSeason.dateTo.toISOString(),
            }
          : null,
      };
    }),

  // ── Master Data Lookups ──

  transportRoutes: proc
    .input(z.object({ destinationCode: z.string().optional(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const dests = await ctx.db.opsTransportDestination.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.destinationCode ? { code: input.destinationCode } : {}),
        },
        include: {
          routes: {
            include: {
              seasons: {
                where: { isActive: true },
                include: { rates: true },
                orderBy: { dateFrom: "desc" },
                take: 1,
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
      return dests;
    }),

  sightseeingEntries: proc
    .input(z.object({ destinationCode: z.string().optional(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsSightseeingEntry.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.destinationCode ? { destinationCode: input.destinationCode } : {}),
        },
        include: {
          seasons: {
            where: { isActive: true },
            orderBy: { dateFrom: "desc" },
            take: 1,
          },
        },
        orderBy: [{ destinationCode: "asc" }, { sortOrder: "asc" }],
      });
    }),

  guidanceRates: proc
    .input(z.object({ destinationCode: z.string().optional(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsGuidanceRate.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.destinationCode ? { destinationCode: input.destinationCode } : {}),
        },
        include: {
          seasons: {
            where: { isActive: true },
            orderBy: { dateFrom: "desc" },
            take: 1,
          },
        },
        orderBy: [{ destinationCode: "asc" }, { guideType: "asc" }],
      });
    }),

  mealRates: proc
    .input(z.object({ mealType: z.string().optional(), destinationCode: z.string().optional(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsMealRate.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.mealType ? { mealType: input.mealType as never } : {}),
          ...(input.destinationCode ? { destinationCode: input.destinationCode } : {}),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          seasons: {
            where: { isActive: true },
            orderBy: { dateFrom: "desc" },
            take: 1,
          },
        },
        orderBy: [{ mealType: "asc" }, { nameEn: "asc" }],
      });
    }),

  suppliers: proc
    .input(z.object({ type: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmSupplier.findMany({
        where: {
          companyId: ctx.companyId,
          active: true,
          ...(input.type ? { type: input.type } : {}),
        },
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      });
    }),
});
