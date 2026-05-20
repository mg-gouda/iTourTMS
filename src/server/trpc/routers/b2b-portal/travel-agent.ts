import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

export const travelAgentRouter = createTRPCRouter({
  list: p("b2b-portal:travelAgent:read")
    .input(
      z
        .object({
          active: z.boolean().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TourOperatorWhereInput = {
        companyId: ctx.companyId,
        partnerType: "travel_agent",
      };
      if (input?.active !== undefined) where.active = input.active;
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { code: { contains: input.search, mode: "insensitive" } },
        ];
      }
      return ctx.db.tourOperator.findMany({
        where,
        include: {
          country: true,
          market: true,
          _count: {
            select: {
              contractAssignments: true,
              hotelAssignments: true,
              bookings: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: p("b2b-portal:travelAgent:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId, partnerType: "travel_agent" },
        include: {
          country: true,
          market: true,
          contractAssignments: {
            include: { contract: { include: { hotel: { select: { id: true, name: true } } } } },
          },
          hotelAssignments: { include: { hotel: true } },
          markupRules: true,
          tariffs: { include: { contract: { select: { id: true, code: true, name: true } } } },
        },
      });
      if (!record)
        throw new TRPCError({ code: "NOT_FOUND", message: "Travel agent not found" });
      return record;
    }),

  create: p("b2b-portal:travelAgent:create")
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        countryId: z.string().optional(),
        marketId: z.string().optional(),
        active: z.boolean().optional(),
        creditLimit: z.number().optional(),
        paymentTermDays: z.number().int().optional(),
        commissionPct: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const partner = await tx.partner.create({
          data: {
            companyId: ctx.companyId,
            type: "customer",
            isCompany: true,
            name: input.name,
            email: input.email ?? null,
            phone: input.phone ?? null,
            countryId: input.countryId ?? null,
          },
        });
        return tx.tourOperator.create({
          data: { ...input, companyId: ctx.companyId, partnerType: "travel_agent", partnerId: partner.id },
        });
      });
    }),

  update: p("b2b-portal:travelAgent:update")
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          code: z.string().min(1).optional(),
          contactPerson: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          countryId: z.string().optional(),
          marketId: z.string().optional(),
          active: z.boolean().optional(),
          creditLimit: z.number().optional(),
          paymentTermDays: z.number().int().optional(),
          commissionPct: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId, partnerType: "travel_agent" },
        select: { partnerId: true },
      });
      if (agent?.partnerId) {
        await ctx.db.partner.update({
          where: { id: agent.partnerId },
          data: {
            ...(input.data.name !== undefined && { name: input.data.name }),
            ...(input.data.email !== undefined && { email: input.data.email ?? null }),
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

  delete: p("b2b-portal:travelAgent:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.tourOperator.findFirst({
        where: { id: input.id, companyId: ctx.companyId, partnerType: "travel_agent" },
        select: { partnerId: true },
      });
      if (!agent)
        throw new TRPCError({ code: "NOT_FOUND", message: "Travel agent not found" });
      await ctx.db.tourOperator.delete({ where: { id: input.id } });
      if (agent.partnerId) {
        await ctx.db.partner.delete({ where: { id: agent.partnerId } });
      }
      return { success: true };
    }),
});
