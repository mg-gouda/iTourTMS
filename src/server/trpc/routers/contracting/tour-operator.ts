import { z } from "zod";

import {
  tourOperatorCreateSchema,
  tourOperatorUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("contracting", code);

export const tourOperatorRouter = createTRPCRouter({
  // ── List all tour operators ──
  list: p("contracting:contract:read").query(async ({ ctx }) => {
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
  getById: p("contracting:contract:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.tourOperator.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: { select: { id: true, name: true, code: true } },
          market: { select: { id: true, name: true, code: true } },
          partner: { select: { creditLimit: true, creditUsed: true, creditCurrency: true } },
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
  create: p("contracting:contract:create")
    .input(tourOperatorCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const partner = await tx.partner.create({
          data: {
            companyId: ctx.companyId,
            type: "customer",
            isCompany: true,
            name: input.name,
            email: input.email || null,
            phone: input.phone ?? null,
            countryId: input.countryId ?? null,
          },
        });
        return tx.tourOperator.create({
          data: { ...input, companyId: ctx.companyId, partnerId: partner.id },
        });
      });
    }),

  // ── Update ──
  update: p("contracting:contract:update")
    .input(z.object({ id: z.string(), data: tourOperatorUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const to = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        select: { partnerId: true },
      });
      if (to?.partnerId) {
        await ctx.db.partner.update({
          where: { id: to.partnerId },
          data: {
            ...(input.data.name !== undefined && { name: input.data.name }),
            ...(input.data.email !== undefined && { email: input.data.email || null }),
            ...(input.data.phone !== undefined && { phone: input.data.phone ?? null }),
            ...(input.data.countryId !== undefined && { countryId: input.data.countryId ?? null }),
          },
        });
      }
      return ctx.db.tourOperator.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  // ── Delete ──
  delete: p("contracting:contract:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const to = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        select: { partnerId: true },
      });
      await ctx.db.tourOperator.delete({ where: { id: input.id, companyId: ctx.companyId } });
      if (to?.partnerId) {
        await ctx.db.partner.delete({ where: { id: to.partnerId } });
      }
      return { success: true };
    }),

  // ── Contract Assignments ──

  listByContract: p("contracting:contract:read")
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

  assignToContract: p("contracting:contract:update")
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

  unassignFromContract: p("contracting:contract:update")
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

  listByHotel: p("contracting:contract:read")
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

  assignToHotel: p("contracting:contract:update")
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

  unassignFromHotel: p("contracting:contract:update")
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
  bulkAssign: p("contracting:contract:import")
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
