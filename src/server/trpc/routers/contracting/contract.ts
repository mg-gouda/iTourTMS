import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  contractCloneSchema,
  contractCreateSchema,
  contractUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const contractRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.contract.findMany({
      where: { companyId: ctx.companyId },
      include: {
        hotel: { select: { id: true, name: true } },
        baseCurrency: { select: { id: true, code: true, name: true } },
        _count: { select: { seasons: true, roomTypes: true, mealBases: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          hotel: { select: { id: true, name: true, code: true } },
          baseCurrency: { select: { id: true, code: true, name: true } },
          baseRoomType: { select: { id: true, name: true, code: true } },
          baseMealBasis: { select: { id: true, name: true, mealCode: true } },
          parentContract: { select: { id: true, name: true, code: true, version: true } },
          createdBy: { select: { id: true, name: true } },
          postedBy: { select: { id: true, name: true } },
          publishedBy: { select: { id: true, name: true } },
          seasons: { orderBy: { sortOrder: "asc" } },
          roomTypes: {
            include: { roomType: { select: { id: true, name: true, code: true } } },
            orderBy: { sortOrder: "asc" },
          },
          mealBases: {
            include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
            orderBy: { sortOrder: "asc" },
          },
          baseRates: {
            include: { season: { select: { id: true, name: true, code: true } } },
          },
          supplements: {
            include: {
              season: { select: { id: true, name: true, code: true } },
              roomType: { select: { id: true, name: true, code: true } },
              mealBasis: { select: { id: true, name: true, mealCode: true } },
            },
            orderBy: [{ supplementType: "asc" }, { sortOrder: "asc" }],
          },
        },
      });
    }),

  create: proc
    .input(contractCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify hotel belongs to company
      const hotel = await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      // Verify room type belongs to hotel
      await ctx.db.hotelRoomType.findFirstOrThrow({
        where: { id: input.baseRoomTypeId, hotelId: hotel.id },
      });

      // Verify meal basis belongs to hotel
      await ctx.db.hotelMealBasis.findFirstOrThrow({
        where: { id: input.baseMealBasisId, hotelId: hotel.id },
      });

      const contract = await ctx.db.contract.create({
        data: {
          companyId: ctx.companyId,
          name: input.name,
          code: input.code,
          hotelId: input.hotelId,
          validFrom: new Date(input.validFrom),
          validTo: new Date(input.validTo),
          rateBasis: input.rateBasis,
          baseCurrencyId: input.baseCurrencyId,
          baseRoomTypeId: input.baseRoomTypeId,
          baseMealBasisId: input.baseMealBasisId,
          minimumStay: input.minimumStay,
          maximumStay: input.maximumStay ?? null,
          terms: input.terms ?? null,
          internalNotes: input.internalNotes ?? null,
          hotelNotes: input.hotelNotes ?? null,
          createdById: ctx.session.user.id,
        },
      });

      // Auto-create base room type and meal basis assignments
      await ctx.db.contractRoomType.create({
        data: {
          contractId: contract.id,
          roomTypeId: input.baseRoomTypeId,
          isBase: true,
          sortOrder: 0,
        },
      });

      await ctx.db.contractMealBasis.create({
        data: {
          contractId: contract.id,
          mealBasisId: input.baseMealBasisId,
          isBase: true,
          sortOrder: 0,
        },
      });

      return contract;
    }),

  update: proc
    .input(z.object({ id: z.string(), data: contractUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (contract.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only DRAFT contracts can be edited",
        });
      }

      const data: Record<string, unknown> = { ...input.data };
      if (input.data.validFrom) data.validFrom = new Date(input.data.validFrom);
      if (input.data.validTo) data.validTo = new Date(input.data.validTo);

      return ctx.db.contract.update({
        where: { id: input.id },
        data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (contract.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only DRAFT contracts can be deleted",
        });
      }

      return ctx.db.contract.delete({ where: { id: input.id } });
    }),

  post: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: { _count: { select: { seasons: true } } },
      });

      if (contract.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only DRAFT contracts can be posted",
        });
      }

      if (contract._count.seasons === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contract must have at least one season to be posted",
        });
      }

      return ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: "POSTED",
          postedById: ctx.session.user.id,
          postedAt: new Date(),
        },
      });
    }),

  publish: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (contract.status !== "POSTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only POSTED contracts can be published",
        });
      }

      return ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: "PUBLISHED",
          publishedById: ctx.session.user.id,
          publishedAt: new Date(),
        },
      });
    }),

  resetToDraft: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      return ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: "DRAFT",
          postedById: null,
          postedAt: null,
          publishedById: null,
          publishedAt: null,
        },
      });
    }),

  clone: proc
    .input(contractCloneSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch source contract with ALL child records
      const source = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.sourceContractId, companyId: ctx.companyId },
        include: {
          seasons: { orderBy: { sortOrder: "asc" } },
          roomTypes: { orderBy: { sortOrder: "asc" } },
          mealBases: { orderBy: { sortOrder: "asc" } },
          baseRates: true,
          supplements: { orderBy: [{ supplementType: "asc" }, { sortOrder: "asc" }] },
          specialOffers: { orderBy: { sortOrder: "asc" } },
          allotments: true,
          stopSales: true,
        },
      });

      // Compute version: count existing contracts in the lineage + 1
      let rootId = source.parentContractId ?? source.id;
      let walker = source.parentContractId
        ? await ctx.db.contract.findUnique({
            where: { id: rootId },
            select: { parentContractId: true },
          })
        : null;
      while (walker?.parentContractId) {
        rootId = walker.parentContractId;
        walker = await ctx.db.contract.findUnique({
          where: { id: rootId },
          select: { parentContractId: true },
        });
      }

      // BFS to count all contracts in lineage
      const queue = [rootId];
      let lineageCount = 0;
      while (queue.length > 0) {
        const batchIds = queue.splice(0, queue.length);
        lineageCount += batchIds.length;
        const children = await ctx.db.contract.findMany({
          where: { parentContractId: { in: batchIds } },
          select: { id: true },
        });
        queue.push(...children.map((c) => c.id));
      }

      const newVersion = lineageCount + 1;

      return ctx.db.$transaction(async (tx) => {
        // 1. Create the new contract
        const newContract = await tx.contract.create({
          data: {
            companyId: ctx.companyId,
            name: input.name,
            code: input.code,
            hotelId: source.hotelId,
            validFrom: new Date(input.validFrom),
            validTo: new Date(input.validTo),
            rateBasis: source.rateBasis,
            baseCurrencyId: source.baseCurrencyId,
            baseRoomTypeId: source.baseRoomTypeId,
            baseMealBasisId: source.baseMealBasisId,
            minimumStay: source.minimumStay,
            maximumStay: source.maximumStay,
            terms: source.terms,
            internalNotes: source.internalNotes,
            hotelNotes: source.hotelNotes,
            createdById: ctx.session.user.id,
            parentContractId: source.id,
            version: newVersion,
          },
        });

        // 2. Clone seasons and build ID remap
        const seasonIdMap = new Map<string, string>();
        for (const season of source.seasons) {
          const newSeason = await tx.contractSeason.create({
            data: {
              contractId: newContract.id,
              name: season.name,
              code: season.code,
              dateFrom: season.dateFrom,
              dateTo: season.dateTo,
              sortOrder: season.sortOrder,
              releaseDays: season.releaseDays,
              minimumStay: season.minimumStay,
            },
          });
          seasonIdMap.set(season.id, newSeason.id);
        }

        // 3. Clone room types
        if (source.roomTypes.length > 0) {
          await tx.contractRoomType.createMany({
            data: source.roomTypes.map((rt) => ({
              contractId: newContract.id,
              roomTypeId: rt.roomTypeId,
              isBase: rt.isBase,
              sortOrder: rt.sortOrder,
            })),
          });
        }

        // 4. Clone meal bases
        if (source.mealBases.length > 0) {
          await tx.contractMealBasis.createMany({
            data: source.mealBases.map((mb) => ({
              contractId: newContract.id,
              mealBasisId: mb.mealBasisId,
              isBase: mb.isBase,
              sortOrder: mb.sortOrder,
            })),
          });
        }

        // 5. Clone base rates (remap seasonId)
        if (source.baseRates.length > 0) {
          await tx.contractBaseRate.createMany({
            data: source.baseRates.map((br) => ({
              contractId: newContract.id,
              seasonId: seasonIdMap.get(br.seasonId)!,
              rate: br.rate,
              singleRate: br.singleRate,
              doubleRate: br.doubleRate,
              tripleRate: br.tripleRate,
            })),
          });
        }

        // 6. Clone supplements (remap seasonId)
        if (source.supplements.length > 0) {
          await tx.contractSupplement.createMany({
            data: source.supplements.map((s) => ({
              contractId: newContract.id,
              seasonId: seasonIdMap.get(s.seasonId)!,
              supplementType: s.supplementType,
              roomTypeId: s.roomTypeId,
              mealBasisId: s.mealBasisId,
              forAdults: s.forAdults,
              forChildCategory: s.forChildCategory,
              forChildBedding: s.forChildBedding,
              valueType: s.valueType,
              value: s.value,
              isReduction: s.isReduction,
              perPerson: s.perPerson,
              perNight: s.perNight,
              label: s.label,
              notes: s.notes,
              sortOrder: s.sortOrder,
            })),
          });
        }

        // 7. Clone special offers (no seasonId)
        if (source.specialOffers.length > 0) {
          await tx.contractSpecialOffer.createMany({
            data: source.specialOffers.map((so) => ({
              contractId: newContract.id,
              name: so.name,
              offerType: so.offerType,
              description: so.description,
              validFrom: so.validFrom,
              validTo: so.validTo,
              bookByDate: so.bookByDate,
              minimumNights: so.minimumNights,
              minimumRooms: so.minimumRooms,
              advanceBookDays: so.advanceBookDays,
              discountType: so.discountType,
              discountValue: so.discountValue,
              stayNights: so.stayNights,
              payNights: so.payNights,
              combinable: so.combinable,
              active: so.active,
              sortOrder: so.sortOrder,
            })),
          });
        }

        // 8. Clone allotments (remap seasonId, reset soldRooms)
        if (source.allotments.length > 0) {
          await tx.contractAllotment.createMany({
            data: source.allotments.map((a) => ({
              contractId: newContract.id,
              seasonId: seasonIdMap.get(a.seasonId)!,
              roomTypeId: a.roomTypeId,
              totalRooms: a.totalRooms,
              freeSale: a.freeSale,
              soldRooms: 0,
            })),
          });
        }

        // 9. Clone stop sales (no seasonId)
        if (source.stopSales.length > 0) {
          await tx.contractStopSale.createMany({
            data: source.stopSales.map((ss) => ({
              contractId: newContract.id,
              roomTypeId: ss.roomTypeId,
              dateFrom: ss.dateFrom,
              dateTo: ss.dateTo,
              reason: ss.reason,
            })),
          });
        }

        return { id: newContract.id };
      });
    }),

  getVersionHistory: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      // Walk up to find root
      let rootId = input.contractId;
      let current = await ctx.db.contract.findUnique({
        where: { id: rootId },
        select: { parentContractId: true },
      });
      while (current?.parentContractId) {
        rootId = current.parentContractId;
        current = await ctx.db.contract.findUnique({
          where: { id: rootId },
          select: { parentContractId: true },
        });
      }

      // BFS down from root to collect full lineage
      const queue = [rootId];
      const contractSelect = {
        id: true,
        name: true,
        code: true,
        version: true,
        status: true,
        validFrom: true,
        validTo: true,
        createdAt: true,
      } as const;

      const results: Array<{
        id: string;
        name: string;
        code: string;
        version: number;
        status: string;
        validFrom: Date;
        validTo: Date;
        createdAt: Date;
      }> = [];

      while (queue.length > 0) {
        const batchIds = queue.splice(0, queue.length);
        const batch = await ctx.db.contract.findMany({
          where: { id: { in: batchIds }, companyId: ctx.companyId },
          select: contractSelect,
        });
        results.push(...batch);
        const children = await ctx.db.contract.findMany({
          where: { parentContractId: { in: batchIds } },
          select: { id: true },
        });
        queue.push(...children.map((c) => c.id));
      }

      return results.sort((a, b) => a.version - b.version);
    }),
});
