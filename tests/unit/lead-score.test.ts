import { describe, expect, it } from "vitest";

import { scoreLead } from "@/server/services/crm/lead-score";

const now = new Date("2026-10-16T12:00:00Z");
const base = {
  source: "WEBSITE",
  status: "NEW",
  email: null,
  phone: null,
  activityCount: 0,
  lastTouchAt: now,
  openOpportunities: 0,
};

describe("scoreLead", () => {
  it("scores a bare new web lead cold", () => {
    const r = scoreLead(base, now);
    expect(r.score).toBe(18); // website 8 + touched this week 10
    expect(r.band).toBe("cold");
  });

  it("scores an engaged referral in negotiation hot, capped at 100", () => {
    const r = scoreLead(
      { ...base, source: "REFERRAL", status: "NEGOTIATION", email: "a@b.c", phone: "1", activityCount: 9, openOpportunities: 1 },
      now,
    );
    expect(r.score).toBe(100);
    expect(r.band).toBe("hot");
  });

  it("penalises long idle leads and never goes below zero", () => {
    const r = scoreLead({ ...base, source: "OTHER", lastTouchAt: new Date("2026-01-01") }, now);
    expect(r.score).toBe(0);
  });

  it("fixes closed leads", () => {
    expect(scoreLead({ ...base, status: "WON" }, now).score).toBe(100);
    expect(scoreLead({ ...base, status: "LOST", email: "x@y.z" }, now).score).toBe(0);
  });
});
