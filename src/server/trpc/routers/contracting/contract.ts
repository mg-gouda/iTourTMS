import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  contractCloneSchema,
  contractCreateSchema,
  contractUpdateSchema,
} from "@/lib/validations/contracting";
import { logContractAction } from "@/server/services/contracting/audit-logger";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const contractRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.contract.findMany({
      where: { companyId: ctx.companyId, isTemplate: false },
      include: {
        hotel: { select: { id: true, name: true } },
        baseCurrency: { select: { id: true, code: true, name: true } },
        _count: { select: { seasons: true, roomTypes: true, mealBases: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  listTemplates: proc.query(async ({ ctx }) => {
    return ctx.db.contract.findMany({
      where: { companyId: ctx.companyId, isTemplate: true },
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
            include: { roomType: { select: { id: true, name: true, code: true, maxAdults: true, maxChildren: true } } },
            orderBy: { sortOrder: "asc" },
          },
          mealBases: {
            include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
            orderBy: { sortOrder: "asc" },
          },
          baseRates: {
            include: { season: { select: { id: true, dateFrom: true, dateTo: true } } },
          },
          supplements: {
            include: {
              roomType: { select: { id: true, name: true, code: true } },
              mealBasis: { select: { id: true, name: true, mealCode: true } },
            },
            orderBy: [{ supplementType: "asc" }, { sortOrder: "asc" }],
          },
          markets: {
            include: {
              market: { select: { id: true, name: true, code: true } },
            },
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
          season: input.season ?? null,
          hotelId: input.hotelId,
          validFrom: new Date(input.validFrom),
          validTo: new Date(input.validTo),
          travelFrom: input.travelFrom ? new Date(input.travelFrom) : null,
          travelTo: input.travelTo ? new Date(input.travelTo) : null,
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

      // Auto-assign markets
      if (input.marketIds && input.marketIds.length > 0) {
        await ctx.db.contractMarket.createMany({
          data: input.marketIds.map((marketId) => ({
            contractId: contract.id,
            marketId,
          })),
        });
      }

      await logContractAction(ctx.db, {
        contractId: contract.id,
        action: "CREATE",
        entity: "CONTRACT",
        summary: `Created contract "${input.name}" (${input.code})`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "Unknown",
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

      const updated = await ctx.db.contract.update({
        where: { id: input.id },
        data,
      });

      await logContractAction(ctx.db, {
        contractId: input.id,
        action: "UPDATE",
        entity: "CONTRACT",
        summary: `Updated contract fields: ${Object.keys(input.data).join(", ")}`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "Unknown",
      });

      return updated;
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

      await logContractAction(ctx.db, {
        contractId: input.id,
        action: "DELETE",
        entity: "CONTRACT",
        summary: `Deleted contract "${contract.name}" (${contract.code})`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "Unknown",
      });

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

      const posted = await ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: "POSTED",
          postedById: ctx.session.user.id,
          postedAt: new Date(),
        },
      });

      await logContractAction(ctx.db, {
        contractId: input.id,
        action: "POST",
        entity: "CONTRACT",
        summary: `Posted contract "${contract.name}"`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "Unknown",
      });

      return posted;
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

      const published = await ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: "PUBLISHED",
          publishedById: ctx.session.user.id,
          publishedAt: new Date(),
        },
      });

      await logContractAction(ctx.db, {
        contractId: input.id,
        action: "PUBLISH",
        entity: "CONTRACT",
        summary: `Published contract "${contract.name}"`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "Unknown",
      });

      return published;
    }),

  resetToDraft: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      const reset = await ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: "DRAFT",
          postedById: null,
          postedAt: null,
          publishedById: null,
          publishedAt: null,
        },
      });

      await logContractAction(ctx.db, {
        contractId: input.id,
        action: "RESET_DRAFT",
        entity: "CONTRACT",
        summary: "Reset contract to draft",
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "Unknown",
      });

      return reset;
    }),

  clone: proc
    .input(contractCloneSchema)
    .mutation(async ({ ctx, input }) => {
      const { adjustRate, averageRates, shiftDate, calculateDateShift } =
        await import("@/server/services/contracting/rate-adjuster");

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
          childPolicies: true,
          cancellationPolicies: true,
          specialMeals: true,
        },
      });

      // Rate mode defaults
      const rateMode = input.rateMode ?? "FREEZE";
      const ratePercent = input.ratePercent ?? 0;
      const entities = input.selectiveEntities ?? {
        seasons: true, roomTypes: true, mealBases: true, baseRates: true,
        supplements: true, specialOffers: true, allotments: true, stopSales: true,
        childPolicies: true, cancellationPolicies: true, specialMeals: true,
      };

      // Date shift calculation
      const dateDelta = input.dateShift
        ? calculateDateShift(source.validFrom, new Date(input.validFrom))
        : 0;

      // For AVERAGE mode, fetch rates from other contracts
      let averageRateMap: Map<string, number[]> | null = null;
      if (rateMode === "AVERAGE" && input.averageContractIds?.length) {
        averageRateMap = new Map();
        const avgContracts = await ctx.db.contractBaseRate.findMany({
          where: { contractId: { in: input.averageContractIds } },
          include: { season: { select: { dateFrom: true, dateTo: true } } },
        });
        for (const br of avgContracts) {
          const key = `${br.season.dateFrom.toISOString().slice(0, 10)}|${br.season.dateTo.toISOString().slice(0, 10)}`;
          if (!averageRateMap.has(key)) averageRateMap.set(key, []);
          averageRateMap.get(key)!.push(parseFloat(br.rate.toString()));
        }
      }

      // Compute version
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

      // Rate adjuster helper
      function adj(val: unknown): number {
        const num = parseFloat(String(val ?? 0));
        if (rateMode === "AVERAGE") return num; // handled separately
        return adjustRate(num, rateMode, ratePercent);
      }

      function adjOrNull(val: unknown): number | null {
        if (val === null || val === undefined) return null;
        return adj(val);
      }

      return ctx.db.$transaction(async (tx) => {
        const copiedEntities: string[] = [];

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
            isTemplate: false,
          },
        });

        // 2. Clone seasons
        const seasonIdMap = new Map<string, string>();
        const seasonDateKeyMap = new Map<string, string>(); // seasonId -> "dateFrom|dateTo"
        if (entities.seasons) {
          for (const season of source.seasons) {
            const dateKey = `${season.dateFrom.toISOString().slice(0, 10)}|${season.dateTo.toISOString().slice(0, 10)}`;
            seasonDateKeyMap.set(season.id, dateKey);
            const newSeason = await tx.contractSeason.create({
              data: {
                contractId: newContract.id,
                dateFrom: dateDelta ? shiftDate(season.dateFrom, dateDelta) : season.dateFrom,
                dateTo: dateDelta ? shiftDate(season.dateTo, dateDelta) : season.dateTo,
                sortOrder: season.sortOrder,
                releaseDays: season.releaseDays,
                minimumStay: season.minimumStay,
              },
            });
            seasonIdMap.set(season.id, newSeason.id);
          }
          copiedEntities.push("seasons");
        }

        // 3. Clone room types
        if (entities.roomTypes && source.roomTypes.length > 0) {
          await tx.contractRoomType.createMany({
            data: source.roomTypes.map((rt) => ({
              contractId: newContract.id,
              roomTypeId: rt.roomTypeId,
              isBase: rt.isBase,
              sortOrder: rt.sortOrder,
            })),
          });
          copiedEntities.push("roomTypes");
        }

        // 4. Clone meal bases
        if (entities.mealBases && source.mealBases.length > 0) {
          await tx.contractMealBasis.createMany({
            data: source.mealBases.map((mb) => ({
              contractId: newContract.id,
              mealBasisId: mb.mealBasisId,
              isBase: mb.isBase,
              sortOrder: mb.sortOrder,
            })),
          });
          copiedEntities.push("mealBases");
        }

        // 5. Clone base rates with rate adjustment
        if (entities.baseRates && source.baseRates.length > 0 && seasonIdMap.size > 0) {
          await tx.contractBaseRate.createMany({
            data: source.baseRates.map((br) => {
              let rate = adj(br.rate);
              let singleRate = adjOrNull(br.singleRate);
              let doubleRate = adjOrNull(br.doubleRate);
              let tripleRate = adjOrNull(br.tripleRate);

              // AVERAGE mode: average with other contracts
              if (rateMode === "AVERAGE" && averageRateMap) {
                const dateKey = seasonDateKeyMap.get(br.seasonId);
                const otherRates = dateKey
                  ? averageRateMap.get(dateKey) ?? []
                  : [];
                if (otherRates.length > 0) {
                  rate = averageRates([
                    parseFloat(br.rate.toString()),
                    ...otherRates,
                  ]);
                }
              }

              return {
                contractId: newContract.id,
                seasonId: seasonIdMap.get(br.seasonId)!,
                rate,
                singleRate,
                doubleRate,
                tripleRate,
              };
            }),
          });
          copiedEntities.push("baseRates");
        }

        // 6. Clone supplements with rate adjustment
        if (entities.supplements && source.supplements.length > 0) {
          await tx.contractSupplement.createMany({
            data: source.supplements.map((s) => ({
              contractId: newContract.id,
              supplementType: s.supplementType,
              roomTypeId: s.roomTypeId,
              mealBasisId: s.mealBasisId,
              forAdults: s.forAdults,
              forChildCategory: s.forChildCategory,
              forChildBedding: s.forChildBedding,
              childPosition: s.childPosition,
              valueType: s.valueType,
              value: s.valueType === "FIXED" ? adj(s.value) : parseFloat(s.value.toString()),
              isReduction: s.isReduction,
              perPerson: s.perPerson,
              perNight: s.perNight,
              label: s.label,
              notes: s.notes,
              sortOrder: s.sortOrder,
            })),
          });
          copiedEntities.push("supplements");
        }

        // 7. Clone special offers with date shift
        if (entities.specialOffers && source.specialOffers.length > 0) {
          await tx.contractSpecialOffer.createMany({
            data: source.specialOffers.map((so) => ({
              contractId: newContract.id,
              name: so.name,
              offerType: so.offerType,
              description: so.description,
              validFrom: dateDelta && so.validFrom ? shiftDate(so.validFrom, dateDelta) : so.validFrom,
              validTo: dateDelta && so.validTo ? shiftDate(so.validTo, dateDelta) : so.validTo,
              bookByDate: dateDelta && so.bookByDate ? shiftDate(so.bookByDate, dateDelta) : so.bookByDate,
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
          copiedEntities.push("specialOffers");
        }

        // 8. Clone allotments
        if (entities.allotments && source.allotments.length > 0 && seasonIdMap.size > 0) {
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
          copiedEntities.push("allotments");
        }

        // 9. Clone stop sales with date shift
        if (entities.stopSales && source.stopSales.length > 0) {
          await tx.contractStopSale.createMany({
            data: source.stopSales.map((ss) => ({
              contractId: newContract.id,
              roomTypeId: ss.roomTypeId,
              dateFrom: dateDelta ? shiftDate(ss.dateFrom, dateDelta) : ss.dateFrom,
              dateTo: dateDelta ? shiftDate(ss.dateTo, dateDelta) : ss.dateTo,
              reason: ss.reason,
            })),
          });
          copiedEntities.push("stopSales");
        }

        // 10. Clone child policies
        if (entities.childPolicies && source.childPolicies.length > 0) {
          await tx.contractChildPolicy.createMany({
            data: source.childPolicies.map((cp) => ({
              contractId: newContract.id,
              category: cp.category,
              ageFrom: cp.ageFrom,
              ageTo: cp.ageTo,
              label: cp.label,
              freeInSharing: cp.freeInSharing,
              maxFreePerRoom: cp.maxFreePerRoom,
              extraBedAllowed: cp.extraBedAllowed,
              mealsIncluded: cp.mealsIncluded,
              notes: cp.notes,
            })),
          });
          copiedEntities.push("childPolicies");
        }

        // 11. Clone cancellation policies
        if (entities.cancellationPolicies && source.cancellationPolicies.length > 0) {
          await tx.contractCancellationPolicy.createMany({
            data: source.cancellationPolicies.map((cp) => ({
              contractId: newContract.id,
              daysBefore: cp.daysBefore,
              chargeType: cp.chargeType,
              chargeValue: cp.chargeValue,
              description: cp.description,
              sortOrder: cp.sortOrder,
            })),
          });
          copiedEntities.push("cancellationPolicies");
        }

        // 12. Clone special meals with date shift
        if (entities.specialMeals && source.specialMeals.length > 0) {
          await tx.contractSpecialMeal.createMany({
            data: source.specialMeals.map((sm) => ({
              contractId: newContract.id,
              occasion: sm.occasion,
              customName: sm.customName,
              dateFrom: dateDelta ? shiftDate(sm.dateFrom, dateDelta) : sm.dateFrom,
              dateTo: dateDelta ? shiftDate(sm.dateTo, dateDelta) : sm.dateTo,
              mandatory: sm.mandatory,
              adultPrice: sm.adultPrice,
              childPrice: sm.childPrice,
              teenPrice: sm.teenPrice,
              infantPrice: sm.infantPrice,
              excludedMealBases: sm.excludedMealBases,
              notes: sm.notes,
            })),
          });
          copiedEntities.push("specialMeals");
        }

        // 13. Create copy log
        await tx.contractCopyLog.create({
          data: {
            companyId: ctx.companyId,
            sourceContractId: source.id,
            targetContractId: newContract.id,
            rateMode,
            ratePercent: ratePercent || null,
            averageSourceIds: input.averageContractIds
              ? JSON.parse(JSON.stringify(input.averageContractIds))
              : null,
            copiedEntities: JSON.parse(JSON.stringify(copiedEntities)),
            dateShiftDays: dateDelta || null,
            createdById: ctx.session.user.id,
          },
        });

        await logContractAction(tx, {
          contractId: newContract.id,
          action: "CLONE",
          entity: "CONTRACT",
          summary: `Cloned from "${source.name}" (${source.code}) as v${newVersion} [${rateMode}${ratePercent ? ` ${ratePercent}%` : ""}]`,
          userId: ctx.session.user.id,
          userName: ctx.session.user.name ?? "Unknown",
        });

        return { id: newContract.id };
      });
    }),

  saveAsTemplate: proc
    .input(
      z.object({
        contractId: z.string(),
        name: z.string().min(1),
        code: z.string().min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch source contract with ALL child records
      const source = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        include: {
          seasons: { orderBy: { sortOrder: "asc" } },
          roomTypes: { orderBy: { sortOrder: "asc" } },
          mealBases: { orderBy: { sortOrder: "asc" } },
          baseRates: true,
          supplements: { orderBy: [{ supplementType: "asc" }, { sortOrder: "asc" }] },
          specialOffers: { orderBy: { sortOrder: "asc" } },
          allotments: true,
          stopSales: true,
          childPolicies: true,
          cancellationPolicies: true,
          specialMeals: true,
        },
      });

      return ctx.db.$transaction(async (tx) => {
        // Create template contract
        const template = await tx.contract.create({
          data: {
            companyId: ctx.companyId,
            name: input.name,
            code: input.code,
            hotelId: source.hotelId,
            validFrom: source.validFrom,
            validTo: source.validTo,
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
            isTemplate: true,
            version: 1,
          },
        });

        // Clone seasons and build ID remap
        const seasonIdMap = new Map<string, string>();
        for (const season of source.seasons) {
          const newSeason = await tx.contractSeason.create({
            data: {
              contractId: template.id,
              dateFrom: season.dateFrom,
              dateTo: season.dateTo,
              sortOrder: season.sortOrder,
              releaseDays: season.releaseDays,
              minimumStay: season.minimumStay,
            },
          });
          seasonIdMap.set(season.id, newSeason.id);
        }

        // Clone room types
        if (source.roomTypes.length > 0) {
          await tx.contractRoomType.createMany({
            data: source.roomTypes.map((rt) => ({
              contractId: template.id,
              roomTypeId: rt.roomTypeId,
              isBase: rt.isBase,
              sortOrder: rt.sortOrder,
            })),
          });
        }

        // Clone meal bases
        if (source.mealBases.length > 0) {
          await tx.contractMealBasis.createMany({
            data: source.mealBases.map((mb) => ({
              contractId: template.id,
              mealBasisId: mb.mealBasisId,
              isBase: mb.isBase,
              sortOrder: mb.sortOrder,
            })),
          });
        }

        // Clone base rates
        if (source.baseRates.length > 0) {
          await tx.contractBaseRate.createMany({
            data: source.baseRates.map((br) => ({
              contractId: template.id,
              seasonId: seasonIdMap.get(br.seasonId)!,
              rate: br.rate,
              singleRate: br.singleRate,
              doubleRate: br.doubleRate,
              tripleRate: br.tripleRate,
            })),
          });
        }

        // Clone supplements
        if (source.supplements.length > 0) {
          await tx.contractSupplement.createMany({
            data: source.supplements.map((s) => ({
              contractId: template.id,
              supplementType: s.supplementType,
              roomTypeId: s.roomTypeId,
              mealBasisId: s.mealBasisId,
              forAdults: s.forAdults,
              forChildCategory: s.forChildCategory,
              forChildBedding: s.forChildBedding,
              childPosition: s.childPosition,
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

        // Clone special offers
        if (source.specialOffers.length > 0) {
          await tx.contractSpecialOffer.createMany({
            data: source.specialOffers.map((so) => ({
              contractId: template.id,
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

        // Clone allotments
        if (source.allotments.length > 0) {
          await tx.contractAllotment.createMany({
            data: source.allotments.map((a) => ({
              contractId: template.id,
              seasonId: seasonIdMap.get(a.seasonId)!,
              roomTypeId: a.roomTypeId,
              totalRooms: a.totalRooms,
              freeSale: a.freeSale,
              soldRooms: 0,
            })),
          });
        }

        // Clone stop sales
        if (source.stopSales.length > 0) {
          await tx.contractStopSale.createMany({
            data: source.stopSales.map((ss) => ({
              contractId: template.id,
              roomTypeId: ss.roomTypeId,
              dateFrom: ss.dateFrom,
              dateTo: ss.dateTo,
              reason: ss.reason,
            })),
          });
        }

        // Clone child policies
        if (source.childPolicies.length > 0) {
          await tx.contractChildPolicy.createMany({
            data: source.childPolicies.map((cp) => ({
              contractId: template.id,
              category: cp.category,
              ageFrom: cp.ageFrom,
              ageTo: cp.ageTo,
              label: cp.label,
              freeInSharing: cp.freeInSharing,
              maxFreePerRoom: cp.maxFreePerRoom,
              extraBedAllowed: cp.extraBedAllowed,
              mealsIncluded: cp.mealsIncluded,
              notes: cp.notes,
            })),
          });
        }

        // Clone cancellation policies
        if (source.cancellationPolicies.length > 0) {
          await tx.contractCancellationPolicy.createMany({
            data: source.cancellationPolicies.map((cp) => ({
              contractId: template.id,
              daysBefore: cp.daysBefore,
              chargeType: cp.chargeType,
              chargeValue: cp.chargeValue,
              description: cp.description,
              sortOrder: cp.sortOrder,
            })),
          });
        }

        // Clone special meals
        if (source.specialMeals.length > 0) {
          await tx.contractSpecialMeal.createMany({
            data: source.specialMeals.map((sm) => ({
              contractId: template.id,
              occasion: sm.occasion,
              customName: sm.customName,
              dateFrom: sm.dateFrom,
              dateTo: sm.dateTo,
              mandatory: sm.mandatory,
              adultPrice: sm.adultPrice,
              childPrice: sm.childPrice,
              teenPrice: sm.teenPrice,
              infantPrice: sm.infantPrice,
              excludedMealBases: sm.excludedMealBases,
              notes: sm.notes,
            })),
          });
        }

        return { id: template.id };
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
        season: true,
        version: true,
        status: true,
        validFrom: true,
        validTo: true,
        travelFrom: true,
        travelTo: true,
        createdAt: true,
      } as const;

      const results: Array<{
        id: string;
        name: string;
        code: string;
        season: string | null;
        version: number;
        status: string;
        validFrom: Date;
        validTo: Date;
        travelFrom: Date | null;
        travelTo: Date | null;
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

  getForExport: proc
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
          seasons: { orderBy: { sortOrder: "asc" as const } },
          roomTypes: {
            include: { roomType: { select: { id: true, name: true, code: true, maxAdults: true, maxChildren: true } } },
            orderBy: { sortOrder: "asc" as const },
          },
          mealBases: {
            include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
            orderBy: { sortOrder: "asc" as const },
          },
          baseRates: {
            include: { season: { select: { id: true, dateFrom: true, dateTo: true } } },
          },
          supplements: {
            include: {
              roomType: { select: { id: true, name: true, code: true } },
              mealBasis: { select: { id: true, name: true, mealCode: true } },
            },
            orderBy: [{ supplementType: "asc" as const }, { sortOrder: "asc" as const }],
          },
          specialOffers: { orderBy: { sortOrder: "asc" as const } },
          allotments: {
            include: {
              season: { select: { id: true, dateFrom: true, dateTo: true } },
              roomType: { select: { id: true, name: true, code: true } },
            },
          },
          stopSales: {
            include: { roomType: { select: { id: true, name: true, code: true } } },
            orderBy: { dateFrom: "asc" as const },
          },
          childPolicies: { orderBy: { category: "asc" as const } },
          cancellationPolicies: { orderBy: { daysBefore: "desc" as const } },
        },
      });
    }),

  compare: proc
    .input(
      z.object({
        contractIdA: z.string(),
        contractIdB: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const fullInclude = {
        hotel: { select: { id: true, name: true, code: true } },
        baseCurrency: { select: { id: true, code: true, name: true } },
        baseRoomType: { select: { id: true, name: true, code: true } },
        baseMealBasis: { select: { id: true, name: true, mealCode: true } },
        parentContract: {
          select: { id: true, name: true, code: true, version: true },
        },
        seasons: { orderBy: { sortOrder: "asc" as const } },
        roomTypes: {
          include: {
            roomType: { select: { id: true, name: true, code: true, maxAdults: true, maxChildren: true } },
          },
          orderBy: { sortOrder: "asc" as const },
        },
        mealBases: {
          include: {
            mealBasis: { select: { id: true, name: true, mealCode: true } },
          },
          orderBy: { sortOrder: "asc" as const },
        },
        baseRates: {
          include: {
            season: { select: { id: true, dateFrom: true, dateTo: true } },
          },
        },
        supplements: {
          include: {
            roomType: { select: { id: true, name: true, code: true } },
            mealBasis: { select: { id: true, name: true, mealCode: true } },
          },
          orderBy: [
            { supplementType: "asc" as const },
            { sortOrder: "asc" as const },
          ],
        },
        specialOffers: { orderBy: { sortOrder: "asc" as const } },
        allotments: {
          include: {
            season: { select: { id: true, dateFrom: true, dateTo: true } },
            roomType: { select: { id: true, name: true, code: true } },
          },
        },
        stopSales: {
          include: {
            roomType: { select: { id: true, name: true, code: true } },
          },
          orderBy: { dateFrom: "asc" as const },
        },
        childPolicies: { orderBy: { category: "asc" as const } },
        cancellationPolicies: { orderBy: { daysBefore: "desc" as const } },
      };

      const [contractA, contractB] = await Promise.all([
        ctx.db.contract.findFirstOrThrow({
          where: { id: input.contractIdA, companyId: ctx.companyId },
          include: fullInclude,
        }),
        ctx.db.contract.findFirstOrThrow({
          where: { id: input.contractIdB, companyId: ctx.companyId },
          include: fullInclude,
        }),
      ]);

      return { contractA, contractB };
    }),

  listExpiring: proc
    .input(
      z.object({
        days: z.number().min(1).max(365).default(60),
        includeExpired: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const futureDate = new Date(
        now.getTime() + input.days * 24 * 60 * 60 * 1000,
      );

      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        isTemplate: false,
      };

      if (input.includeExpired) {
        // Show both expired and expiring within range
        where.validTo = { lte: futureDate };
      } else {
        // Only expiring (not yet expired) within range
        where.validTo = { gte: now, lte: futureDate };
      }

      return ctx.db.contract.findMany({
        where,
        include: {
          hotel: { select: { id: true, name: true } },
          baseCurrency: { select: { id: true, code: true } },
        },
        orderBy: { validTo: "asc" },
      });
    }),

  dashboard: proc.query(async ({ ctx }) => {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [
      totalContracts,
      statusGroups,
      expiringSoon,
      recentContracts,
      allContracts,
    ] = await Promise.all([
      ctx.db.contract.count({ where: { companyId: ctx.companyId, isTemplate: false } }),
      ctx.db.contract.groupBy({
        by: ["status"],
        _count: true,
        where: { companyId: ctx.companyId, isTemplate: false },
      }),
      ctx.db.contract.findMany({
        where: {
          companyId: ctx.companyId,
          isTemplate: false,
          validTo: { gte: now, lte: sixtyDaysFromNow },
        },
        include: { hotel: { select: { name: true } } },
        orderBy: { validTo: "asc" },
        take: 10,
      }),
      ctx.db.contract.findMany({
        where: { companyId: ctx.companyId, isTemplate: false },
        include: { hotel: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      ctx.db.contract.findMany({
        where: { companyId: ctx.companyId, isTemplate: false },
        select: { hotelId: true, hotel: { select: { name: true } } },
      }),
    ]);

    // Compute hotel counts
    const hotelCounts = new Map<string, { name: string; count: number }>();
    for (const c of allContracts) {
      const entry = hotelCounts.get(c.hotelId);
      if (entry) {
        entry.count++;
      } else {
        hotelCounts.set(c.hotelId, { name: c.hotel.name, count: 1 });
      }
    }
    const byHotel = Array.from(hotelCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalContracts,
      byStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count,
      })),
      totalHotels: hotelCounts.size,
      expiringSoonCount: expiringSoon.length,
      expiringSoon: expiringSoon.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status,
        hotelName: c.hotel.name,
        validTo: c.validTo,
      })),
      recentContracts: recentContracts.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status,
        hotelName: c.hotel.name,
        createdAt: c.createdAt,
      })),
      byHotel,
    };
  }),
});
