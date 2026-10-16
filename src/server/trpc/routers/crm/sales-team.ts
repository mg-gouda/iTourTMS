import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { activeBranch } from "@/server/branch-scope";
import { OPEN_LEAD } from "@/server/services/crm/lead-routing";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

// ponytail: teams ride on the lead permissions; split out if roles need it.
const read = modulePermissionProcedure("crm", "crm:lead:read");
const write = modulePermissionProcedure("crm", "crm:lead:update");

const teamInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  leaderId: z.string().nullish(),
  memberIds: z.array(z.string()).default([]),
  marketIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const salesTeamRouter = createTRPCRouter({
  list: read.query(async ({ ctx }) => {
    const [teams, open, won] = await Promise.all([
      ctx.db.crmSalesTeam.findMany({
        where: { companyId: ctx.companyId },
        include: {
          branch: { select: { code: true, name: true } },
          leader: { select: { id: true, name: true } },
          members: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: "asc" },
      }),
      ctx.db.crmLead.groupBy({
        by: ["teamId"],
        where: { companyId: ctx.companyId, teamId: { not: null }, status: { in: [...OPEN_LEAD] } },
        _count: true,
      }),
      ctx.db.crmLead.groupBy({
        by: ["teamId"],
        where: { companyId: ctx.companyId, teamId: { not: null }, status: "WON" },
        _count: true,
      }),
    ]);
    const n = (rows: { teamId: string | null; _count: number }[], id: string) =>
      rows.find((r) => r.teamId === id)?._count ?? 0;
    return teams.map((t) => ({ ...t, openLeads: n(open, t.id), wonLeads: n(won, t.id) }));
  }),

  /** Pickers: markets (territories) and countries, without needing Contracting access. */
  options: read.query(async ({ ctx }) => {
    const [markets, countries] = await Promise.all([
      ctx.db.market.findMany({
        where: { companyId: ctx.companyId, active: true },
        select: { id: true, name: true, code: true, countryIds: true },
        orderBy: { name: "asc" },
      }),
      ctx.db.country.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { markets, countries };
  }),

  save: write.input(teamInput).mutation(async ({ ctx, input }) => {
    const { id, memberIds, ...data } = input;
    const fields = { ...data, leaderId: data.leaderId || null };
    // Only this company's staff may join (ids come from the client).
    const people = [...new Set([...memberIds, ...(fields.leaderId ? [fields.leaderId] : [])])];
    const ok = await ctx.db.user.count({ where: { id: { in: people }, companyId: ctx.companyId, tourOperatorId: null } });
    if (ok !== people.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown team member." });
    const members = memberIds.map((m) => ({ id: m }));
    if (id) {
      return ctx.db.crmSalesTeam.update({
        where: { id, companyId: ctx.companyId },
        data: { ...fields, members: { set: members } },
      });
    }
    return ctx.db.crmSalesTeam.create({
      data: {
        ...fields,
        companyId: ctx.companyId,
        branchId: activeBranch(ctx.branch),
        members: { connect: members },
      },
    });
  }),

  delete: write.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // Leads keep their assignee; the team link is cleared by the FK (SetNull).
    return ctx.db.crmSalesTeam.delete({ where: { id: input.id, companyId: ctx.companyId } });
  }),
});
