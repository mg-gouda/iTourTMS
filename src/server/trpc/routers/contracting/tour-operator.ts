import { z } from "zod";

import {
  tourOperatorCreateSchema,
  tourOperatorUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const tourOperatorRouter = createTRPCRouter({
  // ── List all tour operators ──
  list: proc.query(async ({ ctx }) => {
    return ctx.db.tourOperator.findMany({
      where: { companyId: ctx.companyId },
      include: {
        country: { select: { id: true, name: true, code: true } },
        market: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            contractAssignments: true,
            hotelAssignments: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: 500,
    });
  }),

  // ── Get by ID with assignments ──
  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.tourOperator.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: { select: { id: true, name: true, code: true } },
          market: { select: { id: true, name: true, code: true } },
          contractAssignments: {
            include: {
              contract: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  status: true,
                  validFrom: true,
                  validTo: true,
                  hotel: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { assignedAt: "desc" },
          },
          hotelAssignments: {
            include: {
              hotel: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  city: true,
                  country: { select: { name: true } },
                  _count: { select: { contracts: true } },
                },
              },
            },
            orderBy: { assignedAt: "desc" },
          },
        },
      });
    }),

  // ── Create ──
  create: proc
    .input(tourOperatorCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.create({
        data: {
          ...input,
          companyId: ctx.companyId,
        },
      });
    }),

  // ── Update ──
  update: proc
    .input(z.object({ id: z.string(), data: tourOperatorUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  // ── Delete ──
  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tourOperator.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  // ── Contract Assignments ──

  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractTourOperator.findMany({
        where: { contractId: input.contractId },
        include: {
          tourOperator: {
            select: {
              id: true,
              name: true,
              code: true,
              email: true,
              phone: true,
              contactPerson: true,
              active: true,
              country: { select: { name: true } },
              market: { select: { name: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      });
    }),

  assignToContract: proc
    .input(
      z.object({
        contractId: z.string(),
        tourOperatorIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        select: { id: true, hotelId: true },
      });

      const existing = await ctx.db.contractTourOperator.findMany({
        where: {
          contractId: input.contractId,
          tourOperatorId: { in: input.tourOperatorIds },
        },
        select: { tourOperatorId: true },
      });
      const existingIds = new Set(existing.map((e) => e.tourOperatorId));
      const newIds = input.tourOperatorIds.filter((id) => !existingIds.has(id));

      if (newIds.length > 0) {
        await ctx.db.contractTourOperator.createMany({
          data: newIds.map((tourOperatorId) => ({
            contractId: input.contractId,
            tourOperatorId,
          })),
        });
      }

      // Auto-assign the contract's hotel to each tour operator (skip if already assigned)
      const existingHotel = await ctx.db.hotelTourOperator.findMany({
        where: {
          hotelId: contract.hotelId,
          tourOperatorId: { in: input.tourOperatorIds },
        },
        select: { tourOperatorId: true },
      });
      const existingHotelIds = new Set(existingHotel.map((e) => e.tourOperatorId));
      const newHotelIds = input.tourOperatorIds.filter(
        (id) => !existingHotelIds.has(id),
      );

      if (newHotelIds.length > 0) {
        await ctx.db.hotelTourOperator.createMany({
          data: newHotelIds.map((tourOperatorId) => ({
            hotelId: contract.hotelId,
            tourOperatorId,
          })),
        });
      }

      return { assigned: newIds.length, hotelsAssigned: newHotelIds.length };
    }),

  unassignFromContract: proc
    .input(z.object({ contractId: z.string(), tourOperatorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractTourOperator.deleteMany({
        where: {
          contractId: input.contractId,
          tourOperatorId: input.tourOperatorId,
        },
      });
    }),

  // ── Hotel Assignments ──

  listByHotel: proc
    .input(z.object({ hotelId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      return ctx.db.hotelTourOperator.findMany({
        where: { hotelId: input.hotelId },
        include: {
          tourOperator: {
            select: {
              id: true,
              name: true,
              code: true,
              active: true,
              country: { select: { name: true } },
              market: { select: { name: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      });
    }),

  assignToHotel: proc
    .input(
      z.object({
        hotelId: z.string(),
        tourOperatorIds: z.array(z.string()).min(1),
        cascadeToContracts: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hotel = await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      // Create hotel-TO assignments (skip duplicates)
      const existingHotel = await ctx.db.hotelTourOperator.findMany({
        where: {
          hotelId: input.hotelId,
          tourOperatorId: { in: input.tourOperatorIds },
        },
        select: { tourOperatorId: true },
      });
      const existingHotelIds = new Set(existingHotel.map((e) => e.tourOperatorId));
      const newHotelIds = input.tourOperatorIds.filter(
        (id) => !existingHotelIds.has(id),
      );

      if (newHotelIds.length > 0) {
        await ctx.db.hotelTourOperator.createMany({
          data: newHotelIds.map((tourOperatorId) => ({
            hotelId: input.hotelId,
            tourOperatorId,
          })),
        });
      }

      // Cascade: auto-assign to all PUBLISHED contracts for this hotel
      let contractAssignments = 0;
      if (input.cascadeToContracts) {
        const publishedContracts = await ctx.db.contract.findMany({
          where: {
            hotelId: hotel.id,
            companyId: ctx.companyId,
            status: "PUBLISHED",
          },
          select: { id: true },
        });

        for (const contract of publishedContracts) {
          const existingContract = await ctx.db.contractTourOperator.findMany({
            where: {
              contractId: contract.id,
              tourOperatorId: { in: input.tourOperatorIds },
            },
            select: { tourOperatorId: true },
          });
          const existingContractIds = new Set(
            existingContract.map((e) => e.tourOperatorId),
          );
          const newContractIds = input.tourOperatorIds.filter(
            (id) => !existingContractIds.has(id),
          );

          if (newContractIds.length > 0) {
            await ctx.db.contractTourOperator.createMany({
              data: newContractIds.map((tourOperatorId) => ({
                contractId: contract.id,
                tourOperatorId,
              })),
            });
            contractAssignments += newContractIds.length;
          }
        }
      }

      return {
        hotelAssigned: newHotelIds.length,
        contractAssignments,
      };
    }),

  unassignFromHotel: proc
    .input(z.object({ hotelId: z.string(), tourOperatorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      return ctx.db.hotelTourOperator.deleteMany({
        where: {
          hotelId: input.hotelId,
          tourOperatorId: input.tourOperatorId,
        },
      });
    }),

  // ── Bulk Assign: multiple hotels × multiple TOs ──
  bulkAssign: proc
    .input(
      z.object({
        hotelIds: z.array(z.string()).min(1),
        tourOperatorIds: z.array(z.string()).min(1),
        cascadeToContracts: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let hotelAssigned = 0;
      let contractAssigned = 0;

      for (const hotelId of input.hotelIds) {
        // Verify hotel belongs to company
        const hotel = await ctx.db.hotel.findFirst({
          where: { id: hotelId, companyId: ctx.companyId },
        });
        if (!hotel) continue;

        // Create hotel-TO assignments
        for (const toId of input.tourOperatorIds) {
          const exists = await ctx.db.hotelTourOperator.findUnique({
            where: { hotelId_tourOperatorId: { hotelId, tourOperatorId: toId } },
          });
          if (!exists) {
            await ctx.db.hotelTourOperator.create({
              data: { hotelId, tourOperatorId: toId },
            });
            hotelAssigned++;
          }
        }

        // Cascade to published contracts
        if (input.cascadeToContracts) {
          const contracts = await ctx.db.contract.findMany({
            where: {
              hotelId,
              companyId: ctx.companyId,
              status: "PUBLISHED",
            },
            select: { id: true },
          });

          for (const contract of contracts) {
            for (const toId of input.tourOperatorIds) {
              const exists = await ctx.db.contractTourOperator.findUnique({
                where: {
                  contractId_tourOperatorId: {
                    contractId: contract.id,
                    tourOperatorId: toId,
                  },
                },
              });
              if (!exists) {
                await ctx.db.contractTourOperator.create({
                  data: {
                    contractId: contract.id,
                    tourOperatorId: toId,
                  },
                });
                contractAssigned++;
              }
            }
          }
        }
      }

      return { hotelAssigned, contractAssigned };
    }),
});
