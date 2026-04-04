import { z } from "zod";

import { leadCreateSchema, leadUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const leadRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.crmLead.findMany({
      where: { companyId: ctx.companyId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmLead.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { assignedTo: { select: { id: true, name: true } } },
          },
          opportunities: {
            orderBy: { createdAt: "desc" },
            include: { owner: { select: { id: true, name: true } } },
          },
        },
      });
    }),

  create: proc
    .input(leadCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Auto-generate lead code using Sequence
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "lead" } },
        create: {
          companyId: ctx.companyId,
          code: "lead",
          prefix: "LD",
          padding: 5,
          nextNumber: 2,
        },
        update: { nextNumber: { increment: 1 } },
      });

      const num = seq.nextNumber - 1; // after increment
      const code = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

      return ctx.db.crmLead.create({
        data: {
          ...input,
          email: input.email || null,
          phone: input.phone || null,
          assignedToId: input.assignedToId || null,
          notes: input.notes || null,
          code,
          companyId: ctx.companyId,
          createdById: ctx.user.id,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: leadUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmLead.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: {
          ...input.data,
          email: input.data.email || null,
          phone: input.data.phone || null,
          assignedToId: input.data.assignedToId || null,
          notes: input.data.notes || null,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmLead.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  convertToCustomer: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.crmLead.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      // Create customer from lead data
      const customer = await ctx.db.crmCustomer.create({
        data: {
          companyId: ctx.companyId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          notes: lead.notes,
        },
      });

      // Link existing activities to the new customer
      await ctx.db.crmActivity.updateMany({
        where: { leadId: lead.id, companyId: ctx.companyId },
        data: { customerId: customer.id },
      });

      // Link existing opportunities to the new customer
      await ctx.db.crmOpportunity.updateMany({
        where: { leadId: lead.id, companyId: ctx.companyId },
        data: { customerId: customer.id },
      });

      // Mark lead as WON
      await ctx.db.crmLead.update({
        where: { id: lead.id },
        data: { status: "WON" },
      });

      return customer;
    }),

  dashboard: proc.query(async ({ ctx }) => {
    const [totalLeads, newLeads, qualifiedLeads, wonLeads] = await Promise.all([
      ctx.db.crmLead.count({ where: { companyId: ctx.companyId } }),
      ctx.db.crmLead.count({ where: { companyId: ctx.companyId, status: "NEW" } }),
      ctx.db.crmLead.count({ where: { companyId: ctx.companyId, status: "QUALIFIED" } }),
      ctx.db.crmLead.count({ where: { companyId: ctx.companyId, status: "WON" } }),
    ]);

    const recentLeads = await ctx.db.crmLead.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    const pipelineValue = await ctx.db.crmOpportunity.aggregate({
      where: {
        companyId: ctx.companyId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      _sum: { value: true },
    });

    const stageBreakdown = await ctx.db.crmOpportunity.groupBy({
      by: ["stage"],
      where: { companyId: ctx.companyId },
      _count: true,
      _sum: { value: true },
    });

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      wonLeads,
      recentLeads,
      pipelineValue: pipelineValue._sum.value ?? 0,
      stageBreakdown,
    };
  }),
});
