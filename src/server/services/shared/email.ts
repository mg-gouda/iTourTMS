import nodemailer from "nodemailer";

// ── Configuration ──────────────────────────────────────────
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
});

const FROM =
  process.env.SMTP_FROM ?? "iTourTMS <noreply@itour.local>";

// ── Send helper ────────────────────────────────────────────
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!process.env.SMTP_HOST) {
    console.log(`[email] SMTP not configured — skipping email to ${opts.to}: ${opts.subject}`);
    return;
  }

  await transport.sendMail({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

// ── Booking Confirmation Email ─────────────────────────────
export async function sendBookingConfirmation(opts: {
  to: string;
  guestName: string;
  bookingCode: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  roomType?: string;
  total?: number;
  currency?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
}) {
  const {
    to,
    guestName,
    bookingCode,
    hotelName,
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    roomType,
    total,
    currency = "USD",
    companyName = "iTourTMS",
    companyEmail,
    companyPhone,
  } = opts;

  const subject = `Booking Confirmation — ${bookingCode}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <!-- Header -->
      <div style="background:#2563eb;padding:24px 32px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:22px">${companyName}</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Booking Confirmation</p>
      </div>

      <!-- Body -->
      <div style="padding:32px">
        <p style="margin:0 0 16px;font-size:16px;color:#18181b">
          Dear <strong>${guestName}</strong>,
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6">
          Thank you for your booking! Your reservation has been received and is being processed.
          Please find your booking details below.
        </p>

        <!-- Booking Code -->
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;text-align:center;margin:0 0 24px">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px">
            Booking Reference
          </p>
          <p style="margin:0;font-size:24px;font-weight:bold;color:#2563eb;font-family:monospace">
            ${bookingCode}
          </p>
        </div>

        <!-- Details -->
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:140px">Hotel</td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#18181b;font-weight:600">${hotelName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Check-in</td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#18181b">${checkIn}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Check-out</td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#18181b">${checkOut}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Duration</td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#18181b">${nights} night${nights !== 1 ? "s" : ""}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Guests</td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#18181b">
              ${adults} adult${adults !== 1 ? "s" : ""}${children > 0 ? `, ${children} child${children !== 1 ? "ren" : ""}` : ""}
            </td>
          </tr>
          ${roomType ? `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Room Type</td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#18181b">${roomType}</td>
          </tr>` : ""}
          ${total != null ? `
          <tr>
            <td style="padding:10px 0;color:#6b7280">Total</td>
            <td style="padding:10px 0;color:#18181b;font-weight:bold;font-size:18px">${currency} ${total.toFixed(2)}</td>
          </tr>` : ""}
        </table>

        <div style="margin:24px 0 0;padding:16px;background:#fefce8;border:1px solid #fde68a;border-radius:8px">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5">
            <strong>What's next?</strong> Our team will review your booking and confirm availability.
            You will receive a confirmation update within 24 hours. If payment is required,
            we will contact you with payment details.
          </p>
        </div>

        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
          You can check your booking status at any time by visiting our website and
          entering your booking reference <strong>${bookingCode}</strong> and email address.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
        <p style="margin:0;font-size:12px;color:#9ca3af">
          ${companyName}${companyEmail ? ` · ${companyEmail}` : ""}${companyPhone ? ` · ${companyPhone}` : ""}
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:#d1d5db">
          This is an automated message. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Booking Confirmation — ${bookingCode}

Dear ${guestName},

Thank you for your booking! Your reservation has been received.

Booking Reference: ${bookingCode}
Hotel: ${hotelName}
Check-in: ${checkIn}
Check-out: ${checkOut}
Duration: ${nights} night${nights !== 1 ? "s" : ""}
Guests: ${adults} adult${adults !== 1 ? "s" : ""}${children > 0 ? `, ${children} child${children !== 1 ? "ren" : ""}` : ""}
${roomType ? `Room Type: ${roomType}\n` : ""}${total != null ? `Total: ${currency} ${total.toFixed(2)}\n` : ""}
Our team will review and confirm your booking within 24 hours.

${companyName}`;

  await sendEmail({ to, subject, html, text });
}
