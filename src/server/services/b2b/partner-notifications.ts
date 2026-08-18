import { db } from "@/server/db";
import { buildPartnerBookingPdf } from "@/server/services/b2b/partner-documents";
import { sendEmail } from "@/server/services/shared/email";

/**
 * Telling partners what happened to their bookings.
 *
 * Partners do not sit watching the portal, so these go out by email. The
 * matrix in the plan decides who hears about what; this decides how it reads.
 *
 * Nothing here may throw into a caller: a booking that succeeded must not be
 * reported as failed because a mail server was down.
 */

/** Above this share of the credit limit the partner gets a warning. */
export const CREDIT_WARNING_THRESHOLD = 0.85;

const money = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const day = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Who to write to. Booking news goes to the people who sell; money news goes
 * to the people who pay. Admins get both, because somebody has to.
 */
async function recipients(
  tourOperatorId: string,
  audience: "booking" | "money",
): Promise<string[]> {
  const roles =
    audience === "money"
      ? (["PARTNER_ADMIN", "PARTNER_ACCOUNTANT"] as const)
      : (["PARTNER_ADMIN", "PARTNER_AGENT"] as const);

  const users = await db.user.findMany({
    where: { tourOperatorId, isActive: true, partnerRole: { in: [...roles] } },
    select: { email: true },
  });
  return users.map((u) => u.email).filter(Boolean);
}

