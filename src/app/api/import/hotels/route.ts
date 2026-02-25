import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseHotelExcel } from "@/lib/import/parse-hotels";
import { db } from "@/server/db";
import type { MealCode, StarRating } from "@prisma/client";

// ------------------------------------------------------------------ helpers

/** Look up a country by ISO code (alpha-2/alpha-3) or by name (case-insensitive). */
async function resolveCountry(value: string) {
  const upper = value.toUpperCase();
  // Try exact code match first (alpha-2 or alpha-3)
  const byCode = await db.country.findFirst({
    where: {
      OR: [{ code: upper }, { code3: upper }],
    },
    select: { id: true },
  });
  if (byCode) return byCode.id;

  // Fall back to case-insensitive name match
  const byName = await db.country.findFirst({
    where: {
      name: { equals: value, mode: "insensitive" },
    },
    select: { id: true },
  });
  return byName?.id ?? null;
}

/** Look up a destination by name within the company (case-insensitive). */
async function resolveDestination(companyId: string, name: string) {
  const dest = await db.destination.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  return dest?.id ?? null;
}

// ------------------------------------------------------------------ route

export async function POST(req: NextRequest) {
  try {
    // ---- Auth ----
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    // ---- Parse multipart form data ----
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Please attach an Excel file." },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseHotelExcel(buffer);

    // ---- Preview mode ----
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get("preview") === "true";

    if (isPreview) {
      return NextResponse.json({
        hotels: parsed.hotels,
        roomTypes: parsed.roomTypes,
        mealBases: parsed.mealBases,
        hasErrors: parsed.hasErrors,
      });
    }

    // ---- Import mode ----
    let successCount = 0;
    let errorCount = 0;
    const importErrors: Array<{
      rowNum: number;
      sheet: string;
      errors: string[];
    }> = [];

    // Build a map of hotel code -> created hotel id for linking room types / meal bases
    const hotelIdByCode = new Map<string, string>();

    // 1. Import hotels
    for (const row of parsed.hotels) {
      if (row.errors.length > 0) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Hotels",
          errors: row.errors,
        });
        continue;
      }

      try {
        // Resolve country
        const countryId = await resolveCountry(row.country);
        if (!countryId) {
          errorCount++;
          importErrors.push({
            rowNum: row.rowNum,
            sheet: "Hotels",
            errors: [`Country not found: "${row.country}"`],
          });
          continue;
        }

        // Resolve destination (optional)
        let destinationId: string | null = null;
        if (row.destination) {
          destinationId = await resolveDestination(companyId, row.destination);
          // Not finding a destination is not a hard error; we just skip the link
        }

        // Upsert hotel (unique on [companyId, code])
        const hotel = await db.hotel.upsert({
          where: {
            companyId_code: { companyId, code: row.code },
          },
          update: {
            name: row.name,
            starRating: row.starRating as StarRating,
            city: row.city,
            countryId,
            destinationId,
            address: row.address || undefined,
            email: row.email || undefined,
            phone: row.phone || undefined,
          },
          create: {
            companyId,
            name: row.name,
            code: row.code,
            starRating: row.starRating as StarRating,
            city: row.city,
            countryId,
            destinationId,
            address: row.address || undefined,
            email: row.email || undefined,
            phone: row.phone || undefined,
          },
          select: { id: true },
        });

        hotelIdByCode.set(row.code, hotel.id);
        successCount++;
      } catch (err) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Hotels",
          errors: [
            err instanceof Error ? err.message : "Unknown error creating hotel",
          ],
        });
      }
    }

    // 2. Import room types
    for (const row of parsed.roomTypes) {
      if (row.errors.length > 0) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Room Types",
          errors: row.errors,
        });
        continue;
      }

      const hotelId = hotelIdByCode.get(row.hotelCode);
      if (!hotelId) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Room Types",
          errors: [
            `Hotel "${row.hotelCode}" was not imported (skipped due to errors)`,
          ],
        });
        continue;
      }

      try {
        await db.hotelRoomType.upsert({
          where: {
            hotelId_code: { hotelId, code: row.code },
          },
          update: {
            name: row.name,
            maxAdults: row.maxAdults,
            maxChildren: row.maxChildren,
          },
          create: {
            hotelId,
            name: row.name,
            code: row.code,
            maxAdults: row.maxAdults,
            maxChildren: row.maxChildren,
          },
        });
        successCount++;
      } catch (err) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Room Types",
          errors: [
            err instanceof Error
              ? err.message
              : "Unknown error creating room type",
          ],
        });
      }
    }

    // 3. Import meal bases
    for (const row of parsed.mealBases) {
      if (row.errors.length > 0) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Meal Bases",
          errors: row.errors,
        });
        continue;
      }

      const hotelId = hotelIdByCode.get(row.hotelCode);
      if (!hotelId) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Meal Bases",
          errors: [
            `Hotel "${row.hotelCode}" was not imported (skipped due to errors)`,
          ],
        });
        continue;
      }

      try {
        await db.hotelMealBasis.upsert({
          where: {
            hotelId_mealCode: {
              hotelId,
              mealCode: row.mealCode as MealCode,
            },
          },
          update: {
            name: row.name,
          },
          create: {
            hotelId,
            name: row.name,
            mealCode: row.mealCode as MealCode,
          },
        });
        successCount++;
      } catch (err) {
        errorCount++;
        importErrors.push({
          rowNum: row.rowNum,
          sheet: "Meal Bases",
          errors: [
            err instanceof Error
              ? err.message
              : "Unknown error creating meal basis",
          ],
        });
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      errors: importErrors,
    });
  } catch (err) {
    console.error("[hotel-import]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Hotel import failed",
      },
      { status: 500 },
    );
  }
}
