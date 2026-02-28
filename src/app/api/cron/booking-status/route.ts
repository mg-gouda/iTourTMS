import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { logBookingAction } from "@/server/services/reservations/timeline-logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();

  // ── Auto Check-In: CONFIRMED → CHECKED_IN ──
  const toCheckIn = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      isLocked: false,
      checkIn: { lte: today },
    },
    select: { id: true, code: true },
  });

  if (toCheckIn.length > 0) {
    await db.booking.updateMany({
      where: { id: { in: toCheckIn.map((b) => b.id) } },
      data: { status: "CHECKED_IN", checkedInAt: now },
    });

    for (const b of toCheckIn) {
      await logBookingAction(db, b.id, "CHECKED_IN", "Auto check-in by system", null);
    }
  }

  // ── Auto Check-Out: CHECKED_IN → CHECKED_OUT ──
  const toCheckOut = await db.booking.findMany({
    where: {
      status: "CHECKED_IN",
      isLocked: false,
      checkOut: { lte: today },
    },
    select: { id: true, code: true },
  });

  if (toCheckOut.length > 0) {
    await db.booking.updateMany({
      where: { id: { in: toCheckOut.map((b) => b.id) } },
      data: { status: "CHECKED_OUT", checkedOutAt: now },
    });

    for (const b of toCheckOut) {
      await logBookingAction(db, b.id, "CHECKED_OUT", "Auto check-out by system", null);
    }
  }

  return NextResponse.json({
    checkedIn: toCheckIn.length,
    checkedOut: toCheckOut.length,
  });
}
