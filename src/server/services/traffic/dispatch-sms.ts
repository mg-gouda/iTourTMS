import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { driverMessage, guestMessage, normalizePhone, sendSms, smsConfigured, type JobForSms } from "@/server/services/shared/sms";

/**
 * When a day's dispatch is locked: each assigned driver gets their job, each
 * guest with a phone gets their pickup details. A job is messaged once;
 * changing its assignment clears smsSentAt so the next lock re-sends.
 * Runs on the global db in the background — ids come from a scoped query.
 */
export async function sendDispatchSms(jobIds: string[]) {
  // Not configured → leave jobs unmarked, so they go out once SMS is set up.
  if (!jobIds.length || !smsConfigured()) return { drivers: 0, guests: 0, failed: 0 };
  const jobs = await db.ttTrafficJob.findMany({
    where: { id: { in: jobIds }, smsSentAt: null, status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] } },
    select: {
      id: true,
      code: true,
      serviceDate: true,
      pickupTime: true,
      paxCount: true,
      leadPassenger: true,
      passengerPhone: true,
      pickupAddress: true,
      dropoffAddress: true,
      company: { select: { name: true } },
      pickupAirport: { select: { name: true } },
      pickupHotel: { select: { name: true } },
      dropoffAirport: { select: { name: true } },
      dropoffHotel: { select: { name: true } },
      assignments: {
        orderBy: { assignedAt: "desc" },
        take: 1,
        select: {
          vehicle: { select: { plateNumber: true } },
          driver: { select: { phone: true, user: { select: { name: true } } } },
        },
      },
    },
  });

  const count = { drivers: 0, guests: 0, failed: 0 };
  for (const j of jobs) {
    const a = j.assignments[0];
    const job: JobForSms = {
      ...j,
      from: j.pickupHotel?.name ?? j.pickupAirport?.name ?? j.pickupAddress ?? "—",
      to: j.dropoffHotel?.name ?? j.dropoffAirport?.name ?? j.dropoffAddress ?? "—",
      driver: a?.driver ? { name: a.driver.user.name, phone: normalizePhone(a.driver.phone) ?? a.driver.phone } : null,
      vehicle: a?.vehicle?.plateNumber ?? null,
    };
    const driverTo = normalizePhone(a?.driver?.phone);
    const guestTo = normalizePhone(j.passengerPhone);
    if (driverTo) {
      const r = await sendSms(driverTo, driverMessage(job));
      r.ok ? count.drivers++ : (count.failed++, logger.warn({ job: j.code, error: r.error }, "driver sms failed"));
    }
    if (guestTo) {
      const r = await sendSms(guestTo, guestMessage(job, j.company.name));
      r.ok ? count.guests++ : (count.failed++, logger.warn({ job: j.code, error: r.error }, "guest sms failed"));
    }
    await db.ttTrafficJob.update({ where: { id: j.id }, data: { smsSentAt: new Date() } });
  }
  logger.info(count, "dispatch sms sent");
  return count;
}
