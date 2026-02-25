import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { simulateStay } from "@/server/services/contracting/booking-simulator";
import type { RateContractData } from "@/server/services/contracting/rate-calculator";

const proc = moduleProcedure("contracting");

const simulateInput = z.object({
  contractId: z.string().min(1),
  checkIn: z.string().min(1, "Check-in date is required"),
  checkOut: z.string().min(1, "Check-out date is required"),
  adults: z.number().int().min(1).max(6).default(2),
  childAges: z.array(z.number().int().min(0).max(17)).default([]),
  bookingDate: z.string().optional(),
  showOffers: z.boolean().default(true),
}).refine((d) => d.checkOut > d.checkIn, {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
});

export const rateVerificationRouter = createTRPCRouter({
  // ── Simulate: compute full rate breakdown for a stay ──
  simulate: proc
    .input(simulateInput)
    .query(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        include: {
          hotel: { select: { name: true } },
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
            include: { season: { select: { id: true, dateFrom: true, dateTo: true } } },
          },
          supplements: true,
          specialOffers: { where: { active: true }, orderBy: { sortOrder: "asc" } },
          allotments: {
            include: {
              roomType: { select: { id: true, name: true } },
            },
          },
          stopSales: true,
          childPolicies: true,
        },
      });

      const checkIn = new Date(input.checkIn);
      const checkOut = new Date(input.checkOut);
      const nights = Math.round(
        (checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000),
      );
      const bookingDate = input.bookingDate
        ? input.bookingDate
        : new Date().toISOString().slice(0, 10);

      // Build RateContractData for the unified calculator
      const baseRoomType = contract.roomTypes.find((rt) => rt.isBase);
      const baseMealBasis = contract.mealBases.find((mb) => mb.isBase);

      const rateContractData: RateContractData = {
        rateBasis: contract.rateBasis as "PER_PERSON" | "PER_ROOM",
        baseRoomTypeId: baseRoomType?.roomTypeId ?? contract.roomTypes[0]?.roomTypeId ?? "",
        baseMealBasisId: baseMealBasis?.mealBasisId ?? contract.mealBases[0]?.mealBasisId ?? "",
        seasons: contract.seasons.map((s) => ({
          id: s.id,
          dateFrom: s.dateFrom.toISOString().slice(0, 10),
          dateTo: s.dateTo.toISOString().slice(0, 10),
        })),
        roomTypes: contract.roomTypes.map((rt) => ({
          roomTypeId: rt.roomTypeId,
          isBase: rt.isBase,
          roomType: rt.roomType,
        })),
        mealBases: contract.mealBases.map((mb) => ({
          mealBasisId: mb.mealBasisId,
          isBase: mb.isBase,
          mealBasis: mb.mealBasis,
        })),
        baseRates: contract.baseRates.map((br) => ({
          seasonId: br.seasonId,
          rate: br.rate.toString(),
          singleRate: br.singleRate?.toString() ?? null,
          doubleRate: br.doubleRate?.toString() ?? null,
          tripleRate: br.tripleRate?.toString() ?? null,
        })),
        supplements: contract.supplements.map((s) => ({
          supplementType: s.supplementType,
          roomTypeId: s.roomTypeId,
          mealBasisId: s.mealBasisId,
          forAdults: s.forAdults,
          forChildCategory: s.forChildCategory,
          forChildBedding: s.forChildBedding,
          childPosition: s.childPosition,
          valueType: s.valueType,
          value: s.value.toString(),
          isReduction: s.isReduction,
          perPerson: s.perPerson,
          perNight: s.perNight,
          label: s.label,
        })),
        childPolicies: contract.childPolicies.map((cp) => ({
          category: cp.category,
          ageFrom: cp.ageFrom,
          ageTo: cp.ageTo,
          freeInSharing: cp.freeInSharing,
          maxFreePerRoom: cp.maxFreePerRoom,
          extraBedAllowed: cp.extraBedAllowed,
        })),
        specialOffers: contract.specialOffers.map((o) => ({
          id: o.id,
          name: o.name,
          offerType: o.offerType,
          validFrom: o.validFrom?.toISOString().slice(0, 10) ?? null,
          validTo: o.validTo?.toISOString().slice(0, 10) ?? null,
          bookByDate: o.bookByDate?.toISOString().slice(0, 10) ?? null,
          minimumNights: o.minimumNights,
          minimumRooms: o.minimumRooms,
          advanceBookDays: o.advanceBookDays,
          discountType: o.discountType,
          discountValue: o.discountValue.toString(),
          stayNights: o.stayNights,
          payNights: o.payNights,
          bookFromDate: o.bookFromDate?.toISOString().slice(0, 10) ?? null,
          stayDateType: o.stayDateType,
          paymentPct: o.paymentPct,
          paymentDeadline: o.paymentDeadline?.toISOString().slice(0, 10) ?? null,
          roomingListBy: o.roomingListBy?.toISOString().slice(0, 10) ?? null,
          combinable: o.combinable,
          active: o.active,
        })),
      };

      // Use unified simulateStay for rate calculation + warnings
      const simulation = simulateStay(
        rateContractData,
        contract.seasons,
        contract.stopSales,
        contract.allotments,
        {
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          adults: input.adults,
          childAges: input.childAges,
          bookingDate,
          minimumStay: contract.minimumStay,
          maximumStay: contract.maximumStay,
        },
      );

      // Offer eligibility (separate from rate calculation for UI display)
      interface OfferEligibility {
        offerId: string;
        offerName: string;
        offerType: string;
        eligible: boolean;
        reasons: string[];
        discountType: string;
        discountValue: number;
        combinable: boolean;
      }

      const bookingDateObj = new Date(bookingDate);
      const offerEligibility: OfferEligibility[] = [];
      if (input.showOffers) {
        for (const offer of contract.specialOffers) {
          const reasons: string[] = [];
          let eligible = true;

          if (offer.validFrom) {
            const offerFrom = offer.validFrom.toISOString().slice(0, 10);
            if (input.checkIn < offerFrom) {
              eligible = false;
              reasons.push(`Check-in before offer start (${offerFrom})`);
            }
          }
          if (offer.validTo) {
            const offerTo = offer.validTo.toISOString().slice(0, 10);
            if (input.checkIn > offerTo) {
              eligible = false;
              reasons.push(`Check-in after offer end (${offerTo})`);
            }
          }

          if (offer.bookByDate) {
            const bookBy = offer.bookByDate.toISOString().slice(0, 10);
            if (bookingDate > bookBy) {
              eligible = false;
              reasons.push(`Booking date past deadline (${bookBy})`);
            }
          }

          if (offer.advanceBookDays) {
            const daysBefore = Math.round(
              (checkIn.getTime() - bookingDateObj.getTime()) / (24 * 60 * 60 * 1000),
            );
            if (daysBefore < offer.advanceBookDays) {
              eligible = false;
              reasons.push(
                `${daysBefore} days advance vs ${offer.advanceBookDays} required`,
              );
            }
          }

          if (offer.minimumNights && nights < offer.minimumNights) {
            eligible = false;
            reasons.push(`${nights} nights vs ${offer.minimumNights} min required`);
          }

          if (offer.offerType === "FREE_NIGHTS" && offer.stayNights) {
            if (nights < offer.stayNights) {
              eligible = false;
              reasons.push(`Need ${offer.stayNights} nights for free nights offer`);
            }
          }

          if (eligible) {
            reasons.push("All conditions met");
          }

          offerEligibility.push({
            offerId: offer.id,
            offerName: offer.name,
            offerType: offer.offerType,
            eligible,
            reasons,
            discountType: offer.discountType,
            discountValue: parseFloat(offer.discountValue.toString()),
            combinable: offer.combinable,
          });
        }
      }

      return {
        contractName: contract.name,
        contractCode: contract.code,
        hotelName: contract.hotel.name,
        rateBasis: contract.rateBasis,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights,
        adults: input.adults,
        childAges: input.childAges,
        bookingDate,
        nightBreakdown: simulation.nightBreakdown,
        rateMatrix: simulation.rateMatrix,
        offerEligibility,
        warnings: simulation.warnings,
        status: simulation.warnings.length > 0 ? "WARNING" : "OK",
      };
    }),

  // ── Save a simulation result ──
  saveResult: proc
    .input(
      z.object({
        contractId: z.string(),
        checkIn: z.string(),
        checkOut: z.string(),
        adults: z.number().int(),
        childAges: z.array(z.number()).default([]),
        bookingDate: z.string().optional(),
        resultData: z.record(z.string(), z.unknown()),
        warnings: z.array(z.string()).default([]),
        status: z.string().default("OK"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rateVerification.create({
        data: {
          companyId: ctx.companyId,
          contractId: input.contractId,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          adults: input.adults,
          children: input.childAges.length,
          childAges: JSON.parse(JSON.stringify(input.childAges)),
          bookingDate: input.bookingDate ? new Date(input.bookingDate) : null,
          resultData: JSON.parse(JSON.stringify(input.resultData)),
          warnings: JSON.parse(JSON.stringify(input.warnings)),
          status: input.status,
          createdById: ctx.session.user.id,
        },
      });
    }),

  // ── List saved results for a contract ──
  listResults: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.rateVerification.findMany({
        where: {
          contractId: input.contractId,
          companyId: ctx.companyId,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }),

  // ── Delete a saved result ──
  deleteResult: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      await ctx.db.rateVerification.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return ctx.db.rateVerification.delete({
        where: { id: input.id },
      });
    }),
});
