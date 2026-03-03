import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
  ShadingType,
  PageBreak,
} from "docx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text, heading: level, spacing: { after: 120 } });
}

function para(text: string, opts?: { bold?: boolean; italic?: boolean; spacing?: number }) {
  return new Paragraph({
    spacing: { after: opts?.spacing ?? 80 },
    children: [
      new TextRun({ text, bold: opts?.bold, italics: opts?.italic, size: 22 }),
    ],
  });
}

function codePara(text: string) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text, font: "Courier New", size: 18 }),
    ],
  });
}

function codeBlock(lines: string[]) {
  return lines.map((line) =>
    new Paragraph({
      spacing: { after: 0 },
      shading: { type: ShadingType.SOLID, color: "f5f5f5" },
      children: [
        new TextRun({ text: line || " ", font: "Courier New", size: 18 }),
      ],
    }),
  );
}

function tableHeader(cells: string[]) {
  return new TableRow({
    tableHeader: true,
    children: cells.map(
      (text) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, color: "44246e" },
          children: [
            new Paragraph({
              children: [new TextRun({ text, bold: true, color: "ffffff", size: 20 })],
            }),
          ],
        }),
    ),
  });
}

function tableRow(cells: string[]) {
  return new TableRow({
    children: cells.map(
      (text) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text, size: 20 })],
            }),
          ],
        }),
    ),
  });
}

function simpleTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "dddddd" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "dddddd" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "dddddd" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "dddddd" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "dddddd" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "dddddd" },
    },
    rows: [tableHeader(headers), ...rows.map(tableRow)],
  });
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export async function generateApiDocs(baseUrl: string): Promise<Buffer> {
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { size: 22, font: "Calibri" },
          paragraph: { spacing: { after: 80 } },
        },
      ],
    },
    sections: [
      {
        children: [
          // ── Title Page ──
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 4000 },
            children: [
              new TextRun({ text: "iTourTMS", size: 60, bold: true, color: "44246e" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: "Public REST API Documentation", size: 36, color: "666666" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `API v1 — ${new Date().toISOString().slice(0, 10)}`, size: 24, color: "999999" }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 1. Introduction ──
          heading("1. Introduction", HeadingLevel.HEADING_1),
          para(
            "The iTourTMS Public REST API allows authorized tour operators to programmatically access hotel data, contract rates, and availability from published contracts. All rates returned are selling rates (buying rates + markup).",
          ),
          para(`Base URL: ${baseUrl}/api/v1`, { bold: true }),
          para("All responses are JSON and follow a standard envelope format."),

          // ── 2. Authentication ──
          heading("2. Authentication", HeadingLevel.HEADING_1),
          para(
            "All requests must include a valid API key. You can authenticate using either method:",
          ),
          para("Option A: Bearer token in the Authorization header", { bold: true }),
          ...codeBlock(["Authorization: Bearer itms_xxxxxxxxxxxxxxxxxxxxxxxx"]),
          para(""),
          para("Option B: X-API-Key header", { bold: true }),
          ...codeBlock(["X-API-Key: itms_xxxxxxxxxxxxxxxxxxxxxxxx"]),
          para(""),
          para("Example cURL request:", { bold: true }),
          ...codeBlock([
            `curl -H "Authorization: Bearer YOUR_API_KEY" \\`,
            `  "${baseUrl}/api/v1/hotels"`,
          ]),
          para(""),
          para(
            "API keys are generated by iTourTMS administrators and scoped to a specific tour operator. Your key gives you access only to hotels and contracts assigned to your integration.",
          ),

          // ── 3. Rate Limiting ──
          heading("3. Rate Limiting", HeadingLevel.HEADING_1),
          para("The API enforces a sliding-window rate limit of 100 requests per minute per API key."),
          para("Rate limit information is returned in every response via headers:"),
          simpleTable(
            ["Header", "Description"],
            [
              ["X-RateLimit-Limit", "Maximum requests per window (100)"],
              ["X-RateLimit-Remaining", "Requests remaining in current window"],
              ["X-RateLimit-Reset", "Unix timestamp when the window resets"],
            ],
          ),
          para(""),
          para("When the limit is exceeded, the API returns HTTP 429 Too Many Requests. Wait until the reset timestamp before retrying."),

          // ── 4. Response Format ──
          heading("4. Response Format", HeadingLevel.HEADING_1),
          para("Success response:", { bold: true }),
          ...codeBlock([
            "{",
            '  "success": true,',
            '  "data": { ... }',
            "}",
          ]),
          para(""),
          para("Paginated response:", { bold: true }),
          ...codeBlock([
            "{",
            '  "success": true,',
            '  "data": [ ... ],',
            '  "pagination": {',
            '    "page": 1,',
            '    "pageSize": 20,',
            '    "total": 42,',
            '    "totalPages": 3',
            "  }",
            "}",
          ]),
          para(""),
          para("Error response:", { bold: true }),
          ...codeBlock([
            "{",
            '  "success": false,',
            '  "error": {',
            '    "code": "NOT_FOUND",',
            '    "message": "Contract not found"',
            "  }",
            "}",
          ]),

          new Paragraph({ children: [new PageBreak()] }),

          // ── 5. Endpoints Reference ──
          heading("5. Endpoints Reference", HeadingLevel.HEADING_1),

          // 5.1 List Hotels
          heading("5.1 List Hotels", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/hotels"),
          para("Returns hotels you have access to that have at least one PUBLISHED contract."),
          para("Query parameters:", { bold: true }),
          simpleTable(
            ["Parameter", "Type", "Default", "Description"],
            [
              ["page", "integer", "1", "Page number"],
              ["pageSize", "integer", "20", "Items per page (max 100)"],
              ["search", "string", "", "Filter by hotel name or code"],
            ],
          ),

          // 5.2 Hotel Detail
          para(""),
          heading("5.2 Hotel Detail", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/hotels/:hotelId"),
          para("Returns full hotel information including room types, amenities, and meal bases."),

          // 5.3 List Contracts
          para(""),
          heading("5.3 List Contracts", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/hotels/:hotelId/contracts"),
          para("Returns all PUBLISHED contracts for the specified hotel."),
          para("Query parameters:", { bold: true }),
          simpleTable(
            ["Parameter", "Type", "Default", "Description"],
            [
              ["page", "integer", "1", "Page number"],
              ["pageSize", "integer", "20", "Items per page (max 100)"],
            ],
          ),

          // 5.4 Contract Detail
          para(""),
          heading("5.4 Contract Detail + Selling Rates", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/hotels/:hotelId/contracts/:contractId"),
          para(
            "Returns full contract detail with selling rates. Rates are computed on-the-fly using the markup rule configured for your tour operator.",
          ),
          para("Response includes: contract metadata, seasons, room types, meal bases, selling rates grid, supplements, special offers, child policies, cancellation policies."),

          // 5.5 Rate Grid
          para(""),
          heading("5.5 Selling Rate Grid", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/hotels/:hotelId/contracts/:contractId/rates"),
          para("Returns only the selling rate grid for the contract (lighter payload)."),
          para("Each rate entry includes: seasonId, roomTypeId, mealBasisId, baseRate, markup, sellingRate."),

          // 5.6 Availability
          para(""),
          heading("5.6 Availability", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/hotels/:hotelId/contracts/:contractId/availability"),
          para("Returns allotment data and stop-sale periods for the contract."),

          // 5.7 Rate Calculator
          para(""),
          heading("5.7 Rate Calculator", HeadingLevel.HEADING_2),
          codePara("POST /api/v1/hotels/:hotelId/contracts/:contractId/calculate"),
          para("On-demand rate calculation with full breakdown including selling rate."),
          para("Request body:", { bold: true }),
          simpleTable(
            ["Field", "Type", "Required", "Description"],
            [
              ["seasonId", "string", "Yes", "Season ID"],
              ["roomTypeId", "string", "Yes", "Room type ID"],
              ["mealBasisId", "string", "Yes", "Meal basis ID"],
              ["adults", "integer", "No", "Number of adults (default: 2)"],
              ["children", "array", "No", 'Array of {category} objects (default: [])'],
              ["extraBed", "boolean", "No", "Extra bed requested (default: false)"],
              ["nights", "integer", "No", "Number of nights (default: 1)"],
              ["bookingDate", "string", "No", "Booking date (YYYY-MM-DD)"],
              ["checkInDate", "string", "No", "Check-in date (YYYY-MM-DD)"],
            ],
          ),

          // 5.8 PDF Download
          para(""),
          heading("5.8 Contract PDF", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/hotels/:hotelId/contracts/:contractId/pdf"),
          para("Downloads the contract as a PDF document. Returns Content-Type: application/pdf."),

          // 5.9 List Tariffs
          para(""),
          heading("5.9 List Tariffs", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/tariffs"),
          para("Returns a paginated list of tariffs generated for your tour operator. Only tariffs for hotels you have access to with PUBLISHED contracts are returned."),
          para("Query parameters:", { bold: true }),
          simpleTable(
            ["Parameter", "Type", "Default", "Description"],
            [
              ["page", "integer", "1", "Page number"],
              ["pageSize", "integer", "20", "Items per page (max 100)"],
              ["hotelId", "string", "", "Filter by hotel ID"],
              ["contractId", "string", "", "Filter by contract ID"],
            ],
          ),
          para(""),
          para("Response fields:", { bold: true }),
          simpleTable(
            ["Field", "Type", "Description"],
            [
              ["id", "string", "Tariff unique identifier"],
              ["name", "string", "Tariff name"],
              ["contractCode", "string", "Contract code"],
              ["contractName", "string", "Contract name"],
              ["hotelName", "string", "Hotel name"],
              ["hotelCode", "string", "Hotel code"],
              ["currencyCode", "string", "Currency code (e.g. EUR)"],
              ["generatedAt", "datetime", "When the tariff was generated"],
            ],
          ),

          // 5.10 Tariff Detail
          para(""),
          heading("5.10 Tariff Detail", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/tariffs/:tariffId"),
          para("Returns full tariff detail including contract structure and selling rates. No cost data (base rates, markup amounts, markup type) is exposed — only the final selling rate per combination."),
          para(""),
          para("Response includes:", { bold: true }),
          para("Tariff metadata (id, name, currencyCode, generatedAt), contract info (seasons, room types, meal bases, allotments, cancellation policies, child policies, special offers, stop sales), and a sellingRates array."),
          para(""),
          para("Example sellingRates entry:", { bold: true }),
          ...codeBlock([
            "{",
            '  "seasonLabel": "01 Jun – 30 Sep 2026",',
            '  "roomTypeName": "Standard Double",',
            '  "roomTypeCode": "STD",',
            '  "mealBasisName": "Half Board",',
            '  "mealCode": "HB",',
            '  "sellingRate": 185.50,',
            '  "perNight": true',
            "}",
          ]),

          // 5.11 Tariff PDF
          para(""),
          heading("5.11 Tariff PDF", HeadingLevel.HEADING_2),
          codePara("GET /api/v1/tariffs/:tariffId/pdf"),
          para("Downloads the tariff as a branded PDF document with selling rates, contract details, and all policies. Returns Content-Type: application/pdf."),
          para("The PDF includes the company logo, room types, selling rates matrix, seasons, child policies, cancellation policies, allotments, special offers, stop sales, and terms."),

          new Paragraph({ children: [new PageBreak()] }),

          // ── 6. Webhooks ──
          heading("6. Webhooks", HeadingLevel.HEADING_1),
          para(
            "When configured, iTourTMS will send HTTP POST requests to your webhook URL when certain events occur on published contracts for your permitted hotels.",
          ),

          heading("6.1 Events", HeadingLevel.HEADING_2),
          simpleTable(
            ["Event", "Trigger"],
            [
              ["contract.published", "A contract is published"],
              ["rates.updated", "Base rates or supplements are modified"],
              ["spo.updated", "Season SPOs or special offers are changed"],
              ["availability.updated", "Allotments or stop-sales are modified"],
              ["tariff.generated", "A tariff is generated (includes full contract details + selling rates)"],
              ["test.ping", "Manual test from the admin panel"],
            ],
          ),

          heading("6.2 Payload Format", HeadingLevel.HEADING_2),
          ...codeBlock([
            "{",
            '  "event": "rates.updated",',
            '  "payload": {',
            '    "contractId": "clxyz...",',
            '    "contractCode": "CTR-001",',
            '    "contractName": "Summer 2026",',
            '    "hotelId": "clxyz..."',
            "  },",
            '  "timestamp": "2026-02-26T12:00:00.000Z"',
            "}",
          ]),

          heading("6.3 HMAC Verification", HeadingLevel.HEADING_2),
          para(
            "If a webhook secret is configured, each request includes an X-Webhook-Signature header containing the HMAC-SHA256 hex digest of the request body signed with your secret.",
          ),
          para("Verification example (Node.js):", { bold: true }),
          ...codeBlock([
            'const crypto = require("crypto");',
            "",
            "function verify(body, signature, secret) {",
            '  const expected = crypto.createHmac("sha256", secret)',
            "    .update(body)",
            '    .digest("hex");',
            "  return crypto.timingSafeEqual(",
            '    Buffer.from(signature, "hex"),',
            '    Buffer.from(expected, "hex")',
            "  );",
            "}",
          ]),

          heading("6.4 Retry Policy", HeadingLevel.HEADING_2),
          para(
            "Failed deliveries are retried up to 3 times with exponential backoff: 1 second, 4 seconds, 9 seconds. All delivery attempts are logged and visible in the admin panel.",
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ── 7. Error Codes ──
          heading("7. Error Codes", HeadingLevel.HEADING_1),
          simpleTable(
            ["HTTP Status", "Error Code", "Description"],
            [
              ["400", "BAD_REQUEST", "Invalid input or missing required fields"],
              ["401", "UNAUTHORIZED", "Missing or invalid API key"],
              ["403", "FORBIDDEN", "Insufficient permissions for this action"],
              ["404", "NOT_FOUND", "Resource not found or not accessible"],
              ["429", "RATE_LIMITED", "Too many requests — wait for rate limit reset"],
              ["500", "INTERNAL_ERROR", "Unexpected server error"],
            ],
          ),

          // ── 8. Data Models ──
          heading("8. Key Data Models", HeadingLevel.HEADING_1),

          heading("8.1 Hotel", HeadingLevel.HEADING_2),
          simpleTable(
            ["Field", "Type", "Description"],
            [
              ["id", "string", "Unique identifier"],
              ["name", "string", "Hotel name"],
              ["code", "string", "Hotel code"],
              ["starRating", "string", "ONE, TWO, THREE, FOUR, FIVE"],
              ["city", "string", "City name"],
              ["country", "object", "Country {id, name, code}"],
              ["roomTypes", "array", "Room type objects"],
              ["amenities", "array", "Hotel amenity objects"],
            ],
          ),

          heading("8.2 Contract", HeadingLevel.HEADING_2),
          simpleTable(
            ["Field", "Type", "Description"],
            [
              ["id", "string", "Unique identifier"],
              ["code", "string", "Contract code (e.g. CTR-001)"],
              ["rateBasis", "string", "PER_PERSON or PER_ROOM"],
              ["validFrom / validTo", "date", "Contract validity period"],
              ["currency", "object", "Currency {id, code, name}"],
              ["seasons", "array", "Season periods"],
              ["sellingRates", "array", "Selling rate entries"],
            ],
          ),

          heading("8.3 Selling Rate Entry", HeadingLevel.HEADING_2),
          simpleTable(
            ["Field", "Type", "Description"],
            [
              ["seasonId", "string", "Season period ID"],
              ["roomTypeId", "string", "Room type ID"],
              ["mealBasisId", "string", "Meal basis ID"],
              ["baseRate", "number", "Buying rate (base + supplements)"],
              ["markup", "number", "Markup amount applied"],
              ["sellingRate", "number", "Final selling rate (baseRate + markup)"],
              ["markupType", "string", "PERCENTAGE, FIXED_PER_NIGHT, FIXED_PER_BOOKING"],
            ],
          ),

          heading("8.4 Tariff", HeadingLevel.HEADING_2),
          para("Tariffs are pre-generated selling rate sheets for a specific tour operator and contract. They contain the final selling rates with markup already applied."),
          simpleTable(
            ["Field", "Type", "Description"],
            [
              ["id", "string", "Unique identifier"],
              ["name", "string", "Tariff name (e.g. 'Summer 2026 - Hotel ABC')"],
              ["currencyCode", "string", "Currency code (e.g. EUR, USD)"],
              ["generatedAt", "datetime", "Timestamp when the tariff was generated"],
              ["contract", "object", "Contract details (seasons, room types, meal bases, policies)"],
              ["sellingRates", "array", "Array of Tariff Selling Rate Entry objects"],
            ],
          ),

          heading("8.5 Tariff Selling Rate Entry", HeadingLevel.HEADING_2),
          para("Tariff selling rate entries contain only the final selling rate. No cost data (base rate, markup amount, markup type) is included."),
          simpleTable(
            ["Field", "Type", "Description"],
            [
              ["seasonLabel", "string", "Human-readable season date range"],
              ["roomTypeName", "string", "Room type name"],
              ["roomTypeCode", "string", "Room type code"],
              ["mealBasisName", "string", "Meal basis name"],
              ["mealCode", "string", "Meal basis code (e.g. HB, FB, AI)"],
              ["sellingRate", "number", "Final selling rate with markup applied"],
              ["perNight", "boolean", "Whether the rate is per night"],
            ],
          ),

          // ── 9. Integration Flow ──
          new Paragraph({ children: [new PageBreak()] }),
          heading("9. Integration Flow Example", HeadingLevel.HEADING_1),
          para("Step 1: Obtain your API key from the iTourTMS administrator."),
          para("Step 2: Discover available hotels:"),
          ...codeBlock([`curl -H "Authorization: Bearer YOUR_KEY" ${baseUrl}/api/v1/hotels`]),
          para(""),
          para("Step 3: List published contracts for a hotel:"),
          ...codeBlock([
            `curl -H "Authorization: Bearer YOUR_KEY" \\`,
            `  ${baseUrl}/api/v1/hotels/HOTEL_ID/contracts`,
          ]),
          para(""),
          para("Step 4: Get selling rates for a contract:"),
          ...codeBlock([
            `curl -H "Authorization: Bearer YOUR_KEY" \\`,
            `  ${baseUrl}/api/v1/hotels/HOTEL_ID/contracts/CONTRACT_ID/rates`,
          ]),
          para(""),
          para("Step 5: Calculate a specific booking scenario:"),
          ...codeBlock([
            `curl -X POST -H "Authorization: Bearer YOUR_KEY" \\`,
            '  -H "Content-Type: application/json" \\',
            `  -d '{"seasonId":"...","roomTypeId":"...","mealBasisId":"...","adults":2,"nights":3}' \\`,
            `  ${baseUrl}/api/v1/hotels/HOTEL_ID/contracts/CONTRACT_ID/calculate`,
          ]),
          para(""),
          para("Step 6: List your pre-generated tariffs:"),
          ...codeBlock([
            `curl -H "Authorization: Bearer YOUR_KEY" \\`,
            `  ${baseUrl}/api/v1/tariffs`,
          ]),
          para(""),
          para("Step 7: Get full tariff detail with selling rates:"),
          ...codeBlock([
            `curl -H "Authorization: Bearer YOUR_KEY" \\`,
            `  ${baseUrl}/api/v1/tariffs/TARIFF_ID`,
          ]),
          para(""),
          para("Step 8: Download tariff as a PDF:"),
          ...codeBlock([
            `curl -H "Authorization: Bearer YOUR_KEY" -o tariff.pdf \\`,
            `  ${baseUrl}/api/v1/tariffs/TARIFF_ID/pdf`,
          ]),
          para(""),
          para("Step 9: (Optional) Configure webhooks in iTourTMS to receive real-time notifications when rates, availability, or tariffs change."),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
