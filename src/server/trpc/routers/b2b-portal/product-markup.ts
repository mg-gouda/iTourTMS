import { TRPCError } from "@trpc/server";
import { MarkupType, PartnerProductType } from "@prisma/client";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

/**
 * Trade margin on excursions, transfers and packages.
 *
 * Hotel margin lives in MarkupRule, scoped by contract and destination. None
 * of that applies to a day trip, so these rules are scoped the way these
 * products are: a partner, a type, and optionally one product.
 */
export const productMarkupRouter = createTRPCRouter({
  list: p("b2b-portal:markup:read")
    .input(
      z
        .object({
          tourOperatorId: z.string().optional(),
          productType: z.nativeEnum(PartnerProductType).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.partnerProductMarkup.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.tourOperatorId ? { tourOperatorId: input.tourOperatorId } : {}),
          ...(input?.productType ? { productType: input.productType } : {}),
        },
        select: {
          id: true,
          productType: true,
          productId: true,
          markupType: true,
          value: true,
          active: true,
          validFrom: true,
          validTo: true,
          tourOperator: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ productType: "asc" }, { tourOperator: { name: "asc" } }],
      });
    }),

  /** The products a rule can name, so the form offers real choices. */
  products: p("b2b-portal:markup:read")
    .input(z.object({ productType: z.nativeEnum(PartnerProductType) }))
    .query(async ({ ctx, input }) => {
      if (input.productType === "EXCURSION") {
        const rows = await ctx.db.crmExcursion.findMany({
          where: { companyId: ctx.companyId, active: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
        });
        return rows.map((r) => ({ id: r.id, label: `${r.name} (${r.code})` }));
      }

      if (input.productType === "TRANSFER") {
        const rows = await ctx.db.ttPriceItem.findMany({
          where: { companyId: ctx.companyId, isActive: true },
          select: {
            id: true,
            vehicleType: { select: { name: true } },
            fromZone: { select: { name: true } },
            toZone: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => ({
          id: r.id,
          label: `${r.vehicleType?.name ?? "Vehicle"}${
            r.fromZone?.name && r.toZone?.name ? ` · ${r.fromZone.name} → ${r.toZone.name}` : ""
          }`,
        }));
      }

      const rows = await ctx.db.opsPackage.findMany({
        where: { companyId: ctx.companyId, isTemplate: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return rows.map((r) => ({ id: r.id, label: r.name }));
    }),

  save: p("b2b-portal:markup:update")
    .input(
      z.object({
        tourOperatorId: z.string().min(1),
        productType: z.nativeEnum(PartnerProductType),
        /** Null sets the partner's default for the whole type. */
        productId: z.string().nullable().default(null),
        markupType: z.nativeEnum(MarkupType),
        value: z.number().min(0).max(999999),
        active: z.boolean().default(true),
        validFrom: z.date().nullable().optional(),
        validTo: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operator = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!operator) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });

      // Not an upsert: the unique index covers a nullable productId and
      // Postgres treats every NULL as distinct, so it would not deduplicate
      // the type-wide rule — and two of those would double the margin.
      const scope = {
        tourOperatorId: input.tourOperatorId,
        productType: input.productType,
        productId: input.productId,
      };
      const existing = await ctx.db.partnerProductMarkup.findFirst({
        where: scope,
        select: { id: true },
      });

      const data = {
        markupType: input.markupType,
        value: input.value,
        active: input.active,
        validFrom: input.validFrom ?? null,
        validTo: input.validTo ?? null,
      };

      const saved = existing
        ? await ctx.db.partnerProductMarkup.update({ where: { id: existing.id }, data })
        : await ctx.db.partnerProductMarkup.create({
            data: { ...scope, ...data, companyId: ctx.companyId, createdById: ctx.user.id },
          });

      if (existing) {
        await ctx.db.partnerProductMarkup.deleteMany({
          where: { ...scope, id: { not: existing.id } },
        });
      }

      await auditPartner("MARKUP_CHANGED", {
        companyId: ctx.companyId,
        tourOperatorId: input.tourOperatorId,
        userId: ctx.user.id,
        entityType: input.productType,
        entityId: input.productId,
        ip: ctx.clientIp,
        metadata: { markupType: input.markupType, value: input.value },
      });

      return saved;
    }),

  delete: p("b2b-portal:markup:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.partnerProductMarkup.deleteMany({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
});
