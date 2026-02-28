import { format } from "date-fns";
import { BOOKING_STATUS_LABELS } from "@/lib/constants/reservations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingEmlData {
  code: string;
  status: string;
  checkIn: string | Date;
  checkOut: string | Date;
  nights: number;
  specialRequests: string | null;

  hotel: {
    name: string;
    email?: string | null;
  };
  tourOperator?: { name: string } | null;
  currency: { code: string; symbol: string };
  rooms: Array<{
    roomIndex: number;
    roomType: { name: string };
    mealBasis: { name: string; mealCode: string };
    adults: number;
    children: number;
    infants: number;
  }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guestNames?: any[] | null;
  leadGuestName?: string | null;

  // Flight details
  arrivalFlightNo?: string | null;
  arrivalTime?: string | null;
  arrivalOriginApt?: string | null;
  arrivalDestApt?: string | null;
  departFlightNo?: string | null;
  departTime?: string | null;
  departOriginApt?: string | null;
  departDestApt?: string | null;

  company?: {
    name: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date): string {
  return format(typeof d === "string" ? new Date(d) : d, "dd MMM yyyy");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// EML Generation
// ---------------------------------------------------------------------------

/**
 * Generate an RFC 2822 .eml file content with X-Unsent: 1 header
 * so Outlook opens it as a composable draft.
 *
 * @param pdfBase64 - base64-encoded PDF content (no data: prefix)
 * @param pdfFilename - filename for the attachment
 */
export function generateBookingEml(
  data: BookingEmlData,
  pdfBase64: string,
  pdfFilename: string,
): string {
  const statusLabel = BOOKING_STATUS_LABELS[data.status] ?? data.status;
  const to = data.hotel.email ?? "";
  const subject = `${statusLabel} @ ${escapeHtml(data.hotel.name)} - ${data.code}`;

  // Build HTML body
  const guestList = buildGuestList(data);
  const flightSection = buildFlightSection(data);
  const roomSection = buildRoomSection(data);

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
<p>Dear Sir/Madam,</p>
<p>Kindly ask you to reserve &amp; confirm below booking:</p>

<h3 style="color: #194178; border-bottom: 1px solid #194178; padding-bottom: 4px;">Booking Details</h3>
<table style="border-collapse: collapse; margin-bottom: 16px;">
  <tr><td style="padding: 2px 12px 2px 0; color: #666;">Reference:</td><td><strong>${escapeHtml(data.code)}</strong></td></tr>
  <tr><td style="padding: 2px 12px 2px 0; color: #666;">Hotel:</td><td>${escapeHtml(data.hotel.name)}</td></tr>
  <tr><td style="padding: 2px 12px 2px 0; color: #666;">Check-in:</td><td>${fmtDate(data.checkIn)}</td></tr>
  <tr><td style="padding: 2px 12px 2px 0; color: #666;">Check-out:</td><td>${fmtDate(data.checkOut)}</td></tr>
  <tr><td style="padding: 2px 12px 2px 0; color: #666;">Nights:</td><td>${data.nights}</td></tr>
</table>

${roomSection}

${guestList}

${flightSection}

${data.specialRequests ? `<h3 style="color: #194178; border-bottom: 1px solid #194178; padding-bottom: 4px;">Special Requests</h3>
<p>${escapeHtml(data.specialRequests)}</p>` : ""}

<p>Thanks &amp; best personal regards,<br/>
<strong>${escapeHtml(data.company?.name ?? "")}</strong></p>
</body>
</html>`;

  // Build MIME message
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const emlParts: string[] = [];
  emlParts.push(`X-Unsent: 1`);
  emlParts.push(`To: ${to}`);
  emlParts.push(`Subject: ${subject}`);
  emlParts.push(`MIME-Version: 1.0`);
  emlParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  emlParts.push(``);
  emlParts.push(`--${boundary}`);
  emlParts.push(`Content-Type: text/html; charset="utf-8"`);
  emlParts.push(`Content-Transfer-Encoding: quoted-printable`);
  emlParts.push(``);
  emlParts.push(toQuotedPrintable(htmlBody));
  emlParts.push(``);
  emlParts.push(`--${boundary}`);
  emlParts.push(`Content-Type: application/pdf; name="${pdfFilename}"`);
  emlParts.push(`Content-Transfer-Encoding: base64`);
  emlParts.push(`Content-Disposition: attachment; filename="${pdfFilename}"`);
  emlParts.push(``);
  // Split base64 into 76-char lines
  emlParts.push(pdfBase64.replace(/(.{76})/g, "$1\r\n"));
  emlParts.push(``);
  emlParts.push(`--${boundary}--`);

  return emlParts.join("\r\n");
}

// ---------------------------------------------------------------------------
// Internal builders
// ---------------------------------------------------------------------------

function buildRoomSection(data: BookingEmlData): string {
  if (!data.rooms.length) return "";
  let html = `<h3 style="color: #194178; border-bottom: 1px solid #194178; padding-bottom: 4px;">Room Details</h3>`;
  for (const room of data.rooms) {
    const occupancy = [
      `${room.adults} Adult${room.adults !== 1 ? "s" : ""}`,
      room.children > 0 ? `${room.children} Child${room.children !== 1 ? "ren" : ""}` : "",
      room.infants > 0 ? `${room.infants} Infant${room.infants !== 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(", ");
    html += `<p style="margin: 4px 0;"><strong>Room ${room.roomIndex}:</strong> ${escapeHtml(room.roomType.name)} — ${escapeHtml(room.mealBasis.name)} (${escapeHtml(room.mealBasis.mealCode)}) — ${occupancy}</p>`;
  }
  return html;
}

function buildGuestList(data: BookingEmlData): string {
  const rawGuestNames = (data.guestNames ?? []).filter(Boolean);
  const isStructured = rawGuestNames.length > 0 && typeof rawGuestNames[0] === "object" && rawGuestNames[0] !== null;

  let html = `<h3 style="color: #194178; border-bottom: 1px solid #194178; padding-bottom: 4px;">Guest Names</h3>`;

  if (isStructured) {
    const structured = rawGuestNames as Array<{ title?: string; name: string; dob?: string; roomIndex?: number; type?: string }>;
    const byRoom = new Map<number, typeof structured>();
    for (const g of structured) {
      const ri = g.roomIndex ?? 1;
      if (!byRoom.has(ri)) byRoom.set(ri, []);
      byRoom.get(ri)!.push(g);
    }
    for (const [roomIdx, guests] of byRoom) {
      html += `<p style="margin: 4px 0; font-weight: bold;">Room ${roomIdx}:</p><ul style="margin: 0 0 8px 0;">`;
      for (const g of guests) {
        const name = g.title ? `${g.title} ${g.name}` : g.name;
        const suffix = g.type === "CHILD" && g.dob ? ` (DOB: ${fmtDate(g.dob)})` : "";
        html += `<li>${escapeHtml(name)}${suffix}</li>`;
      }
      html += `</ul>`;
    }
  } else if (rawGuestNames.length > 0) {
    html += `<ul style="margin: 0;">`;
    for (const g of rawGuestNames as string[]) {
      html += `<li>${escapeHtml(g)}</li>`;
    }
    html += `</ul>`;
  } else if (data.leadGuestName) {
    html += `<p>${escapeHtml(data.leadGuestName)}</p>`;
  } else {
    return "";
  }

  return html;
}

function buildFlightSection(data: BookingEmlData): string {
  if (!data.arrivalFlightNo && !data.departFlightNo) return "";

  let html = `<h3 style="color: #194178; border-bottom: 1px solid #194178; padding-bottom: 4px;">Flight Details</h3>`;

  if (data.arrivalFlightNo) {
    const parts = [`Flight: ${data.arrivalFlightNo}`];
    if (data.arrivalTime) parts.push(`Time: ${data.arrivalTime}`);
    if (data.arrivalOriginApt) parts.push(`From: ${data.arrivalOriginApt}`);
    if (data.arrivalDestApt) parts.push(`To: ${data.arrivalDestApt}`);
    html += `<p style="margin: 4px 0;"><strong>Arrival:</strong> ${parts.join(" &nbsp;|&nbsp; ")}</p>`;
  }

  if (data.departFlightNo) {
    const parts = [`Flight: ${data.departFlightNo}`];
    if (data.departTime) parts.push(`Time: ${data.departTime}`);
    if (data.departOriginApt) parts.push(`From: ${data.departOriginApt}`);
    if (data.departDestApt) parts.push(`To: ${data.departDestApt}`);
    html += `<p style="margin: 4px 0;"><strong>Departure:</strong> ${parts.join(" &nbsp;|&nbsp; ")}</p>`;
  }

  return html;
}

/**
 * Simple quoted-printable encoding for email body.
 */
function toQuotedPrintable(str: string): string {
  return str.replace(/[^\t\n\r -~]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code < 256) {
      return `=${code.toString(16).toUpperCase().padStart(2, "0")}`;
    }
    // For multi-byte, encode each byte of the UTF-8 representation
    const buf = new TextEncoder().encode(ch);
    return Array.from(buf)
      .map((b) => `=${b.toString(16).toUpperCase().padStart(2, "0")}`)
      .join("");
  });
}
