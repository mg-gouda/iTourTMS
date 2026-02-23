import { z } from "zod";

import {
  specialOfferCreateSchema,
  specialOfferUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
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
      return ctx.db.contractSpecialOffer.create({
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
          combinable: input.combinable,
          active: input.active,
          sortOrder: input.sortOrder,
        },
      });
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
      if (input.data.combinable !== undefined) data.combinable = input.data.combinable;
      if (input.data.active !== undefined) data.active = input.data.active;
      if (input.data.sortOrder !== undefined) data.sortOrder = input.data.sortOrder;

      return ctx.db.contractSpecialOffer.update({
        where: { id: input.id },
        data,
      });
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
      return ctx.db.contractSpecialOffer.delete({
        where: { id: input.id },
      });
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
      return ctx.db.contractSpecialOffer.update({
        where: { id: input.id },
        data: { active: !offer.active },
      });
    }),
});
