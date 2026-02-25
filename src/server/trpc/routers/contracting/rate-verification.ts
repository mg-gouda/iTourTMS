import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

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
            include: { season: { select: { id: true, name: true, code: true } } },
          },
          supplements: true,
          specialOffers: { where: { active: true }, orderBy: { sortOrder: "asc" } },
          allotments: {
            include: {
              season: { select: { id: true, name: true } },
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
      const bookingDate = input.bookingDate ? new Date(input.bookingDate) : new Date();

      const warnings: string[] = [];

      // Check minimum/maximum stay
      if (contract.minimumStay && nights < contract.minimumStay) {
        warnings.push(
          `Stay of ${nights} nights is below minimum stay of ${contract.minimumStay} nights`,
        );
      }
      if (contract.maximumStay && nights > contract.maximumStay) {
        warnings.push(
          `Stay of ${nights} nights exceeds maximum stay of ${contract.maximumStay} nights`,
        );
      }

      // Determine which seasons cover which nights
      interface NightBreakdown {
        date: string;
        seasonId: string | null;
        seasonName: string;
      }
      const nightBreakdown: NightBreakdown[] = [];
      for (let i = 0; i < nights; i++) {
        const nightDate = new Date(checkIn);
        nightDate.setDate(nightDate.getDate() + i);
        const dateStr = nightDate.toISOString().slice(0, 10);

        const matchingSeason = contract.seasons.find((s) => {
          const from = s.dateFrom.toISOString().slice(0, 10);
          const to = s.dateTo.toISOString().slice(0, 10);
          return dateStr >= from && dateStr <= to;
        });

        nightBreakdown.push({
          date: dateStr,
          seasonId: matchingSeason?.id ?? null,
          seasonName: matchingSeason?.name ?? "No Season",
        });

        if (!matchingSeason) {
          warnings.push(`Night ${dateStr} has no matching season`);
        }
      }

      // Check release days per season
      for (const season of contract.seasons) {
        if (season.releaseDays) {
          const seasonFrom = season.dateFrom.toISOString().slice(0, 10);
          const releaseDeadline = new Date(seasonFrom);
          releaseDeadline.setDate(releaseDeadline.getDate() - season.releaseDays);
          if (bookingDate > releaseDeadline) {
            const hasNightsInSeason = nightBreakdown.some(
              (n) => n.seasonId === season.id,
            );
            if (hasNightsInSeason) {
              warnings.push(
                `Season "${season.name}" has a ${season.releaseDays}-day release; booking deadline was ${releaseDeadline.toISOString().slice(0, 10)}`,
              );
            }
          }
        }
      }

      // Check stop sales
      const checkInStr = input.checkIn;
      const checkOutStr = input.checkOut;
      for (const ss of contract.stopSales) {
        const ssFrom = ss.dateFrom.toISOString().slice(0, 10);
        const ssTo = ss.dateTo.toISOString().slice(0, 10);
        if (checkInStr <= ssTo && checkOutStr > ssFrom) {
          warnings.push(
            `Stop sale active ${ssFrom} to ${ssTo}${ss.reason ? `: ${ss.reason}` : ""}`,
          );
        }
      }

      // Build rate matrix: room type × meal basis × season
      interface RateRow {
        roomTypeId: string;
        roomTypeName: string;
        roomTypeCode: string;
        mealBasisId: string;
        mealBasisName: string;
        mealCode: string;
        nightlyRates: { date: string; seasonName: string; rate: number }[];
        totalRate: number;
        avgPerNight: number;
      }

      const rateMatrix: RateRow[] = [];

      for (const rt of contract.roomTypes) {
        // Check allotment availability
        for (const season of contract.seasons) {
          const allotment = contract.allotments.find(
            (a) => a.seasonId === season.id && a.roomTypeId === rt.roomTypeId,
          );
          if (allotment && !allotment.freeSale) {
            const available = allotment.totalRooms - allotment.soldRooms;
            if (available <= 0) {
              warnings.push(
                `No allotment available for ${rt.roomType.name} in ${season.name}`,
              );
            }
          }
        }

        for (const mb of contract.mealBases) {
          const nightlyRates: { date: string; seasonName: string; rate: number }[] = [];
          let totalRate = 0;

          for (const night of nightBreakdown) {
            if (!night.seasonId) {
              nightlyRates.push({ date: night.date, seasonName: night.seasonName, rate: 0 });
              continue;
            }

            // Base rate for this season
            const baseRate = contract.baseRates.find(
              (br) => br.seasonId === night.seasonId,
            );
            let rate = baseRate ? parseFloat(baseRate.rate.toString()) : 0;

            // Room type supplement
            const roomSup = contract.supplements.find(
              (s) =>
                s.supplementType === "ROOM_TYPE" &&
                s.roomTypeId === rt.roomTypeId,
            );
            if (roomSup) {
              const supVal = parseFloat(roomSup.value.toString());
              rate += roomSup.isReduction ? -supVal : supVal;
            }

            // Meal supplement
            const mealSup = contract.supplements.find(
              (s) =>
                s.supplementType === "MEAL" &&
                s.mealBasisId === mb.mealBasisId,
            );
            if (mealSup) {
              const supVal = parseFloat(mealSup.value.toString());
              rate += mealSup.isReduction ? -supVal : supVal;
            }

            // Per person basis: multiply by adults
            if (contract.rateBasis === "PER_PERSON") {
              rate = rate * input.adults;
            }

            nightlyRates.push({ date: night.date, seasonName: night.seasonName, rate: Math.round(rate * 100) / 100 });
            totalRate += rate;
          }

          rateMatrix.push({
            roomTypeId: rt.roomTypeId,
            roomTypeName: rt.roomType.name,
            roomTypeCode: rt.roomType.code,
            mealBasisId: mb.mealBasisId,
            mealBasisName: mb.mealBasis.name,
            mealCode: mb.mealBasis.mealCode,
            nightlyRates,
            totalRate: Math.round(totalRate * 100) / 100,
            avgPerNight: Math.round((totalRate / (nights || 1)) * 100) / 100,
          });
        }
      }

      // Offer eligibility
      interface OfferEligibility {
        offerId: string;
        offerName: string;
        offerType: string;
        eligible: boolean;
        reasons: string[];
        discountType: string;
        discountValue: number;
      }

      const offerEligibility: OfferEligibility[] = [];
      if (input.showOffers) {
        for (const offer of contract.specialOffers) {
          const reasons: string[] = [];
          let eligible = true;

          // Check travel date validity
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

          // Check booking date
          if (offer.bookByDate) {
            const bookBy = offer.bookByDate.toISOString().slice(0, 10);
            const bDate = bookingDate.toISOString().slice(0, 10);
            if (bDate > bookBy) {
              eligible = false;
              reasons.push(`Booking date past deadline (${bookBy})`);
            }
          }

          // Check advance booking days
          if (offer.advanceBookDays) {
            const daysBefore = Math.round(
              (checkIn.getTime() - bookingDate.getTime()) / (24 * 60 * 60 * 1000),
            );
            if (daysBefore < offer.advanceBookDays) {
              eligible = false;
              reasons.push(
                `${daysBefore} days advance vs ${offer.advanceBookDays} required`,
              );
            }
          }

          // Check minimum nights
          if (offer.minimumNights && nights < offer.minimumNights) {
            eligible = false;
            reasons.push(`${nights} nights vs ${offer.minimumNights} min required`);
          }

          // Check free nights
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
        bookingDate: bookingDate.toISOString().slice(0, 10),
        nightBreakdown,
        rateMatrix,
        offerEligibility,
        warnings,
        status: warnings.length > 0 ? "WARNING" : "OK",
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
