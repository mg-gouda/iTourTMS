/**
 * Rule-based lead score, 0–100: how likely this lead is to book, from what we
 * know about it. Computed on read, so it never goes stale.
 * // ponytail: fixed weights; make them a company setting if sales asks.
 */
export interface LeadScoreInput {
  source: string;
  status: string;
  email: string | null;
  phone: string | null;
  activityCount: number;
  lastTouchAt: Date;
  openOpportunities: number;
}

export type LeadBand = "hot" | "warm" | "cold";

const SOURCE: Record<string, number> = {
  REFERRAL: 20,
  PARTNER: 20,
  WALK_IN: 15,
  PHONE: 15,
  EMAIL: 10,
  EVENT: 10,
  WEBSITE: 8,
  SOCIAL_MEDIA: 5,
};

const STAGE: Record<string, number> = {
  CONTACTED: 10,
  QUALIFIED: 20,
  PROPOSAL: 25,
  NEGOTIATION: 30,
};

const DAY = 86_400_000;

export function scoreLead(l: LeadScoreInput, now = new Date()): { score: number; band: LeadBand; reasons: string[] } {
  if (l.status === "WON") return { score: 100, band: "hot", reasons: ["Won"] };
  if (l.status === "LOST" || l.status === "DORMANT") return { score: 0, band: "cold", reasons: [l.status === "LOST" ? "Lost" : "Dormant"] };

  const parts: [number, string][] = [];
  if (l.email) parts.push([10, "Has email"]);
  if (l.phone) parts.push([10, "Has phone"]);
  if (SOURCE[l.source]) parts.push([SOURCE[l.source], `Source: ${l.source.toLowerCase().replace("_", " ")}`]);
  if (STAGE[l.status]) parts.push([STAGE[l.status], `Stage: ${l.status.toLowerCase()}`]);
  if (l.activityCount) parts.push([Math.min(l.activityCount * 5, 15), `${l.activityCount} activit${l.activityCount === 1 ? "y" : "ies"}`]);
  if (l.openOpportunities) parts.push([5, "Open opportunity"]);

  const idle = (now.getTime() - l.lastTouchAt.getTime()) / DAY;
  if (idle <= 7) parts.push([10, "Touched this week"]);
  else if (idle <= 30) parts.push([5, "Touched this month"]);
  else if (idle > 90) parts.push([-10, "Idle 90+ days"]);

  const score = Math.max(0, Math.min(100, parts.reduce((s, [n]) => s + n, 0)));
  return {
    score,
    band: score >= 70 ? "hot" : score >= 40 ? "warm" : "cold",
    reasons: parts.map(([n, r]) => `${n > 0 ? "+" : ""}${n} ${r}`),
  };
}
