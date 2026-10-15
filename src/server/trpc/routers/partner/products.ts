import { TRPCError } from "@trpc/server";
import { PartnerProductType } from "@prisma/client";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { createTRPCRouter, partnerProcedure, partnerRoleProcedure } from "@/server/trpc";
import { notifyRole } from "@/server/services/shared/notifications";
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
  /** One product in full, so a partner can read it before asking for it. */
  detail: partnerProcedure
    .input(z.object({ productType: z.nativeEnum(PartnerProductType), productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const markups = await loadProductMarkups(
        ctx.partner.companyId,
        ctx.partner.tourOperatorId,
        input.productType,
      );

      if (input.productType === "EXCURSION") {
        const e = await ctx.db.crmExcursion.findFirst({
          where: { id: input.productId, companyId: ctx.partner.companyId, active: true },
          select: {
            id: true,
            code: true,
            name: true,
            productType: true,
            category: true,
            tripMode: true,
            duration: true,
            description: true,
            inclusions: true,
            exclusions: true,
            minPax: true,
            maxPax: true,
            programs: {
              select: {
                id: true,
                title: true,
                items: {
                  orderBy: { sortOrder: "asc" },
                  select: { id: true, title: true, description: true, time: true },
                },
              },
              take: 1,
            },
            costSheets: {
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
        });
        if (!e) throw new TRPCError({ code: "NOT_FOUND", message: "That excursion is not available." });

        const prices = (e.costSheets[0]?.sellingPrices ?? []).map((p) => {
          const priced = priceProduct(markups, e.id, Number(p.sellingPrice), {
            nights: 1,
            occupants: 1,
          });
          return { id: p.id, label: p.label, currency: p.currency, net: priced.net };
        });

        return {
          productType: "EXCURSION" as const,
          id: e.id,
          title: e.name,
          subtitle: e.code,
          facts: [
            ["Category", String(e.category)],
            ["Trip mode", String(e.tripMode)],
            ["Duration", e.duration ?? "—"],
            ["Group size", `${e.minPax ?? 1}–${e.maxPax ?? "any"} pax`],
          ] as [string, string][],
          description: e.description,
          inclusions: e.inclusions,
          exclusions: e.exclusions,
          programme: (e.programs[0]?.items ?? []).map((i) => ({
            id: i.id,
            title: i.title,
            description: i.description,
            time: i.time,
          })),
          prices,
          currency: prices[0]?.currency ?? null,
          unitLabel: "per person",
        };
      }

      if (input.productType === "TRANSFER") {
        const t = await ctx.db.ttPriceItem.findFirst({
          where: { id: input.productId, companyId: ctx.partner.companyId, isActive: true },
          select: {
            id: true,
            price: true,
            priceType: true,
            serviceType: true,
            description: true,
            vehicleType: { select: { name: true, capacity: true } },
            fromZone: { select: { name: true } },
            toZone: { select: { name: true } },
            currency: { select: { code: true } },
          },
        });
        if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "That transfer is not available." });

        const priced = priceProduct(markups, t.id, Number(t.price), { nights: 1, occupants: 1 });
        const perVehicle = t.priceType === "PER_VEHICLE";

        return {
          productType: "TRANSFER" as const,
          id: t.id,
          title: t.vehicleType?.name ?? "Transfer",
          subtitle:
            t.fromZone?.name && t.toZone?.name
              ? `${t.fromZone.name} → ${t.toZone.name}`
              : (t.description ?? "Any route"),
          facts: [
            ["Vehicle", t.vehicleType?.name ?? "—"],
            ["Capacity", t.vehicleType?.capacity ? `${t.vehicleType.capacity} seats` : "—"],
            ["Service", String(t.serviceType ?? "—")],
            ["Priced", perVehicle ? "per vehicle" : "per person"],
          ] as [string, string][],
          description: t.description,
          inclusions: null,
          exclusions: null,
          programme: [],
          prices: [
            {
              id: t.id,
              label: perVehicle ? "Per vehicle" : "Per person",
              currency: t.currency?.code ?? "",
              net: priced.net,
            },
          ],
          currency: t.currency?.code ?? null,
          unitLabel: perVehicle ? "per vehicle" : "per person",
        };
      }

      const pkg = await ctx.db.opsPackage.findFirst({
        where: { id: input.productId, companyId: ctx.partner.companyId, isTemplate: true },
        select: {
          id: true,
          name: true,
          description: true,
          baseCurrency: true,
          totalCost: true,
          notes: true,
          components: {
            select: {
              id: true,
              type: true,
              description: true,
              nights: true,
              pricingBasis: true,
            },
          },
        },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "That package is not available." });

      const priced = priceProduct(markups, pkg.id, Number(pkg.totalCost), {
        nights: 1,
        occupants: 1,
      });

      return {
        productType: "PACKAGE" as const,
        id: pkg.id,
        title: pkg.name,
        subtitle: null,
        facts: [["Components", String(pkg.components.length)]] as [string, string][],
        description: pkg.description,
        inclusions: pkg.notes,
        exclusions: null,
        programme: pkg.components.map((c) => ({
          id: c.id,
          title: String(c.type),
          description: c.description,
          time: null as string | null,
        })),
        prices: [{ id: pkg.id, label: "Package total", currency: pkg.baseCurrency, net: priced.net }],
        currency: pkg.baseCurrency,
        unitLabel: "total",
      };
    }),
  /**
   * Asks for a product. None of these has an availability engine — a day trip
   * needs a guide and a seat — so this records a request for staff to answer
   * rather than pretending to confirm anything.
   *
   * The price is re-derived here and stored on the row: what the browser sends
   * is a suggestion, and a markup edited next week must not rewrite what was
   * agreed today.
   */
  request: partnerRoleProcedure("PARTNER_ADMIN", "PARTNER_AGENT")
    .input(
      z.object({
        productType: z.nativeEnum(PartnerProductType),
        productId: z.string().min(1),
        serviceDate: z.string().min(1),
        adults: z.number().int().min(1).max(200),
        children: z.number().int().min(0).max(200).default(0),
        units: z.number().int().min(1).max(50).default(1),
        leadGuestName: z.string().max(120).optional(),
        partnerReference: z.string().max(60).optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const serviceDate = new Date(input.serviceDate);
      if (Number.isNaN(serviceDate.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That date is not valid." });
      }
      if (serviceDate < new Date(new Date().toDateString())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a date in the future." });
      }

      const markups = await loadProductMarkups(
        ctx.partner.companyId,
        ctx.partner.tourOperatorId,
        input.productType,
      );

      // Resolve name, staff price and currency from the product itself, so a
      // tampered payload cannot buy anything at a price we did not set.
      let productName = "";
      let staffPrice = 0;
      let currency = "";
      let quantity = input.units;

      if (input.productType === "EXCURSION") {
        const e = await ctx.db.crmExcursion.findFirst({
          where: { id: input.productId, companyId: ctx.partner.companyId, active: true },
          select: {
            name: true,
            costSheets: {
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
                  take: 1,
                  select: { sellingPrice: true, currency: true },
                },
              },
            },
          },
        });
        const price = e?.costSheets[0]?.sellingPrices[0];
        if (!e || !price) {
          throw new TRPCError({ code: "CONFLICT", message: "That excursion has no current price." });
        }
        productName = e.name;
        staffPrice = Number(price.sellingPrice);
        currency = price.currency;
        // Priced per person, so everyone travelling counts.
        quantity = input.adults + input.children;
      } else if (input.productType === "TRANSFER") {
        const t = await ctx.db.ttPriceItem.findFirst({
          where: { id: input.productId, companyId: ctx.partner.companyId, isActive: true },
          select: {
            price: true,
            priceType: true,
            vehicleType: { select: { name: true } },
            fromZone: { select: { name: true } },
            toZone: { select: { name: true } },
            currency: { select: { code: true } },
          },
        });
        if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "That transfer is not available." });
        productName = `${t.vehicleType?.name ?? "Transfer"}${
          t.fromZone?.name && t.toZone?.name ? ` · ${t.fromZone.name} → ${t.toZone.name}` : ""
        }`;
        staffPrice = Number(t.price);
        currency = t.currency?.code ?? "";
        quantity = t.priceType === "PER_VEHICLE" ? input.units : input.adults + input.children;
      } else {
        const pkg = await ctx.db.opsPackage.findFirst({
          where: { id: input.productId, companyId: ctx.partner.companyId, isTemplate: true },
          select: { name: true, totalCost: true, baseCurrency: true },
        });
        if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "That package is not available." });
        productName = pkg.name;
        staffPrice = Number(pkg.totalCost);
        currency = pkg.baseCurrency;
        quantity = input.adults + input.children;
      }

      const unit = priceProduct(markups, input.productId, staffPrice, {
        nights: 1,
        occupants: 1,
      });
      const lineStaff = Math.round(staffPrice * quantity * 100) / 100;
      const lineNet = Math.round(unit.net * quantity * 100) / 100;

      // The unique index on (companyId, code) is what actually prevents a
      // duplicate; the retry is for the race that produces one.
      const year = new Date().getFullYear();
      let created: { id: string; code: string } | null = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const used = await ctx.db.partnerProductBooking.count({
          where: { companyId: ctx.partner.companyId, code: { startsWith: `PR-${year}-` } },
        });
        const code = `PR-${year}-${String(used + 1 + attempt).padStart(5, "0")}`;
        try {
          created = await ctx.db.partnerProductBooking.create({
            data: {
              companyId: ctx.partner.companyId,
              tourOperatorId: ctx.partner.tourOperatorId,
              code,
              productType: input.productType,
              productId: input.productId,
              productName,
              serviceDate,
              adults: input.adults,
              children: input.children,
              units: quantity,
              staffPrice: lineStaff,
              net: lineNet,
              markupAmount: Math.round((lineNet - lineStaff) * 100) / 100,
              currency,
              leadGuestName: input.leadGuestName ?? null,
              partnerReference: input.partnerReference ?? null,
              notes: input.notes ?? null,
              requestedById: ctx.partner.userId,
            },
            select: { id: true, code: true },
          });
        } catch (err) {
          const code2 = (err as { code?: string }).code;
          if (code2 !== "P2002") throw err;
        }
      }
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not raise the request." });
      }

      await notifyRole(ctx.db, ctx.partner.companyId, "super_admin", {
        type: "B2B_PRODUCT_REQUESTED",
        title: `Partner request ${created.code}`,
        message: `${ctx.partner.name} asked for ${productName} on ${serviceDate
          .toISOString()
          .slice(0, 10)}.`,
        link: `/b2b-portal/product-bookings`,
      });

      await auditPartner("BOOKING_CREATED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: ctx.partner.userId,
        entityType: "PartnerProductBooking",
        entityId: created.id,
        ip: ctx.clientIp,
        metadata: { code: created.code, productType: input.productType, net: lineNet },
      });

      return { id: created.id, code: created.code, net: lineNet, currency };
    }),

  /** The partner's own requests and what became of them. */
  myRequests: partnerProcedure.query(async ({ ctx }) => {
    return ctx.db.partnerProductBooking.findMany({
      where: {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        productType: true,
        productName: true,
        status: true,
        serviceDate: true,
        adults: true,
        children: true,
        units: true,
        net: true,
        currency: true,
        partnerReference: true,
        staffNote: true,
        createdAt: true,
      },
    });
  }),
});
