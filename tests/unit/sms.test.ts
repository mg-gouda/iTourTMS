import { describe, expect, it } from "vitest";

import { driverMessage, guestMessage, normalizePhone } from "@/server/services/shared/sms";

describe("normalizePhone", () => {
  it("turns local Egyptian mobiles into +20", () => {
    expect(normalizePhone("010 1234 5678", "20")).toBe("+201012345678");
    expect(normalizePhone("0020-101-234-5678", "20")).toBe("+201012345678");
    expect(normalizePhone("+44 7700 900123", "20")).toBe("+447700900123");
  });
  it("rejects junk and unknown local numbers", () => {
    expect(normalizePhone("n/a", "20")).toBeNull();
    expect(normalizePhone("0101234", "")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("transfer messages", () => {
  const job = {
    code: "FT-00012",
    serviceDate: new Date("2026-10-21T00:00:00Z"),
    pickupTime: "14:30",
    paxCount: 3,
    leadPassenger: "Mr Smith",
    passengerPhone: "+447700900123",
    from: "HRG Airport",
    to: "Steigenberger",
    driver: { name: "Ahmed", phone: "+201012345678" },
    vehicle: "ABC 123",
  };
  it("gives the driver code, time, route and guest", () => {
    expect(driverMessage(job)).toBe("FT-00012 2026-10-21 14:30\nHRG Airport > Steigenberger\n3 pax, Mr Smith +447700900123");
  });
  it("gives the guest time, route, driver and vehicle", () => {
    expect(guestMessage(job, "iTour")).toBe(
      "iTour: your transfer 2026-10-21 at 14:30 from HRG Airport to Steigenberger. Driver: Ahmed +201012345678. Vehicle ABC 123. Ref FT-00012.",
    );
  });
});
