import type { PrismaClient } from "@prisma/client";

/**
 * Parses a tour operator's booking email into candidate booking fields.
 *
 * Nothing here writes to the database. The model proposes values, this module
 * resolves them against the company's own master data, and the agent confirms
 * every field in the booking form before anything is saved.
 */

const MODEL = "claude-sonnet-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TEXT_CHARS = 40_000;

export type ParsedBooking = {
  emailType: string;
  hotelName: string | null;
  tourOperatorName: string | null;
  marketName: string | null;
  externalRef: string | null;
  checkIn: string | null;
  checkOut: string | null;
  roomTypeName: string | null;
  mealBasis: string | null;
  noOfRooms: number | null;
  adults: number | null;
  children: number | null;
  infants: number | null;
  childAges: number[];
  guestNames: string[];
  arrivalFlightNo: string | null;
  arrivalTime: string | null;
  departFlightNo: string | null;
  departTime: string | null;
  buyingTotal: number | null;
  sellingTotal: number | null;
  currencyCode: string | null;
  notes: string | null;
  confidence: Record<string, number>;
};

const SCHEMA_HINT = `{
  "emailType": "NEW_BOOKING | AMENDMENT | CANCELLATION | ENQUIRY | OTHER",
  "hotelName": string|null, "tourOperatorName": string|null, "marketName": string|null,
  "externalRef": string|null,
  "checkIn": "YYYY-MM-DD"|null, "checkOut": "YYYY-MM-DD"|null,
  "roomTypeName": string|null, "mealBasis": string|null,
  "noOfRooms": number|null, "adults": number|null, "children": number|null, "infants": number|null,
  "childAges": number[], "guestNames": string[],
  "arrivalFlightNo": string|null, "arrivalTime": "HH:MM"|null,
  "departFlightNo": string|null, "departTime": "HH:MM"|null,
  "buyingTotal": number|null, "sellingTotal": number|null, "currencyCode": string|null,
  "notes": string|null,
  "confidence": { "<fieldName>": 0.0-1.0 }
}`;

/** Strips MIME headers and quoted-printable artefacts from a raw .eml. */
export function extractEmailText(raw: string): string {
  let body = raw;

  const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i);
  if (boundaryMatch) {
    const parts = raw.split(`--${boundaryMatch[1]}`);
    const textPart =
      parts.find((p) => /Content-Type:\s*text\/plain/i.test(p)) ??
      parts.find((p) => /Content-Type:\s*text\/html/i.test(p));
    if (textPart) body = textPart;
  }

  // Drop the header block, keep the body
  const headerEnd = body.search(/\r?\n\r?\n/);
  if (headerEnd > -1 && /Content-(Type|Transfer-Encoding):/i.test(body.slice(0, headerEnd))) {
    body = body.slice(headerEnd);
  }

  return body
    .replace(/=\r?\n/g, "") // quoted-printable soft breaks
    .replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

/** Calls Claude and returns the raw candidate fields. Never touches the database. */
export async function parseBookingEmail(
  text: string,
  apiKey: string,
): Promise<ParsedBooking> {
  const prompt = `You extract hotel booking details from a tour operator's email for an Egyptian destination management company.

First decide what kind of email this is, then extract every field you can find.

Rules:
- Use null for anything not stated. Never invent a value.
- Dates as YYYY-MM-DD. If the year is missing, infer it from context; if you cannot, use null.
- "confidence" holds a 0-1 score for each field you filled — be honest, low scores are useful.
- Return ONLY the JSON object, no markdown fence, no commentary.

Shape:
${SCHEMA_HINT}

Email:
"""
${text}
"""`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const body = (await res.json()) as { content: { type: string; text?: string }[] };
  const raw = body.content.find((c) => c.type === "text")?.text ?? "";
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);

  try {
    return JSON.parse(json) as ParsedBooking;
  } catch {
    throw new Error("Could not read the model's response as JSON");
  }
}

// ── Entity resolution against the company's own data ──

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Loose name match: exact, then containment either way. */
function findMatch<T extends { id: string; name: string }>(
  candidates: T[],
  value: string | null,
): T | null {
  if (!value) return null;
  const target = normalize(value);
  if (!target) return null;

  return (
    candidates.find((c) => normalize(c.name) === target) ??
    candidates.find((c) => normalize(c.name).includes(target) || target.includes(normalize(c.name))) ??
    null
  );
}

export type ResolvedEntity = { id: string; name: string } | null;

export type ResolvedBooking = {
  parsed: ParsedBooking;
  hotel: ResolvedEntity;
  tourOperator: ResolvedEntity;
  market: ResolvedEntity;
  roomType: ResolvedEntity;
  mealBasis: ResolvedEntity;
  currency: { id: string; code: string } | null;
  unmatched: string[];
};

/**
 * Maps parsed names onto real records. Anything that does not match comes back
 * in `unmatched` so the UI can flag it rather than the model guessing an ID.
 */
export async function resolveBookingEntities(
  db: PrismaClient,
  companyId: string,
  parsed: ParsedBooking,
): Promise<ResolvedBooking> {
  const [hotels, tourOperators, markets, currencies] = await Promise.all([
    db.hotel.findMany({ where: { companyId }, select: { id: true, name: true } }),
    db.tourOperator.findMany({ where: { companyId }, select: { id: true, name: true } }),
    db.market.findMany({ where: { companyId }, select: { id: true, name: true } }),
    db.currency.findMany({ where: { isActive: true }, select: { id: true, code: true } }),
  ]);

  const hotel = findMatch(hotels, parsed.hotelName);
  const tourOperator = findMatch(tourOperators, parsed.tourOperatorName);
  const market = findMatch(markets, parsed.marketName);

  // Room type and meal basis only make sense once the hotel is known
  let roomType: ResolvedEntity = null;
  let mealBasis: ResolvedEntity = null;
  if (hotel) {
    const [roomTypes, mealBases] = await Promise.all([
      db.hotelRoomType.findMany({
        where: { hotelId: hotel.id, active: true },
        select: { id: true, name: true },
      }),
      db.hotelMealBasis.findMany({
        where: { hotelId: hotel.id },
        select: { id: true, name: true, mealCode: true },
      }),
    ]);
    roomType = findMatch(roomTypes, parsed.roomTypeName);
    mealBasis =
      findMatch(mealBases, parsed.mealBasis) ??
      mealBases.find((m) => normalize(m.mealCode ?? "") === normalize(parsed.mealBasis ?? "")) ??
      null;
  }

  const currency = parsed.currencyCode
    ? (currencies.find((c) => c.code.toUpperCase() === parsed.currencyCode!.toUpperCase()) ?? null)
    : null;

  const unmatched: string[] = [];
  if (parsed.hotelName && !hotel) unmatched.push(`Hotel "${parsed.hotelName}"`);
  if (parsed.tourOperatorName && !tourOperator) unmatched.push(`Tour operator "${parsed.tourOperatorName}"`);
  if (parsed.marketName && !market) unmatched.push(`Market "${parsed.marketName}"`);
  if (parsed.roomTypeName && !roomType) unmatched.push(`Room type "${parsed.roomTypeName}"`);
  if (parsed.mealBasis && !mealBasis) unmatched.push(`Meal basis "${parsed.mealBasis}"`);
  if (parsed.currencyCode && !currency) unmatched.push(`Currency "${parsed.currencyCode}"`);

  return { parsed, hotel, tourOperator, market, roomType, mealBasis, currency, unmatched };
}
