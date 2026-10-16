import { branchForDestination, branchForHotel } from "@/server/branch-scope";
import { db } from "@/server/db";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

/**
 * Sync traffic jobs for a booking based on its flight data.
 *
 * - Arrival flight present → create/update ARR job
 * - Departure flight present → create/update DEP job
 * - Flight cleared → cancel the corresponding job
 *
 * Hotel bookings are company-wide but transfers belong to the branch operating
 * at the hotel, so this runs on the unscoped client: a Cairo agent saving a
 * Luxor booking must find (not duplicate) the Luxor job.
 */
export async function syncTrafficJobsForBooking(
  companyId: string,
  bookingId: string,
  userId: string,
): Promise<void> {
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, companyId },
    select: {
      id: true,
      hotelId: true,
      hotel: { select: { destinationId: true } },
      checkIn: true,
      checkOut: true,
      adults: true,
      children: true,
      infants: true,
      leadGuestName: true,
      leadGuestPhone: true,
      arrivalFlightNo: true,
      arrivalTime: true,
      departFlightNo: true,
      departTime: true,
      status: true,
      splitStayId: true,
    },
  });

  const existingJobs = await db.ttTrafficJob.findMany({
    where: { bookingId, companyId },
    select: { id: true, serviceType: true, status: true },
  });

  // A cancelled or no-show guest needs no transfers — they used to stay on
  // the dispatch board.
  if (DEAD.includes(booking.status)) {
    await db.ttTrafficJob.updateMany({
      where: { id: { in: existingJobs.filter((j) => !FINAL.includes(j.status)).map((j) => j.id) } },
      data: { status: "CANCELLED" },
    });
    if (booking.splitStayId) await syncSplitStayTransfers(companyId, booking.splitStayId, userId);
    return;
  }

  const paxCount = booking.adults + booking.children + booking.infants;
  const branchId = await branchForDestination(db, companyId, booking.hotel?.destinationId);

  // ── Arrival ──
  const existingArr = existingJobs.find((j) => j.serviceType === "ARR");

  if (booking.arrivalFlightNo) {
    if (existingArr) {
      // Update existing ARR job (only if not cancelled/completed)
      if (!["CANCELLED", "COMPLETED"].includes(existingArr.status)) {
        await db.ttTrafficJob.update({
          where: { id: existingArr.id },
          data: {
            pickupTime: booking.arrivalTime,
            paxCount,
            leadPassenger: booking.leadGuestName,
            passengerPhone: booking.leadGuestPhone,
            serviceDate: booking.checkIn,
            dropoffHotelId: booking.hotelId,
          },
        });
      }
    } else {
      // Create new ARR job
      const code = await generateSequenceNumber(db, companyId, "traffic_job", branchId);
      await db.ttTrafficJob.create({
        data: {
          code,
          companyId,
          branchId,
          serviceType: "ARR",
          serviceDate: booking.checkIn,
          pickupTime: booking.arrivalTime,
          dropoffHotelId: booking.hotelId,
          leadPassenger: booking.leadGuestName,
          passengerPhone: booking.leadGuestPhone,
          paxCount,
          bookingId,
          createdById: userId,
        },
      });
    }
  } else if (existingArr && !["CANCELLED", "COMPLETED"].includes(existingArr.status)) {
    // Flight was cleared → cancel the ARR job
    await db.ttTrafficJob.update({
      where: { id: existingArr.id },
      data: { status: "CANCELLED" },
    });
  }

  // ── Departure ──
  const existingDep = existingJobs.find((j) => j.serviceType === "DEP");

  if (booking.departFlightNo) {
    if (existingDep) {
      if (!["CANCELLED", "COMPLETED"].includes(existingDep.status)) {
        await db.ttTrafficJob.update({
          where: { id: existingDep.id },
          data: {
            pickupTime: booking.departTime,
            paxCount,
            leadPassenger: booking.leadGuestName,
            passengerPhone: booking.leadGuestPhone,
            serviceDate: booking.checkOut,
            pickupHotelId: booking.hotelId,
          },
        });
      }
    } else {
      const code = await generateSequenceNumber(db, companyId, "traffic_job", branchId);
      await db.ttTrafficJob.create({
        data: {
          code,
          companyId,
          branchId,
          serviceType: "DEP",
          serviceDate: booking.checkOut,
          pickupTime: booking.departTime,
          pickupHotelId: booking.hotelId,
          leadPassenger: booking.leadGuestName,
          passengerPhone: booking.leadGuestPhone,
          paxCount,
          bookingId,
          createdById: userId,
        },
      });
    }
  } else if (existingDep && !["CANCELLED", "COMPLETED"].includes(existingDep.status)) {
    await db.ttTrafficJob.update({
      where: { id: existingDep.id },
      data: { status: "CANCELLED" },
    });
  }

  if (booking.splitStayId) await syncSplitStayTransfers(companyId, booking.splitStayId, userId);
}

const DEAD = ["CANCELLED", "NO_SHOW"];
const FINAL = ["CANCELLED", "COMPLETED"];

/**
 * A split stay moves the guest between hotels: one inter-hotel transfer per
 * change of hotel, on the day the next segment starts, from the previous
 * hotel to the next. Kept in step as segments are added, moved or cancelled.
 * The job belongs to the arriving segment's booking and to the branch at the
 * pickup hotel, whose drivers collect the guest.
 */
export async function syncSplitStayTransfers(companyId: string, splitStayId: string, userId: string) {
  const segments = await db.booking.findMany({
    where: { companyId, splitStayId, status: { notIn: DEAD as never } },
    orderBy: { checkIn: "asc" },
    select: {
      id: true,
      hotelId: true,
      checkIn: true,
      adults: true,
      children: true,
      infants: true,
      leadGuestName: true,
      leadGuestPhone: true,
    },
  });

  const wanted = new Map<string, { from: string; to: string; date: Date; pax: number; lead: string | null; phone: string | null }>();
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const cur = segments[i];
    if (prev.hotelId === cur.hotelId) continue; // room change in the same hotel: no ride
    wanted.set(cur.id, {
      from: prev.hotelId,
      to: cur.hotelId,
      date: cur.checkIn,
      pax: cur.adults + cur.children + cur.infants,
      lead: cur.leadGuestName,
      phone: cur.leadGuestPhone,
    });
  }

  const existing = await db.ttTrafficJob.findMany({
    where: { companyId, serviceType: "INTER_HOTEL", booking: { splitStayId } },
    select: { id: true, bookingId: true, status: true },
  });

  for (const job of existing) {
    if (FINAL.includes(job.status)) continue;
    const want = job.bookingId ? wanted.get(job.bookingId) : undefined;
    if (!want) {
      await db.ttTrafficJob.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
      continue;
    }
    await db.ttTrafficJob.update({
      where: { id: job.id },
      data: {
        serviceDate: want.date,
        pickupHotelId: want.from,
        dropoffHotelId: want.to,
        paxCount: want.pax,
        leadPassenger: want.lead,
        passengerPhone: want.phone,
      },
    });
    wanted.delete(job.bookingId!);
  }

  for (const [bookingId, want] of wanted) {
    const branchId = await branchForHotel(db, companyId, want.from);
    await db.ttTrafficJob.create({
      data: {
        code: await generateSequenceNumber(db, companyId, "traffic_job", branchId),
        companyId,
        branchId,
        serviceType: "INTER_HOTEL",
        serviceDate: want.date,
        pickupHotelId: want.from,
        dropoffHotelId: want.to,
        paxCount: want.pax,
        leadPassenger: want.lead,
        passengerPhone: want.phone,
        bookingId,
        createdById: userId,
      },
    });
  }
}
