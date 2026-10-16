import { z } from "zod";

import { leadCreateSchema, leadUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { activeBranch } from "@/server/branch-scope";
import { nextSerialCode } from "@/server/services/finance/sequence-generator";
import { routeLead, scoreInclude, withScore } from "@/server/services/crm/lead-routing";

const p = (code: string) => modulePermissionProcedure("crm", code);

export const leadRouter = createTRPCRouter({
  list: p("crm:lead:read").query(async ({ ctx }) => {
    const leads = await ctx.db.crmLead.findMany({
      where: { companyId: ctx.companyId },
      include: {
        branch: { select: { code: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        ...scoreInclude,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return leads.map(withScore);
  }),

  getById: p("crm:lead:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.crmLead.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          _count: scoreInclude._count,
          team: { select: { id: true, name: true } },
          country: { select: { id: true, name: true } },
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
      return withScore(lead);
    }),

  create: p("crm:lead:create")
    .input(leadCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const branchId = activeBranch(ctx.branch);
      const code = await nextSerialCode(ctx.db, ctx.companyId, "lead", { prefix: "LD" }, branchId);

      return ctx.db.crmLead.create({
        data: {
          ...input,
          branchId,
          email: input.email || null,
          phone: input.phone || null,
          countryId: input.countryId || null,
          ...(await routeLead(ctx.db, ctx.companyId, branchId, input)),
          notes: input.notes || null,
          code,
          companyId: ctx.companyId,
          createdById: ctx.user.id,
        },
      });
    }),

  update: p("crm:lead:update")
    .input(z.object({ id: z.string(), data: leadUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { email, phone, assignedToId, countryId, teamId, notes } = input.data;
      const lead = await ctx.db.crmLead.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        select: { branchId: true, countryId: true },
      });
      // Team left on "route by country": find it from the (new) country.
      const routed =
        teamId === ""
          ? await routeLead(ctx.db, ctx.companyId, lead.branchId, {
              countryId: countryId === undefined ? lead.countryId : countryId,
              assignedToId,
            })
          : null;
      return ctx.db.crmLead.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: {
          ...input.data,
          ...(email !== undefined && { email: email || null }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
          ...(countryId !== undefined && { countryId: countryId || null }),
          ...(teamId !== undefined && { teamId: teamId || null }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(routed && { teamId: routed.teamId, assignedToId: assignedToId || routed.assignedToId }),
        },
      });
    }),

  delete: p("crm:lead:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmLead.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  convertToCustomer: p("crm:lead:update")
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

  dashboard: p("crm:lead:read").query(async ({ ctx }) => {
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
