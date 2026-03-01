import { readFile } from "node:fs/promises";
import path from "node:path";

import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { RATE_BASIS_LABELS } from "@/lib/constants/contracting";
import { generateRatesPdf } from "@/lib/export/rates-pdf";
import { db } from "@/server/db";
import {
  computeFullRateGrid,
  type RateContractData,
} from "@/server/services/contracting/rate-calculator";

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

    // Fetch contract with full data needed for rate calculation
    const contract = await db.contract.findFirst({
      where: { id, companyId },
      include: {
        hotel: {
          include: {
            childrenPolicies: { orderBy: { ageFrom: "asc" as const } },
          },
        },
        baseCurrency: { select: { id: true, code: true, name: true } },
        seasons: { orderBy: { sortOrder: "asc" as const } },
        roomTypes: {
          include: {
            roomType: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { sortOrder: "asc" as const },
        },
        mealBases: {
          include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
          orderBy: { sortOrder: "asc" as const },
        },
        baseRates: true,
        supplements: true,
        specialOffers: { where: { active: true }, orderBy: { sortOrder: "asc" as const } },
        childPolicies: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Build RateContractData (same transform as tRPC fetchContractData)
    const contractOverrides = new Map(
      contract.childPolicies.map((cp) => [cp.category, cp]),
    );
    const hotelDefaults = contract.hotel.childrenPolicies;
    const categories = new Set([
      ...hotelDefaults.map((p) => p.category),
      ...contract.childPolicies.map((p) => p.category),
    ]);

    const rateContractData: RateContractData = {
      rateBasis: contract.rateBasis as "PER_PERSON" | "PER_ROOM",
      baseRoomTypeId: contract.baseRoomTypeId,
      baseMealBasisId: contract.baseMealBasisId,
      seasons: contract.seasons.map((s) => ({
        id: s.id,
        dateFrom: s.dateFrom.toISOString().slice(0, 10),
        dateTo: s.dateTo.toISOString().slice(0, 10),
      })),
      roomTypes: contract.roomTypes.map((rt) => ({
        roomTypeId: rt.roomTypeId,
        isBase: rt.isBase,
        roomType: rt.roomType,
      })),
      mealBases: contract.mealBases.map((mb) => ({
        mealBasisId: mb.mealBasisId,
        isBase: mb.isBase,
        mealBasis: mb.mealBasis,
      })),
      baseRates: contract.baseRates.map((br) => ({
        seasonId: br.seasonId,
        rate: br.rate.toString(),
        singleRate: br.singleRate?.toString() ?? null,
        doubleRate: br.doubleRate?.toString() ?? null,
        tripleRate: br.tripleRate?.toString() ?? null,
      })),
      supplements: contract.supplements.map((s) => ({
        seasonId: s.seasonId,
        supplementType: s.supplementType,
        roomTypeId: s.roomTypeId,
        mealBasisId: s.mealBasisId,
        forAdults: s.forAdults,
        forChildCategory: s.forChildCategory,
        forChildBedding: s.forChildBedding,
        childPosition: s.childPosition,
        valueType: s.valueType,
        value: s.value.toString(),
        isReduction: s.isReduction,
        perPerson: s.perPerson,
        perNight: s.perNight,
        label: s.label,
      })),
      childPolicies: Array.from(categories).map((category) => {
        const override = contractOverrides.get(category);
        if (override) {
          return {
            category: override.category,
            ageFrom: override.ageFrom,
            ageTo: override.ageTo,
            freeInSharing: override.freeInSharing,
            maxFreePerRoom: override.maxFreePerRoom,
            extraBedAllowed: override.extraBedAllowed,
            chargePercentage: override.chargePercentage,
          };
        }
        const hotel = hotelDefaults.find((p) => p.category === category)!;
        return {
          category: hotel.category,
          ageFrom: hotel.ageFrom,
          ageTo: hotel.ageTo,
          freeInSharing: hotel.freeInSharing,
          maxFreePerRoom: hotel.maxFreePerRoom,
          extraBedAllowed: hotel.extraBedAllowed,
          chargePercentage: hotel.chargePercentage,
        };
      }),
      specialOffers: contract.specialOffers.map((o) => ({
        id: o.id,
        name: o.name,
        offerType: o.offerType,
        validFrom: o.validFrom?.toISOString().slice(0, 10) ?? null,
        validTo: o.validTo?.toISOString().slice(0, 10) ?? null,
        bookByDate: o.bookByDate?.toISOString().slice(0, 10) ?? null,
        minimumNights: o.minimumNights,
        minimumRooms: o.minimumRooms,
        advanceBookDays: o.advanceBookDays,
        discountType: o.discountType,
        discountValue: o.discountValue.toString(),
        stayNights: o.stayNights,
        payNights: o.payNights,
        bookFromDate: o.bookFromDate?.toISOString().slice(0, 10) ?? null,
        stayDateType: o.stayDateType,
        paymentPct: o.paymentPct,
        paymentDeadline: o.paymentDeadline?.toISOString().slice(0, 10) ?? null,
        roomingListBy: o.roomingListBy?.toISOString().slice(0, 10) ?? null,
        combinable: o.combinable,
        active: o.active,
      })),
    };

    // Compute the full rate grid
    const grid = computeFullRateGrid(rateContractData);

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
        const logoPath = path.join(process.cwd(), "public", company.reportsLogoUrl);
        const logoBuffer = await readFile(logoPath);
        const ext = company.reportsLogoUrl.split(".").pop()?.toLowerCase() ?? "png";
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

    // Generate PDF
    const pdfBuffer = generateRatesPdf(grid, {
      hotelName: contract.hotel.name,
      contractCode: contract.code,
      contractName: contract.name,
      currency: contract.baseCurrency.code,
      rateBasis: RATE_BASIS_LABELS[contract.rateBasis] ?? contract.rateBasis,
      companyName,
      logoBase64,
      logoFormat,
    });

    // Build filename
    const filename = `Rates_${contract.code}_${format(new Date(), "yyyyMMdd")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[rates-pdf export]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 },
    );
  }
}