function shell(title: string, lines: string[], footer?: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1e1e1e;max-width:560px">
      <h2 style="font-size:17px;margin:0 0 14px">${title}</h2>
      ${lines.map((l) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.5">${l}</p>`).join("")}
      ${footer ? `<p style="margin:18px 0 0;font-size:12px;color:#888">${footer}</p>` : ""}
    </div>`;
}

async function send(
  tourOperatorId: string,
  audience: "booking" | "money",
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer; contentType?: string }[],
): Promise<void> {
  try {
    const to = await recipients(tourOperatorId, audience);
    await Promise.all(to.map((address) => sendEmail({ to: address, subject, html, attachments })));
  } catch {
    // Notification is a courtesy, never a gate on the work it describes.
  }
}

interface BookingBrief {
  code: string;
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  total: number;
  currencyCode: string;
  leadGuest: string;
  onRequestDeadline?: Date | null;
}

/** Confirmed and reserved with the hotel — the voucher rides along. */
export async function notifyPartnerBookingConfirmed(
  tourOperatorId: string,
  booking: BookingBrief,
  voucher?: Buffer,
): Promise<void> {
  await send(
    tourOperatorId,
    "booking",
    `Confirmed — ${booking.code}, ${booking.hotelName}`,
    shell(`Booking ${booking.code} is confirmed`, [
      `<strong>${booking.hotelName}</strong>, ${day(booking.checkIn)} – ${day(booking.checkOut)} (${booking.nights} nights)`,
      `Lead guest: ${booking.leadGuest}`,
      `Total: ${money(booking.total, booking.currencyCode)}`,
      voucher ? "The voucher is attached." : "",
    ].filter(Boolean)),
    voucher
      ? [{ filename: `${booking.code}-voucher.pdf`, content: voucher, contentType: "application/pdf" }]
      : undefined,
  );
}

/** The hotel has to answer first, and nothing is held meanwhile. */
export async function notifyPartnerBookingOnRequest(
  tourOperatorId: string,
  booking: BookingBrief,
): Promise<void> {
  await send(
    tourOperatorId,
    "booking",
    `On request — ${booking.code}, ${booking.hotelName}`,
    shell(`Booking ${booking.code} is on request`, [
      `<strong>${booking.hotelName}</strong>, ${day(booking.checkIn)} – ${day(booking.checkOut)}`,
      "The hotel has no rooms left on allotment, so we have asked them directly.",
      booking.onRequestDeadline
        ? `We will come back to you by <strong>${day(booking.onRequestDeadline)}</strong>.`
        : "We will come back to you shortly.",
      "Nothing is held and no credit is used until it is confirmed.",
    ]),
  );
}

/** The answer to an on-request: yes, with a voucher, or no. */
export async function notifyPartnerOnRequestResolved(
  tourOperatorId: string,
  booking: BookingBrief,
  outcome: "confirmed" | "regretted",
  voucher?: Buffer,
): Promise<void> {
  if (outcome === "confirmed") {
    await notifyPartnerBookingConfirmed(tourOperatorId, booking, voucher);
    return;
  }

  await send(
    tourOperatorId,
    "booking",
    `Not available — ${booking.code}, ${booking.hotelName}`,
    shell(`We could not confirm ${booking.code}`, [
      `The hotel cannot take <strong>${booking.hotelName}</strong> for ${day(booking.checkIn)} – ${day(booking.checkOut)}.`,
      "No credit has been used and nothing is owed. Search again for what is available.",
    ]),
  );
}

/** Over the limit: the booking is with us, not with the hotel, until it is approved. */
export async function notifyPartnerCreditLimitHit(
  tourOperatorId: string,
  detail: { code: string; overage: number; currencyCode: string },
): Promise<void> {
  await send(
    tourOperatorId,
    "money",
    `Approval needed — ${detail.code} is over your credit limit`,
    shell(`Booking ${detail.code} needs approval`, [
      `This booking takes you ${money(detail.overage, detail.currencyCode)} past your credit limit, so it has gone to your account manager.`,
      "It is not confirmed with the hotel until they approve it.",
    ]),
  );
}

/**
 * A warning while it is still avoidable. Fires once per crossing rather than
 * on every booking — a partner who gets five identical warnings stops reading
 * any of them.
 */
export async function notifyPartnerCreditWarning(
  tourOperatorId: string,
  detail: { used: number; limit: number; currencyCode: string },
): Promise<void> {
  const pct = Math.round((detail.used / detail.limit) * 100);
  await send(
    tourOperatorId,
    "money",
    `You have used ${pct}% of your credit limit`,
    shell("Approaching your credit limit", [
      `You have used ${money(detail.used, detail.currencyCode)} of ${money(detail.limit, detail.currencyCode)} — ${pct}%.`,
      "Once the limit is reached, new bookings go to your account manager to approve before they reach the hotel.",
      "Settling outstanding invoices frees the limit again.",
    ]),
  );
}

/** A payment landed, or a statement was issued. */
export async function notifyPartnerAccountMovement(
  tourOperatorId: string,
  detail: { title: string; amount: number; currencyCode: string; balance: number; reference?: string | null },
): Promise<void> {
  await send(
    tourOperatorId,
    "money",
    detail.title,
    shell(detail.title, [
      `Amount: ${money(detail.amount, detail.currencyCode)}${detail.reference ? ` · ${detail.reference}` : ""}`,
      `Your balance is now ${money(detail.balance, detail.currencyCode)}.`,
      "The full statement is in the portal under Credit &amp; statements.",
    ]),
  );
}

/**
 * Whether this credit position has just crossed the warning line. Reads the
 * previous position so a partner who was already above it is not told again.
 */
export function crossedCreditWarning(before: number, after: number, limit: number): boolean {
  if (limit <= 0) return false;
  const line = limit * CREDIT_WARNING_THRESHOLD;
  return before < line && after >= line;
}

/**
 * Tells the partner how a booking of theirs ended up, when it was staff who
 * decided. Silently does nothing for a booking that is not a partner's — the
 * staff booking screens call this for every transition.
 */
export async function notifyPartnerOfBookingOutcome(
  client: typeof db,
  bookingId: string,
  outcome: "confirmed" | "regretted",
): Promise<void> {
  try {
    const booking = await client.booking.findUnique({
      where: { id: bookingId },
      select: {
        code: true,
        tourOperatorId: true,
        source: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        buyingTotal: true,
        leadGuestFirstName: true,
        leadGuestLastName: true,
        onRequestDeadline: true,
        hotel: { select: { name: true } },
        currency: { select: { code: true } },
      },
    });

    if (!booking?.tourOperatorId || booking.source !== "TOUR_OPERATOR") return;

    // Built here so the emailed voucher is the same document the portal hands
    // out, rather than a second rendering that can drift.
    const voucher =
      outcome === "confirmed"
        ? await buildPartnerBookingPdf(bookingId, "voucher").catch(() => null)
        : null;

    await notifyPartnerOnRequestResolved(
      booking.tourOperatorId,
      {
        code: booking.code,
        hotelName: booking.hotel?.name ?? "",
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights ?? 0,
        total: Number(booking.buyingTotal),
        currencyCode: booking.currency?.code ?? "",
        leadGuest: `${booking.leadGuestFirstName ?? ""} ${booking.leadGuestLastName ?? ""}`.trim(),
        onRequestDeadline: booking.onRequestDeadline,
      },
      outcome,
      voucher ?? undefined,
    );
  } catch {
    // Never let telling somebody about the work undo the work.
  }
}
