import { readFile } from "node:fs/promises";
import path from "node:path";

import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateTariffPdf } from "@/lib/export/tariff-pdf";
import type { TariffPdfInput } from "@/lib/export/tariff-pdf";
import { db } from "@/server/db";
import type { TariffRateEntry } from "@/server/services/contracting/markup-calculator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const { id } = await params;

    // Check contracting module is installed
    const moduleInstalled = await db.installedModule.findFirst({
      where: { companyId, name: "contracting" },
    });
    if (!moduleInstalled) {
      return NextResponse.json(
        { error: "Contracting module not installed" },
        { status: 403 },
      );
    }

    // Fetch tariff with TO info
    const tariff = await db.tariff.findFirst({
      where: { id, companyId },
      include: {
        tourOperator: { select: { id: true, name: true, code: true } },
        markupRule: {
          select: { id: true, name: true, markupType: true, value: true },
        },
      },
    });

    if (!tariff) {
      return NextResponse.json(
        { error: "Tariff not found" },
        { status: 404 },
      );
    }

    // Fetch the full contract with all relations (same as contract-pdf route)
    const contract = await db.contract.findFirst({
      where: { id: tariff.contractId, companyId },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            code: true,
            starRating: true,
            city: true,
            address: true,
            phone: true,
            fax: true,
            email: true,
            website: true,
          },
        },
        baseCurrency: { select: { id: true, code: true, name: true } },
        baseRoomType: { select: { id: true, name: true, code: true } },
        baseMealBasis: { select: { id: true, name: true, mealCode: true } },
        seasons: { orderBy: { sortOrder: "asc" as const } },
        roomTypes: {
          include: {
            roomType: {
              select: {
                id: true,
                name: true,
                code: true,
                minAdults: true,
                standardAdults: true,
                maxAdults: true,
                maxChildren: true,
                maxOccupancy: true,
                extraBedAvailable: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" as const },
        },
        mealBases: {
          include: {
            mealBasis: { select: { id: true, name: true, mealCode: true } },
          },
          orderBy: { sortOrder: "asc" as const },
        },
        baseRates: {
          include: {
            season: { select: { id: true, dateFrom: true, dateTo: true } },
          },
        },
        supplements: {
          include: {
            roomType: { select: { id: true, name: true, code: true } },
            mealBasis: { select: { id: true, name: true, mealCode: true } },
          },
          orderBy: [
            { supplementType: "asc" as const },
            { sortOrder: "asc" as const },
          ],
        },
        specialOffers: { orderBy: { sortOrder: "asc" as const } },
        allotments: {
          include: {
            roomType: { select: { id: true, name: true, code: true } },
            season: { select: { id: true, dateFrom: true, dateTo: true } },
          },
          orderBy: { roomTypeId: "asc" as const },
        },
        stopSales: {
          include: {
            roomType: { select: { id: true, name: true, code: true } },
          },
          orderBy: { dateFrom: "asc" as const },
        },
        childPolicies: { orderBy: { category: "asc" as const } },
        cancellationPolicies: { orderBy: { daysBefore: "desc" as const } },
        markets: {
          include: {
            market: { select: { id: true, name: true, code: true } },
          },
        },
        marketingContributions: {
          include: {
            market: { select: { id: true, name: true, code: true } },
            season: { select: { id: true, dateFrom: true, dateTo: true } },
          },
          orderBy: { createdAt: "asc" as const },
        },
        specialMeals: { orderBy: { dateFrom: "asc" as const } },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // Fetch company branding
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, reportsLogoUrl: true },
    });

    const companyName = company?.name ?? "iTourTMS";

    // Read logo from disk if set
    let logoBase64: string | null = null;
    let logoFormat: string | undefined;
    if (company?.reportsLogoUrl) {
      try {
        const logoPath = path.join(
          process.cwd(),
          "public",
          company.reportsLogoUrl,
        );
        const logoBuffer = await readFile(logoPath);
        const ext =
          company.reportsLogoUrl.split(".").pop()?.toLowerCase() ?? "png";
        const mimeMap: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          webp: "image/webp",
          gif: "image/gif",
        };
        const mime = mimeMap[ext] ?? "image/png";
        logoBase64 = `data:${mime};base64,${logoBuffer.toString("base64")}`;
        logoFormat = ext === "jpg" ? "jpeg" : ext;
      } catch {
        // Logo file missing — generate PDF without it
      }
    }

    // Extract selling rates from tariff stored JSON
    const tariffData = tariff.data as Record<string, unknown>;
    const storedRates = (tariffData?.rates as TariffRateEntry[]) ?? [];
    const sellingRates = storedRates.map((r) => ({
      seasonLabel: r.seasonLabel,
      roomTypeName: r.roomTypeName,
      roomTypeCode: r.roomTypeCode,
      mealBasisName: r.mealBasisName,
      mealCode: r.mealCode,
      sellingRate: r.sellingRate,
    }));

    // Build TariffPdfInput
    const pdfInput: TariffPdfInput = {
      tariffName: tariff.name,
      tourOperatorName: tariff.tourOperator.name,
      tourOperatorCode: tariff.tourOperator.code,
      currencyCode: tariff.currencyCode,
      generatedAt: (tariff.generatedAt as Date).toISOString(),
      contract: {
        name: contract.name,
        code: contract.code,
        season: contract.season,
        status: contract.status,
        version: contract.version,
        rateBasis: contract.rateBasis,
        minimumStay: contract.minimumStay,
        maximumStay: contract.maximumStay,
        validFrom: contract.validFrom,
        validTo: contract.validTo,
        travelFrom: contract.travelFrom,
        travelTo: contract.travelTo,
        terms: contract.terms,
        hotelNotes: contract.hotelNotes,
        hotel: {
          name: contract.hotel.name,
          code: contract.hotel.code,
          starRating: contract.hotel.starRating,
          city: contract.hotel.city,
          address: contract.hotel.address,
          phone: contract.hotel.phone,
          fax: contract.hotel.fax,
          email: contract.hotel.email,
          website: contract.hotel.website,
        },
        baseCurrency: contract.baseCurrency,
        baseRoomType: contract.baseRoomType,
        baseMealBasis: contract.baseMealBasis,
        seasons: contract.seasons,
        roomTypes: contract.roomTypes,
        mealBases: contract.mealBases,
        supplements: contract.supplements,
        specialOffers: contract.specialOffers.map((so) => ({
          name: so.name,
          offerType: so.offerType,
          discountType: so.discountType,
          discountValue: so.discountValue,
          validFrom: so.validFrom,
          validTo: so.validTo,
          bookByDate: so.bookByDate,
          bookFromDate: so.bookFromDate,
          minimumNights: so.minimumNights,
          stayNights: so.stayNights,
          payNights: so.payNights,
          stayDateType: so.stayDateType,
          combinable: so.combinable,
          paymentPct: so.paymentPct,
          paymentDeadline: so.paymentDeadline,
          roomingListBy: so.roomingListBy,
          active: so.active,
        })),
        allotments: contract.allotments.map((a) => ({
          totalRooms: a.totalRooms,
          freeSale: a.freeSale,
          basis: a.basis,
          roomType: a.roomType,
          season: a.season,
        })),
        stopSales: contract.stopSales.map((ss) => ({
          roomType: ss.roomType,
          dateFrom: ss.dateFrom,
          dateTo: ss.dateTo,
          reason: ss.reason,
        })),
        marketingContributions: contract.marketingContributions.map((mc) => ({
          market: mc.market,
          season: mc.season,
          valueType: mc.valueType,
          value: mc.value,
          notes: mc.notes,
        })),
        childPolicies: contract.childPolicies,
        cancellationPolicies: contract.cancellationPolicies,
        markets: contract.markets,
        specialMeals: contract.specialMeals.map((sm) => ({
          occasion: sm.occasion,
          customName: sm.customName,
          dateFrom: sm.dateFrom,
          dateTo: sm.dateTo,
          mandatory: sm.mandatory,
          adultPrice: sm.adultPrice,
          childPrice: sm.childPrice,
          teenPrice: sm.teenPrice,
          infantPrice: sm.infantPrice,
          excludedMealBases: sm.excludedMealBases,
          notes: sm.notes,
        })),
      },
      sellingRates,
    };

    // Generate PDF
    const pdfBuffer = generateTariffPdf(pdfInput, {
      companyName,
      logoBase64,
      logoFormat,
    });

    // Build filename
    const filename = `Tariff_${contract.code}_${tariff.tourOperator.code}_${format(new Date(), "yyyyMMdd")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tariff-pdf export]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "PDF generation failed",
      },
      { status: 500 },
    );
  }
}
