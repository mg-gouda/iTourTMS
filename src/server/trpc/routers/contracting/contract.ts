import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
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
});
