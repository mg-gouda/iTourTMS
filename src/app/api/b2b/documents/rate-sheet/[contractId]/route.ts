import { format } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";

import { partnerAuth } from "@/lib/auth-partner";
import { auditPartner } from "@/lib/b2b/audit";
import { RATE_BASIS_LABELS } from "@/lib/constants/contracting";
import { appendPartnerRateSheetAnnex } from "@/lib/export/partner-rate-sheet-annex";
import { generateRatesDoc } from "@/lib/export/rates-pdf";
import { db } from "@/server/db";
import { partnerHotelIds } from "@/server/services/b2b/partner-search";
import { loadContractRateGrid } from "@/server/services/contracting/rate-grid-loader";

/**
 * A partner's rate sheet: the same grid staff see, for a contract on a hotel
 * the partner is allowed to sell. The allowlist is checked here rather than
 * trusted from the page, so a guessed contract id gets nothing.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; companyId?: string | null; tourOperatorId?: string | null }
    | undefined;

  if (!user || user.realm !== "partner" || !user.companyId || !user.tourOperatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contractId } = await params;
  const allowed = await partnerHotelIds(user.tourOperatorId);

  const contract = await db.contract.findFirst({
    where: {
      id: contractId,
      companyId: user.companyId,
      status: "PUBLISHED",
      hotelId: { in: allowed },
    },
    select: {
      id: true,
      cancellationPolicies: {
        orderBy: { daysBefore: "desc" },
        select: { daysBefore: true, chargeType: true, chargeValue: true, description: true },
      },
      childPolicies: {
        orderBy: { ageFrom: "asc" },
        select: {
          label: true,
          ageFrom: true,
          ageTo: true,
          freeInSharing: true,
          maxFreePerRoom: true,
          extraBedAllowed: true,
          chargePercentage: true,
        },
      },
      stopSales: {
        where: { dateTo: { gte: new Date() } },
        orderBy: { dateFrom: "asc" },
        select: { dateFrom: true, dateTo: true, roomType: { select: { name: true } } },
      },
      seasons: { select: { minimumStay: true } },
      // An offer with no partner rows is open to everyone; one with rows is
      // only for the partners named on it, so an untargeted sheet would
      // advertise a deal this partner cannot have.
      specialOffers: {
        where: {
          active: true,
          OR: [
            { targetedPartners: { none: {} } },
            { targetedPartners: { some: { tourOperatorId: user.tourOperatorId } } },
          ],
        },
        orderBy: { sortOrder: "asc" },
        select: {
          name: true,
          offerType: true,
          validFrom: true,
          validTo: true,
          bookByDate: true,
          minimumNights: true,
          discountType: true,
          discountValue: true,
          stayNights: true,
          payNights: true,
          _count: { select: { targetedPartners: true } },
        },
      },
    },
  });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const loaded = await loadContractRateGrid(contractId, user.companyId);
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const company = await db.company.findUnique({
    where: { id: user.companyId },
    select: { name: true },
  });

  const doc = generateRatesDoc(loaded.grid, {
    hotelName: loaded.contract.hotelName,
    contractCode: loaded.contract.code,
    contractName: loaded.contract.name,
    currency: loaded.contract.currencyCode,
    rateBasis: RATE_BASIS_LABELS[loaded.contract.rateBasis] ?? loaded.contract.rateBasis,
    companyName: company?.name ?? "",
  });

  // A grid of rates is not sellable on its own — the terms go in the same file.
  const minimumStay = Math.max(0, ...contract.seasons.map((s) => s.minimumStay ?? 0));
  appendPartnerRateSheetAnnex(doc, {
    contractCode: loaded.contract.code,
    hotelName: loaded.contract.hotelName,
    currencyCode: loaded.contract.currencyCode,
    minimumStayNote: minimumStay > 0 ? `Minimum stay: ${minimumStay} nights.` : null,
    cancellation: contract.cancellationPolicies.map((c) => ({
      daysBefore: c.daysBefore,
      chargeType: c.chargeType,
      chargeValue: Number(c.chargeValue),
      description: c.description,
    })),
    childPolicies: contract.childPolicies,
    stopSales: contract.stopSales.map((s) => ({
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      roomType: s.roomType?.name ?? null,
    })),
    specialOffers: contract.specialOffers.map((o) => ({
      name: o.name,
      offerType: o.offerType,
      validFrom: o.validFrom,
      validTo: o.validTo,
      bookByDate: o.bookByDate,
      minimumNights: o.minimumNights,
      discountType: o.discountType,
      discountValue: o.discountValue === null ? null : Number(o.discountValue),
      stayNights: o.stayNights,
      payNights: o.payNights,
      targeted: o._count.targetedPartners > 0,
    })),
  });

  const pdf = Buffer.from(doc.output("arraybuffer"));

  await auditPartner("DOCUMENT_DOWNLOADED", {
    companyId: user.companyId,
    tourOperatorId: user.tourOperatorId,
    userId: user.id,
    entityType: "RateSheet",
    entityId: contractId,
    request: req,
    metadata: { contractCode: loaded.contract.code },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rates-${loaded.contract.code.replace(/\//g, "-")}-${format(new Date(), "yyyyMMdd")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
