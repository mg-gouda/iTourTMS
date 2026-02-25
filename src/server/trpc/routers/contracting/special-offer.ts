import { z } from "zod";

import {
  offerTierSaveSchema,
  specialOfferCreateSchema,
  specialOfferUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { logContractAction } from "@/server/services/contracting/audit-logger";
import {
  evaluateCombinability as evaluateOfferCombinability,
  type OfferInput,
} from "@/server/services/contracting/offer-engine";
import type { PrismaClient } from "@prisma/client";

const proc = moduleProcedure("contracting");

async function verifyContract(
  db: PrismaClient,
  contractId: string,
  companyId: string,
) {
  await db.contract.findFirstOrThrow({
    where: { id: contractId, companyId },
  });
}

export const specialOfferRouter = createTRPCRouter({
  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractSpecialOffer.findMany({
        where: { contractId: input.contractId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const offer = await ctx.db.contractSpecialOffer.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (offer.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return offer;
    }),

  create: proc
    .input(specialOfferCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      const created = await ctx.db.contractSpecialOffer.create({
        data: {
          contractId: input.contractId,
          name: input.name,
          offerType: input.offerType,
          description: input.description ?? null,
          validFrom: input.validFrom ? new Date(input.validFrom) : null,
          validTo: input.validTo ? new Date(input.validTo) : null,
          bookByDate: input.bookByDate ? new Date(input.bookByDate) : null,
          minimumNights: input.minimumNights ?? null,
          minimumRooms: input.minimumRooms ?? null,
          advanceBookDays: input.advanceBookDays ?? null,
          discountType: input.discountType,
          discountValue: input.discountValue,
          stayNights: input.stayNights ?? null,
          payNights: input.payNights ?? null,
          bookFromDate: input.bookFromDate ? new Date(input.bookFromDate) : null,
          stayDateType: input.stayDateType ?? null,
          paymentPct: input.paymentPct ?? null,
          paymentDeadline: input.paymentDeadline ? new Date(input.paymentDeadline) : null,
          roomingListBy: input.roomingListBy ? new Date(input.roomingListBy) : null,
          combinable: input.combinable,
          active: input.active,
          sortOrder: input.sortOrder,
        },
      });

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "CREATE",
        entity: "OFFER",
        entityId: created.id,
        summary: `Created offer "${input.name}"`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return created;
    }),

  update: proc
    .input(z.object({ id: z.string(), data: specialOfferUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.db.contractSpecialOffer.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (offer.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      const data: Record<string, unknown> = {};
      if (input.data.name !== undefined) data.name = input.data.name;
      if (input.data.offerType !== undefined) data.offerType = input.data.offerType;
      if (input.data.description !== undefined) data.description = input.data.description ?? null;
      if (input.data.validFrom !== undefined) data.validFrom = input.data.validFrom ? new Date(input.data.validFrom) : null;
      if (input.data.validTo !== undefined) data.validTo = input.data.validTo ? new Date(input.data.validTo) : null;
      if (input.data.bookByDate !== undefined) data.bookByDate = input.data.bookByDate ? new Date(input.data.bookByDate) : null;
      if (input.data.minimumNights !== undefined) data.minimumNights = input.data.minimumNights ?? null;
      if (input.data.minimumRooms !== undefined) data.minimumRooms = input.data.minimumRooms ?? null;
      if (input.data.advanceBookDays !== undefined) data.advanceBookDays = input.data.advanceBookDays ?? null;
      if (input.data.discountType !== undefined) data.discountType = input.data.discountType;
      if (input.data.discountValue !== undefined) data.discountValue = input.data.discountValue;
      if (input.data.stayNights !== undefined) data.stayNights = input.data.stayNights ?? null;
      if (input.data.payNights !== undefined) data.payNights = input.data.payNights ?? null;
      if (input.data.bookFromDate !== undefined) data.bookFromDate = input.data.bookFromDate ? new Date(input.data.bookFromDate) : null;
      if (input.data.stayDateType !== undefined) data.stayDateType = input.data.stayDateType ?? null;
      if (input.data.paymentPct !== undefined) data.paymentPct = input.data.paymentPct ?? null;
      if (input.data.paymentDeadline !== undefined) data.paymentDeadline = input.data.paymentDeadline ? new Date(input.data.paymentDeadline) : null;
      if (input.data.roomingListBy !== undefined) data.roomingListBy = input.data.roomingListBy ? new Date(input.data.roomingListBy) : null;
      if (input.data.combinable !== undefined) data.combinable = input.data.combinable;
      if (input.data.active !== undefined) data.active = input.data.active;
      if (input.data.sortOrder !== undefined) data.sortOrder = input.data.sortOrder;

      const updated = await ctx.db.contractSpecialOffer.update({
        where: { id: input.id },
        data,
      });

      await logContractAction(ctx.db, {
        contractId: offer.contractId,
        action: "UPDATE",
        entity: "OFFER",
        entityId: input.id,
        summary: `Updated offer`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return updated;
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.db.contractSpecialOffer.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (offer.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      const deleted = await ctx.db.contractSpecialOffer.delete({
        where: { id: input.id },
      });

      await logContractAction(ctx.db, {
        contractId: offer.contractId,
        action: "DELETE",
        entity: "OFFER",
        entityId: input.id,
        summary: `Deleted offer`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return deleted;
    }),

  toggleActive: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.db.contractSpecialOffer.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (offer.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      const toggled = await ctx.db.contractSpecialOffer.update({
        where: { id: input.id },
        data: { active: !offer.active },
      });

      await logContractAction(ctx.db, {
        contractId: offer.contractId,
        action: "UPDATE",
        entity: "OFFER",
        entityId: input.id,
        summary: `Toggled offer active status`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return toggled;
    }),

  // ── Offer Tiers ──

  listTiers: proc
    .input(z.object({ offerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const offer = await ctx.db.contractSpecialOffer.findFirstOrThrow({
        where: { id: input.offerId },
        include: { contract: { select: { companyId: true } } },
      });
      if (offer.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.contractOfferTier.findMany({
        where: { offerId: input.offerId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  saveTiers: proc
    .input(offerTierSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.db.contractSpecialOffer.findFirstOrThrow({
        where: { id: input.offerId },
        include: { contract: { select: { companyId: true } } },
      });
      if (offer.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.contractOfferTier.deleteMany({
          where: { offerId: input.offerId },
        });

        if (input.tiers.length > 0) {
          await tx.contractOfferTier.createMany({
            data: input.tiers.map((t, idx) => ({
              offerId: input.offerId,
              thresholdValue: t.thresholdValue,
              discountType: t.discountType,
              discountValue: t.discountValue,
              sortOrder: t.sortOrder ?? idx,
            })),
          });
        }
      });

      await logContractAction(ctx.db, {
        contractId: offer.contractId,
        action: "UPDATE",
        entity: "OFFER",
        entityId: input.offerId,
        summary: `Updated offer tiers (${input.tiers.length} tiers)`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return { success: true };
    }),

  // ── Offer Combinability Engine ──

  evaluateCombinability: proc
    .input(
      z.object({
        contractId: z.string(),
        checkInDate: z.string(),
        bookingDate: z.string(),
        nights: z.number().int().min(1),
        rooms: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      const offers = await ctx.db.contractSpecialOffer.findMany({
        where: { contractId: input.contractId, active: true },
        include: { tiers: { orderBy: { thresholdValue: "desc" } } },
        orderBy: { sortOrder: "asc" },
      });

      const offerInputs: OfferInput[] = offers.map((o) => ({
        id: o.id,
        name: o.name,
        offerType: o.offerType,
        discountType: o.discountType,
        discountValue: o.discountValue,
        combinable: o.combinable,
        validFrom: o.validFrom,
        validTo: o.validTo,
        bookByDate: o.bookByDate,
        bookFromDate: o.bookFromDate,
        advanceBookDays: o.advanceBookDays,
        minimumNights: o.minimumNights,
        minimumRooms: o.minimumRooms,
        stayNights: o.stayNights,
        payNights: o.payNights,
        tiers: o.tiers.map((t) => ({
          id: t.id,
          thresholdValue: t.thresholdValue,
          discountType: t.discountType,
          discountValue: t.discountValue,
        })),
      }));

      return evaluateOfferCombinability(offerInputs, {
        checkInDate: new Date(input.checkInDate),
        bookingDate: new Date(input.bookingDate),
        nights: input.nights,
        rooms: input.rooms,
      });
    }),
});
