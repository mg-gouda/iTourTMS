import type { PrismaClient } from "@prisma/client";

import { scoreLead } from "./lead-score";

type Db = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">;

export const OPEN_LEAD = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] as const;
const CLOSED_OPP = ["CLOSED_WON", "CLOSED_LOST"] as const;

/**
 * Who gets a lead: the team whose territory (markets) covers the guest's
 * country, unless one was picked; then the team member carrying the fewest
 * open leads, unless someone was picked.
 */
export async function routeLead(
  db: Db,
  companyId: string,
  branchId: string,
  lead: { countryId?: string | null; teamId?: string | null; assignedToId?: string | null },
): Promise<{ teamId: string | null; assignedToId: string | null }> {
  let teamId = lead.teamId || null;
  if (!teamId && lead.countryId) {
    const markets = await db.market.findMany({
      where: { companyId, active: true, countryIds: { has: lead.countryId } },
      select: { id: true },
    });
    if (markets.length) {
      const team = await db.crmSalesTeam.findFirst({
        where: { companyId, branchId, active: true, marketIds: { hasSome: markets.map((m) => m.id) } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      teamId = team?.id ?? null;
    }
  }

  let assignedToId = lead.assignedToId || null;
  if (!assignedToId && teamId) {
    const team = await db.crmSalesTeam.findUnique({
      where: { id: teamId },
      select: { leaderId: true, members: { where: { isActive: true }, select: { id: true } } },
    });
    const people = team?.members.map((m) => m.id) ?? [];
    if (people.length) {
      const load = await db.crmLead.groupBy({
        by: ["assignedToId"],
        where: { companyId, assignedToId: { in: people }, status: { in: [...OPEN_LEAD] } },
        _count: true,
      });
      const count = new Map(load.map((l) => [l.assignedToId, l._count]));
      assignedToId = people.reduce((a, b) => ((count.get(b) ?? 0) < (count.get(a) ?? 0) ? b : a));
    } else {
      assignedToId = team?.leaderId ?? null;
    }
  }
  return { teamId, assignedToId };
}

/** Prisma include that carries what {@link withScore} needs. */
export const scoreInclude = {
  _count: {
    select: {
      activities: true,
      opportunities: { where: { stage: { notIn: [...CLOSED_OPP] } } },
    },
  },
  activities: { select: { createdAt: true }, orderBy: { createdAt: "desc" as const }, take: 1 },
};

export function withScore<
  L extends {
    source: string;
    status: string;
    email: string | null;
    phone: string | null;
    updatedAt: Date;
    activities: { createdAt: Date }[];
    _count: { activities: number; opportunities: number };
  },
>(lead: L) {
  const last = lead.activities[0]?.createdAt;
  const { score, band, reasons } = scoreLead({
    ...lead,
    activityCount: lead._count.activities,
    openOpportunities: lead._count.opportunities,
    lastTouchAt: last && last > lead.updatedAt ? last : lead.updatedAt,
  });
  return { ...lead, score, band, scoreReasons: reasons };
}
