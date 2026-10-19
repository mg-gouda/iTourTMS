import { logger } from "@/lib/logger";

/**
 * SMS out, provider chosen by env (like email over SMTP):
 *   SMS_PROVIDER=twilio  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SMS_FROM
 *   SMS_PROVIDER=http    SMS_HTTP_URL with {to} {text} {from} placeholders
 *                        (GET), or SMS_HTTP_METHOD=POST + SMS_HTTP_BODY template
 *                        and optional SMS_HTTP_AUTH header value. Fits most
 *                        local gateways (SMS Misr, Victory Link, …).
 *   unset                messages are logged, not sent.
 * SMS_DEFAULT_COUNTRY=20 turns local numbers (01xx…) into +201xx….
 */

export const smsConfigured = () => !!process.env.SMS_PROVIDER;

/** E.164-ish: digits with a leading +, local 0-prefixed numbers get the default country code. */
export function normalizePhone(raw: string | null | undefined, defaultCountry = process.env.SMS_DEFAULT_COUNTRY ?? ""): string | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) {
    if (s.startsWith("0") && defaultCountry) s = `+${defaultCountry}${s.slice(1)}`;
    else if (defaultCountry && !s.startsWith(defaultCountry)) return null;
    else s = "+" + s;
  }
  const digits = s.slice(1);
  return /^\d{8,15}$/.test(digits) ? s : null;
}

const fill = (tpl: string, v: Record<string, string>, encode: (s: string) => string) =>
  tpl.replace(/\{(to|text|from)\}/g, (_, k: string) => encode(v[k] ?? ""));

export async function sendSms(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const provider = process.env.SMS_PROVIDER;
  const from = process.env.SMS_FROM ?? "";
  if (!provider) {
    logger.info({ to, text }, "[sms] SMS_PROVIDER not set — not sent");
    return { ok: false, error: "SMS not configured" };
  }
  try {
    let res: Response;
    if (provider === "twilio") {
      const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
      res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN ?? ""}`).toString("base64"),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: text }),
        signal: AbortSignal.timeout(15_000),
      });
    } else if (provider === "http") {
      const v = { to, text, from };
      const url = fill(process.env.SMS_HTTP_URL ?? "", v, encodeURIComponent);
      const post = (process.env.SMS_HTTP_METHOD ?? "GET").toUpperCase() === "POST";
      res = await fetch(url, {
        method: post ? "POST" : "GET",
        headers: {
          ...(post && { "content-type": process.env.SMS_HTTP_CONTENT_TYPE ?? "application/json" }),
          ...(process.env.SMS_HTTP_AUTH && { authorization: process.env.SMS_HTTP_AUTH }),
        },
        body: post ? fill(process.env.SMS_HTTP_BODY ?? "", v, (s) => JSON.stringify(s).slice(1, -1)) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } else {
      return { ok: false, error: `Unknown SMS_PROVIDER "${provider}"` };
    }
    if (!res.ok) return { ok: false, error: `Gateway ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

// ── Transfer messages ──

export interface JobForSms {
  code: string;
  serviceDate: Date;
  pickupTime: string | null;
  paxCount: number;
  leadPassenger: string | null;
  passengerPhone: string | null;
  from: string;
  to: string;
  driver?: { name: string | null; phone: string | null } | null;
  vehicle?: string | null;
}

const date = (d: Date) => d.toISOString().slice(0, 10);

/** What the driver needs on the road, in one message. */
export function driverMessage(j: JobForSms) {
  return [
    `${j.code} ${date(j.serviceDate)} ${j.pickupTime ?? ""}`.trim(),
    `${j.from} > ${j.to}`,
    `${j.paxCount} pax${j.leadPassenger ? `, ${j.leadPassenger}` : ""}${j.passengerPhone ? ` ${j.passengerPhone}` : ""}`,
  ].join("\n");
}

/** What the guest needs: when, where from, who is coming. */
export function guestMessage(j: JobForSms, company: string) {
  const who = j.driver?.name ? ` Driver: ${j.driver.name}${j.driver.phone ? ` ${j.driver.phone}` : ""}.` : "";
  return `${company}: your transfer ${date(j.serviceDate)}${j.pickupTime ? ` at ${j.pickupTime}` : ""} from ${j.from} to ${j.to}.${who}${j.vehicle ? ` Vehicle ${j.vehicle}.` : ""} Ref ${j.code}.`;
}
