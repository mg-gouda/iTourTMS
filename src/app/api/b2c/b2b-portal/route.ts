import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";

/**
 * B2B Partner Portal API — serves data for partner-facing self-service pages.
 * Requires authenticated session with a tourOperatorId.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tourOperatorId = (session.user as Record<string, unknown>).tourOperatorId as string | null;
    const companyId = (session.user as Record<string, unknown>).companyId as string;

    if (!tourOperatorId || !companyId) {
      return NextResponse.json({ error: "Not a partner user" }, { status: 403 });
    }

    const action = request.nextUrl.searchParams.get("action");

    switch (action) {
      case "dashboard": {
        const [recentBookings, totalBookings, confirmedBookings, pendingBookings] =
          await Promise.all([
            db.booking.findMany({
              where: { companyId, tourOperatorId, source: "TOUR_OPERATOR" },
              include: {
                hotel: { select: { name: true } },
                currency: { select: { code: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            }),
            db.booking.count({
              where: { companyId, tourOperatorId, source: "TOUR_OPERATOR" },
            }),
            db.booking.count({
              where: {
                companyId,
                tourOperatorId,
                source: "TOUR_OPERATOR",
                status: "CONFIRMED" as const,
              },
            }),
            db.booking.count({
              where: {
                companyId,
                tourOperatorId,
                source: "TOUR_OPERATOR" as const,
                status: "PENDING_APPROVAL" as const,
              },
            }),
          ]);

        return NextResponse.json({
          recentBookings,
          stats: { totalBookings, confirmedBookings, pendingBookings },
        });
      }

      case "reservations": {
        const sp = request.nextUrl.searchParams;
        const status = sp.get("status") || undefined;
        const search = sp.get("search") || undefined;

        const where: Record<string, unknown> = {
          companyId,
          tourOperatorId,
          source: "TOUR_OPERATOR",
        };
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { code: { contains: search, mode: "insensitive" } },
            { leadGuestName: { contains: search, mode: "insensitive" } },
          ];
        }

        const items = await db.booking.findMany({
          where: where as Record<string, unknown>,
          include: {
            hotel: { select: { name: true } },
            currency: { select: { code: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        return NextResponse.json({ items });
      }

      case "reservation-detail": {
        const id = request.nextUrl.searchParams.get("id");
        if (!id) {
          return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        const booking = await db.booking.findFirst({
          where: { id, companyId, tourOperatorId },
          include: {
            hotel: { select: { name: true, code: true } },
            currency: true,
            contract: { select: { code: true, name: true } },
            rooms: {
              include: {
                roomType: { select: { name: true } },
                mealBasis: { select: { name: true } },
                guests: { include: { guest: true } },
              },
            },
            vouchers: { select: { id: true, code: true, status: true, createdAt: true } },
          },
        });

        if (!booking) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(booking);
      }

      case "account": {
        const partner = await db.tourOperator.findFirst({
          where: { id: tourOperatorId, companyId },
          select: {
            name: true,
            code: true,
            email: true,
            phone: true,
            contactPerson: true,
            creditLimit: true,
            creditUsed: true,
          },
        });

        if (!partner) {
          return NextResponse.json({ partner: null, recentTransactions: [] });
        }

        const creditLimit = Number(partner.creditLimit);
        const creditUsed = Number(partner.creditUsed);

        const recentTransactions = await db.b2bCreditTransaction.findMany({
          where: { companyId, tourOperatorId },
          include: {
            booking: { select: { code: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });

        return NextResponse.json({
          partner: {
            ...partner,
            creditLimit,
            creditUsed,
            available: creditLimit - creditUsed,
          },
          recentTransactions,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST handler — allows partners to perform write operations.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tourOperatorId = (session.user as Record<string, unknown>).tourOperatorId as string | null;
    const companyId = (session.user as Record<string, unknown>).companyId as string;

    if (!tourOperatorId || !companyId) {
      return NextResponse.json({ error: "Not a partner user" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action as string;

    switch (action) {
      case "update-profile": {
        await db.tourOperator.update({
          where: { id: tourOperatorId, companyId },
          data: {
            contactPerson: body.contactPerson ?? undefined,
            phone: body.phone ?? undefined,
            email: body.email ?? undefined,
          },
        });
        return NextResponse.json({ success: true });
      }

      case "cancel-booking": {
        const bookingId = body.bookingId as string;
        if (!bookingId) {
          return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }
        const booking = await db.booking.findFirst({
          where: { id: bookingId, companyId, tourOperatorId },
        });
        if (!booking) {
          return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
          return NextResponse.json({ error: "Booking cannot be cancelled" }, { status: 400 });
        }
        await db.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED" },
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
