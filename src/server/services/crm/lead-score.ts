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

/** One line of "why": points, a reason code the UI translates, and its argument. */
export type ScoreReason = [points: number, code: string, arg?: string | number];

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

export function scoreLead(
  l: LeadScoreInput,
  now = new Date(),
): { score: number; band: LeadBand; reasons: ScoreReason[] } {
  if (l.status === "WON") return { score: 100, band: "hot", reasons: [[100, "won"]] };
  if (l.status === "LOST" || l.status === "DORMANT") {
    return { score: 0, band: "cold", reasons: [[0, l.status === "LOST" ? "lost" : "dormant"]] };
  }

  const parts: ScoreReason[] = [];
  if (l.email) parts.push([10, "hasEmail"]);
  if (l.phone) parts.push([10, "hasPhone"]);
  if (SOURCE[l.source]) parts.push([SOURCE[l.source], "source", l.source]);
  if (STAGE[l.status]) parts.push([STAGE[l.status], "stage", l.status]);
  if (l.activityCount) parts.push([Math.min(l.activityCount * 5, 15), "activities", l.activityCount]);
  if (l.openOpportunities) parts.push([5, "openOpportunity"]);

  const idle = (now.getTime() - l.lastTouchAt.getTime()) / DAY;
  if (idle <= 7) parts.push([10, "touchedWeek"]);
  else if (idle <= 30) parts.push([5, "touchedMonth"]);
  else if (idle > 90) parts.push([-10, "idle90"]);

  const score = Math.max(0, Math.min(100, parts.reduce((s, [n]) => s + n, 0)));
  return {
    score,
    band: score >= 70 ? "hot" : score >= 40 ? "warm" : "cold",
    reasons: parts,
  };
}
