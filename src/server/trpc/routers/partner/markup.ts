import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { createTRPCRouter, partnerProcedure, partnerRoleProcedure } from "@/server/trpc";
import { invalidatePartnerSearch } from "@/server/services/b2b/partner-search";
import { partnerHotelIds } from "@/server/services/b2b/partner-search";

/**
 * The partner's own margin, per hotel and optionally per season.
 *
 * Only admins edit it: an agent who can quietly raise the client price is a
 * pricing decision nobody at the partner agreed to. Everyone may read it,
 * because an agent quoting a customer needs to know what the price includes.
 */
const adminOnly = partnerRoleProcedure("PARTNER_ADMIN");

/** Per person per night, so a big number here is a big number times everybody. */
const amountPppn = z.number().min(0).max(9999);

export const partnerMarkupRouter = createTRPCRouter({
  /**
   * Every hotel the partner may sell, its seasons, and whatever markup is
   * already set — one payload, because the page is a grid, not a search.
   */
  grid: partnerProcedure.query(async ({ ctx }) => {
    const allowed = await partnerHotelIds(ctx.partner.tourOperatorId);
    // Agents read it — they quote customers and need to know what the price
    // includes — but only admins may change it.
    const canEdit = ctx.partner.role === "PARTNER_ADMIN";
    if (allowed.length === 0) return { hotels: [], currencyCode: "", canEdit };

    const [contracts, rules, company] = await Promise.all([
      ctx.db.contract.findMany({
        where: {
          companyId: ctx.partner.companyId,
          hotelId: { in: allowed },
          status: "PUBLISHED",
          validTo: { gte: new Date() },
        },
        select: {
          id: true,
          hotelId: true,
          baseCurrency: { select: { id: true, code: true } },
          hotel: { select: { id: true, name: true, city: true } },
          seasons: {
            orderBy: { dateFrom: "asc" },
            select: { id: true, dateFrom: true, dateTo: true },
          },
        },
        orderBy: { validFrom: "asc" },
      }),
      ctx.db.partnerMarkupRule.findMany({
        where: { tourOperatorId: ctx.partner.tourOperatorId, active: true },
        select: { id: true, hotelId: true, seasonId: true, amountPppn: true },
      }),
      ctx.db.company.findUnique({
        where: { id: ctx.partner.companyId },
        select: { baseCurrency: { select: { code: true } } },
      }),
    ]);

    const ruleFor = (hotelId: string, seasonId: string | null) =>
      rules.find((r) => r.hotelId === hotelId && r.seasonId === seasonId);

    // One row per hotel; a hotel with two overlapping contracts still gets one
    // markup, because the partner sells a hotel, not a contract.
    const seen = new Set<string>();
    const hotels = contracts
      .filter((c) => c.hotelId && !seen.has(c.hotelId) && seen.add(c.hotelId))
      .map((c) => ({
        hotelId: c.hotelId!,
        name: c.hotel?.name ?? "",
        city: c.hotel?.city ?? "",
        currencyCode: c.baseCurrency?.code ?? "",
        defaultPppn: Number(ruleFor(c.hotelId!, null)?.amountPppn ?? 0),
        seasons: c.seasons.map((s) => ({
          id: s.id,
          dateFrom: s.dateFrom,
          dateTo: s.dateTo,
          pppn: ruleFor(c.hotelId!, s.id) ? Number(ruleFor(c.hotelId!, s.id)!.amountPppn) : null,
        })),
      }));

    return { hotels, currencyCode: company?.baseCurrency?.code ?? "", canEdit };
  }),

  /**
   * Sets one cell of the grid. A null amount removes the rule rather than
   * storing a zero — "no markup set for this season" and "deliberately zero"
   * read the same on screen but behave differently when the hotel-wide figure
   * should take over.
   */
  set: adminOnly
    .input(
      z.object({
        hotelId: z.string(),
        seasonId: z.string().nullable(),
        amountPppn: amountPppn.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = await partnerHotelIds(ctx.partner.tourOperatorId);
      if (!allowed.includes(input.hotelId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "That hotel is not on your account." });
      }

      // The rule is priced in the contract's currency, not the partner's guess.
      const contract = await ctx.db.contract.findFirst({
        where: {
          companyId: ctx.partner.companyId,
          hotelId: input.hotelId,
          status: "PUBLISHED",
          ...(input.seasonId ? { seasons: { some: { id: input.seasonId } } } : {}),
        },
        select: { baseCurrencyId: true },
      });
      if (!contract) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No live contract for that hotel." });
      }

      if (input.amountPppn === null) {
        await ctx.db.partnerMarkupRule.deleteMany({
          where: {
            tourOperatorId: ctx.partner.tourOperatorId,
            hotelId: input.hotelId,
            seasonId: input.seasonId,
          },
        });
      } else {
        // Not an upsert: the unique index covers a nullable seasonId, and
        // Postgres treats every NULL as distinct, so the hotel-wide rule is
        // not actually deduplicated by the constraint. Find it, then decide.
        const scope = {
          tourOperatorId: ctx.partner.tourOperatorId,
          hotelId: input.hotelId,
          seasonId: input.seasonId,
        };
        const existing = await ctx.db.partnerMarkupRule.findFirst({
          where: scope,
          select: { id: true },
        });

        if (existing) {
          await ctx.db.partnerMarkupRule.update({
            where: { id: existing.id },
            data: { amountPppn: input.amountPppn, active: true },
          });
          // Any duplicate NULL-season rows a past write could have left behind
          // would silently double the margin, so clear them while we are here.
          await ctx.db.partnerMarkupRule.deleteMany({
            where: { ...scope, id: { not: existing.id } },
          });
        } else {
          await ctx.db.partnerMarkupRule.create({
            data: {
              ...scope,
              companyId: ctx.partner.companyId,
              amountPppn: input.amountPppn,
              currencyId: contract.baseCurrencyId,
              createdById: ctx.partner.userId,
            },
          });
        }
      }

      // Search caches the priced results, so a new margin has to clear them.
      await invalidatePartnerSearch(ctx.partner.tourOperatorId);

      await auditPartner("MARKUP_CHANGED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: ctx.partner.userId,
        entityType: "Hotel",
        entityId: input.hotelId,
        ip: ctx.clientIp,
        metadata: { seasonId: input.seasonId, amountPppn: input.amountPppn },
      });

      return { hotelId: input.hotelId, seasonId: input.seasonId, amountPppn: input.amountPppn };
    }),
});
