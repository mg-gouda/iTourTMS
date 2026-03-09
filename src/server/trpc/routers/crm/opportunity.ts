import { z } from "zod";

import { opportunityCreateSchema, opportunityUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const opportunityRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.crmOpportunity.findMany({
      where: { companyId: ctx.companyId },
      include: {
        owner: { select: { id: true, name: true } },
        lead: { select: { id: true, firstName: true, lastName: true, code: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmOpportunity.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          owner: { select: { id: true, name: true } },
          lead: { select: { id: true, firstName: true, lastName: true, code: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          bookings: {
            orderBy: { travelDate: "desc" },
            select: {
              id: true,
              code: true,
              status: true,
              travelDate: true,
              totalSelling: true,
              currency: true,
              _count: { select: { items: true } },
            },
          },
        },
      });
    }),

  create: proc
    .input(opportunityCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmOpportunity.create({
        data: {
          title: input.title,
          stage: input.stage,
          value: input.value ?? null,
          probability: input.probability ?? null,
          expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
          ownerId: input.ownerId || null,
          leadId: input.leadId || null,
          customerId: input.customerId || null,
          notes: input.notes || null,
          companyId: ctx.companyId,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: opportunityUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.expectedCloseDate !== undefined) {
        data.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate as string) : null;
      }
      if (data.ownerId !== undefined) data.ownerId = data.ownerId || null;
      if (data.leadId !== undefined) data.leadId = data.leadId || null;
      if (data.customerId !== undefined) data.customerId = data.customerId || null;
      if (data.notes !== undefined) data.notes = data.notes || null;
      if (data.value !== undefined) data.value = data.value ?? null;
      if (data.probability !== undefined) data.probability = data.probability ?? null;

      // Auto-set closedAt
      if (data.stage === "CLOSED_WON" || data.stage === "CLOSED_LOST") {
        data.closedAt = new Date();
      }

      return ctx.db.crmOpportunity.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmOpportunity.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
