import { branchForDestination } from "@/server/branch-scope";
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
    },
  });

  const existingJobs = await db.ttTrafficJob.findMany({
    where: { bookingId, companyId },
    select: { id: true, serviceType: true, status: true },
  });

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
}
