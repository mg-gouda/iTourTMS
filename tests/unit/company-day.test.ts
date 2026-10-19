import { describe, expect, it } from "vitest";

import { companyToday } from "@/server/services/shared/company-day";

describe("companyToday", () => {
  const lateUtc = new Date("2026-10-19T22:30:00Z"); // 01:30 next day in Cairo (UTC+3)
  it("uses the company's zone", () => {
    expect(companyToday("Africa/Cairo", lateUtc).toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(companyToday("UTC", lateUtc).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });
  it("falls back to UTC for a bad zone", () => {
    expect(companyToday("Mars/Olympus", lateUtc).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });
});
