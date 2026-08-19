import { z } from "zod";

import { createTRPCRouter, partnerProcedure } from "@/server/trpc";
import {
  loadProductMarkups,
  priceProduct,
} from "@/server/services/b2b/partner-products";

/**
 * The catalogue beyond hotels: excursions, transfers and packages.
 *
 * Every price here is the staff-quoted figure with the partner's trade margin
 * already added. The staff figure itself never leaves this file — a partner
 * seeing what we quote internally is the same leak as showing them a contract
 * rate.
 */
export const partnerProductsRouter = createTRPCRouter({
  /** Day trips and activities, priced per person from the current cost sheet. */
  excursions: partnerProcedure
    .input(z.object({ search: z.string().max(60).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const [excursions, markups] = await Promise.all([
        ctx.db.crmExcursion.findMany({
          where: {
            companyId: ctx.partner.companyId,
            active: true,
            ...(input?.search
              ? { name: { contains: input.search, mode: "insensitive" as const } }
              : {}),
          },
          select: {
            id: true,
            code: true,
            name: true,
            productType: true,
            category: true,
            duration: true,
            description: true,
            inclusions: true,
            minPax: true,
            maxPax: true,
            costSheets: {
              // The sheet in force today, not simply the newest one.
              where: {
                AND: [
                  { OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }] },
                  { OR: [{ validTo: null }, { validTo: { gte: new Date() } }] },
                ],
              },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                sellingPrices: {
                  where: { active: true },
                  orderBy: { sortOrder: "asc" },
                  select: { id: true, label: true, sellingPrice: true, currency: true },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        }),
        loadProductMarkups(ctx.partner.companyId, ctx.partner.tourOperatorId, "EXCURSION"),
      ]);

      return excursions.map((e) => {
        // An excursion is one day, and its price is already per person, so the
        // margin applies once per person rather than per night.
        const prices = (e.costSheets[0]?.sellingPrices ?? []).map((p) => {
          const priced = priceProduct(markups, e.id, Number(p.sellingPrice), {
            nights: 1,
            occupants: 1,
          });
          return {
            id: p.id,
            label: p.label,
            currency: p.currency,
            net: priced.net,
            markupAmount: priced.markupAmount,
          };
        });

        return {
          id: e.id,
          code: e.code,
          name: e.name,
          productType: e.productType,
          category: e.category,
          duration: e.duration,
          description: e.description,
          inclusions: e.inclusions,
          minPax: e.minPax,
          maxPax: e.maxPax,
          prices,
          from: prices.length ? Math.min(...prices.map((p) => p.net)) : null,
          currency: prices[0]?.currency ?? null,
        };
      });
    }),

  /** Airport and inter-zone transfers, by vehicle type and route. */
  transfers: partnerProcedure
    .input(z.object({ search: z.string().max(60).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const [items, markups] = await Promise.all([
        ctx.db.ttPriceItem.findMany({
          where: {
            companyId: ctx.partner.companyId,
            isActive: true,
            ...(input?.search
              ? { vehicleType: { name: { contains: input.search, mode: "insensitive" as const } } }
              : {}),
          },
          select: {
            id: true,
            price: true,
            priceType: true,
            serviceType: true,
            description: true,
            vehicleType: { select: { id: true, name: true, capacity: true } },
            fromZone: { select: { name: true } },
            toZone: { select: { name: true } },
            currency: { select: { code: true } },
          },
          orderBy: [{ vehicleType: { name: "asc" } }],
        }),
        loadProductMarkups(ctx.partner.companyId, ctx.partner.tourOperatorId, "TRANSFER"),
      ]);

      return items.map((t) => {
        // One trip, so no nights; per-person pricing is already per person.
        const priced = priceProduct(markups, t.id, Number(t.price), {
          nights: 1,
          occupants: 1,
        });
        return {
          id: t.id,
          vehicleType: t.vehicleType?.name ?? "",
          capacity: t.vehicleType?.capacity ?? null,
          route:
            t.fromZone?.name && t.toZone?.name
              ? `${t.fromZone.name} → ${t.toZone.name}`
              : (t.description ?? "Any route"),
          priceType: t.priceType,
          serviceType: t.serviceType,
          currency: t.currency?.code ?? "",
          net: priced.net,
          markupAmount: priced.markupAmount,
        };
      });
    }),

  /** Ready-made tour packages staff have costed. */
  packages: partnerProcedure
    .input(z.object({ search: z.string().max(60).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const [packages, markups] = await Promise.all([
        ctx.db.opsPackage.findMany({
          where: {
            companyId: ctx.partner.companyId,
            // Templates are the sellable catalogue; a package attached to one
            // customer's file is that customer's, not a product.
            isTemplate: true,
            ...(input?.search
              ? { name: { contains: input.search, mode: "insensitive" as const } }
              : {}),
          },
          select: {
            id: true,
            name: true,
            description: true,
            baseCurrency: true,
            totalCost: true,
            components: {
              select: { id: true, type: true, description: true },
              take: 12,
            },
          },
          orderBy: { name: "asc" },
        }),
        loadProductMarkups(ctx.partner.companyId, ctx.partner.tourOperatorId, "PACKAGE"),
      ]);

      return packages.map((p) => {
        const priced = priceProduct(markups, p.id, Number(p.totalCost), {
          nights: 1,
          occupants: 1,
        });
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          currency: p.baseCurrency,
          net: priced.net,
          markupAmount: priced.markupAmount,
          components: p.components.map((c) => ({
            id: c.id,
            type: c.type,
            description: c.description,
          })),
        };
      });
    }),
});
