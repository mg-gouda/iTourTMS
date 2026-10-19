import { describe, expect, it } from "vitest";

import { forecastFinal, pickupCurve, roomsByDate } from "@/server/services/analytics/forecast";

describe("pickupCurve", () => {
  it("gives the share booked at least L days ahead", () => {
    // half the room-nights booked 60 days out, half 10 days out
    const c = pickupCurve([{ leadDays: 60, roomNights: 5 }, { leadDays: 10, roomNights: 5 }], 90);
    expect(c[0]).toBe(1);
    expect(c[10]).toBe(1);
    expect(c[11]).toBe(0.5);
    expect(c[60]).toBe(0.5);
    expect(c[61]).toBe(0);
  });

  it("is empty without history", () => {
    expect(pickupCurve([])).toEqual([]);
  });
});

describe("forecastFinal", () => {
  const c = pickupCurve([{ leadDays: 60, roomNights: 5 }, { leadDays: 10, roomNights: 5 }], 90);
  it("scales today's books by the expected pickup", () => {
    expect(forecastFinal(20, 30, c)).toBe(40);
  });
  it("trusts the books when the curve is too thin or the date has arrived", () => {
    expect(forecastFinal(20, 80, c)).toBe(20);
    expect(forecastFinal(20, 0, c)).toBe(20);
    expect(forecastFinal(20, 30, [])).toBe(20);
  });
});

describe("roomsByDate", () => {
  it("counts each night of the stay inside the window", () => {
    const from = new Date("2026-11-01");
    const r = roomsByDate(
      [
        { checkIn: new Date("2026-10-30"), checkOut: new Date("2026-11-03"), rooms: 2 },
        { checkIn: new Date("2026-11-02"), checkOut: new Date("2026-11-04"), rooms: 1 },
      ],
      from,
      4,
    );
    expect(r).toEqual([2, 3, 1, 0]);
  });
});
