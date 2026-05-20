import { z } from "zod";

import { activityCreateSchema, activityUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("crm", code);

export const activityRouter = createTRPCRouter({
  list: p("crm:activity:read")
    .input(
      z.object({
        leadId: z.string().optional(),
        opportunityId: z.string().optional(),
        customerId: z.string().optional(),
        bookingId: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.crmActivity.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.leadId ? { leadId: input.leadId } : {}),
          ...(input?.opportunityId ? { opportunityId: input.opportunityId } : {}),
          ...(input?.customerId ? { customerId: input.customerId } : {}),
          ...(input?.bookingId ? { bookingId: input.bookingId } : {}),
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          lead: { select: { id: true, firstName: true, lastName: true, code: true } },
          opportunity: { select: { id: true, title: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: p("crm:activity:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmActivity.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          assignedTo: { select: { id: true, name: true } },
          lead: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, title: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }),

  create: p("crm:activity:create")
    .input(activityCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmActivity.create({
        data: {
          type: input.type,
          subject: input.subject,
          description: input.description || null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          assignedToId: input.assignedToId || null,
          leadId: input.leadId || null,
          opportunityId: input.opportunityId || null,
          customerId: input.customerId || null,
          bookingId: input.bookingId || null,
          companyId: ctx.companyId,
        },
      });
    }),

  update: p("crm:activity:update")
    .input(z.object({ id: z.string(), data: activityUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.dueDate !== undefined) data.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
      if (data.completedAt !== undefined) data.completedAt = data.completedAt ? new Date(data.completedAt as string) : null;
      if (data.assignedToId !== undefined) data.assignedToId = data.assignedToId || null;
      if (data.leadId !== undefined) data.leadId = data.leadId || null;
      if (data.opportunityId !== undefined) data.opportunityId = data.opportunityId || null;
      if (data.customerId !== undefined) data.customerId = data.customerId || null;
      if (data.description !== undefined) data.description = data.description || null;

      return ctx.db.crmActivity.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  delete: p("crm:activity:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmActivity.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
