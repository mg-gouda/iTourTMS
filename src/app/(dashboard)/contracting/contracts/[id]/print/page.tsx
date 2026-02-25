"use client";

import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  CONTRACT_STATUS_LABELS,
  RATE_BASIS_LABELS,
  SUPPLEMENT_TYPE_LABELS,
  SUPPLEMENT_VALUE_TYPE_LABELS,
  OFFER_TYPE_LABELS,
  CHILD_AGE_CATEGORY_LABELS,
  CANCELLATION_CHARGE_TYPE_LABELS,
} from "@/lib/constants/contracting";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { formatSeasonLabel } from "@/lib/utils";
import type { AppRouter } from "@/server/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouterOutput = inferRouterOutputs<AppRouter>;
type ExportContract = RouterOutput["contracting"]["contract"]["getForExport"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

function fmtDecimal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return formatCurrency(Number(v));
}

// ---------------------------------------------------------------------------
// Print Page
// ---------------------------------------------------------------------------

export default function ContractPrintPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;
  const printTriggered = useRef(false);

  const { data: contract, isLoading } =
    trpc.contracting.contract.getForExport.useQuery({ id: contractId });

  useEffect(() => {
    if (contract && !printTriggered.current) {
      printTriggered.current = true;
      // Small delay to ensure render completes
      setTimeout(() => window.print(), 500);
    }
  }, [contract]);

  if (isLoading || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading contract data...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6 text-sm">
      {/* Toolbar — hidden when printing */}
      <div className="mb-6 flex items-center gap-3" data-print="hide">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="mr-1 h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      {/* ─── Section 1: Contract Header ──────────────── */}
      <ContractHeader contract={contract} />

      {/* ─── Section 2: Seasons ──────────────────────── */}
      <SeasonsTable contract={contract} />

      {/* ─── Section 3: Room Types & Meal Bases ─────── */}
      <RoomTypesAndMealBases contract={contract} />

      {/* ─── Section 4: Rate Sheet ───────────────────── */}
      <RateSheet contract={contract} />

      {/* ─── Section 5: Supplements ──────────────────── */}
      <SupplementsTable contract={contract} />

      {/* ─── Section 6: Special Offers ───────────────── */}
      <SpecialOffersTable contract={contract} />

      {/* ─── Section 7: Allotments ───────────────────── */}
      <AllotmentsTable contract={contract} />

      {/* ─── Section 8: Child Policies ───────────────── */}
      <ChildPoliciesTable contract={contract} />

      {/* ─── Section 9: Cancellation Policies ────────── */}
      <CancellationTable contract={contract} />

      {/* ─── Section 10: Terms & Notes ───────────────── */}
      <TermsAndNotes contract={contract} />

      {/* Footer */}
      <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
        Generated on {format(new Date(), "dd MMM yyyy 'at' HH:mm")} — iTourTMS
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 border-b pb-1 text-lg font-semibold">
      {children}
    </h2>
  );
}

function ContractHeader({ contract }: { contract: ExportContract }) {
  return (
    <div className="print-avoid-break">
      <div className="mb-2 text-center">
        <h1 className="text-2xl font-bold">{contract.name}</h1>
        <p className="text-muted-foreground">
          {contract.hotel.name} — {contract.code} (v{contract.version})
        </p>
      </div>

      <table className="mt-4 w-full">
        <tbody>
          <tr>
            <td className="font-semibold w-[160px]">Status</td>
            <td>{CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}</td>
            <td className="font-semibold w-[160px]">Rate Basis</td>
            <td>{RATE_BASIS_LABELS[contract.rateBasis] ?? contract.rateBasis}</td>
          </tr>
          <tr>
            <td className="font-semibold">Valid From</td>
            <td>{fmtDate(contract.validFrom)}</td>
            <td className="font-semibold">Valid To</td>
            <td>{fmtDate(contract.validTo)}</td>
          </tr>
          <tr>
            <td className="font-semibold">Currency</td>
            <td>{contract.baseCurrency.code} — {contract.baseCurrency.name}</td>
            <td className="font-semibold">Min Stay</td>
            <td>{contract.minimumStay} night{contract.minimumStay !== 1 ? "s" : ""}</td>
          </tr>
          <tr>
            <td className="font-semibold">Base Room Type</td>
            <td>{contract.baseRoomType.name}</td>
            <td className="font-semibold">Base Meal</td>
            <td>{contract.baseMealBasis.name}</td>
          </tr>
          {contract.maximumStay && (
            <tr>
              <td className="font-semibold">Max Stay</td>
              <td>{contract.maximumStay} nights</td>
              <td />
              <td />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SeasonsTable({ contract }: { contract: ExportContract }) {
  if (contract.seasons.length === 0) return null;
  return (
    <div className="print-avoid-break">
      <SectionTitle>Seasons</SectionTitle>
      <table>
        <thead>
          <tr>
            <th>Season</th>
            <th>Date From</th>
            <th>Date To</th>
            <th>Release Days</th>
            <th>Min Stay</th>
          </tr>
        </thead>
        <tbody>
          {contract.seasons.map((s) => (
            <tr key={s.id}>
              <td>{formatSeasonLabel(s.dateFrom, s.dateTo)}</td>
              <td>{fmtDate(s.dateFrom)}</td>
              <td>{fmtDate(s.dateTo)}</td>
              <td>{s.releaseDays}</td>
              <td>{s.minimumStay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoomTypesAndMealBases({ contract }: { contract: ExportContract }) {
  return (
    <div className="print-avoid-break">
      <SectionTitle>Room Types & Meal Bases</SectionTitle>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="mb-2 font-semibold">Room Types</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Base</th>
              </tr>
            </thead>
            <tbody>
              {contract.roomTypes.map((rt) => (
                <tr key={rt.id}>
                  <td>{rt.roomType.name}</td>
                  <td className="font-mono">{rt.roomType.code}</td>
                  <td>{rt.isBase ? "Yes" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Meal Bases</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Base</th>
              </tr>
            </thead>
            <tbody>
              {contract.mealBases.map((mb) => (
                <tr key={mb.id}>
                  <td>{mb.mealBasis.name}</td>
                  <td className="font-mono">{mb.mealBasis.mealCode}</td>
                  <td>{mb.isBase ? "Yes" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RateSheet({ contract }: { contract: ExportContract }) {
  if (contract.baseRates.length === 0) return null;

  // Build season-indexed rate map
  const rateMap = new Map<string, typeof contract.baseRates[number]>();
  for (const br of contract.baseRates) {
    rateMap.set(br.season.id, br);
  }

  return (
    <div className="print-break-before print-avoid-break">
      <SectionTitle>Base Rate Sheet</SectionTitle>
      <table>
        <thead>
          <tr>
            <th>Season</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Single</th>
            <th className="text-right">Double</th>
            <th className="text-right">Triple</th>
          </tr>
        </thead>
        <tbody>
          {contract.seasons.map((season) => {
            const rate = rateMap.get(season.id);
            return (
              <tr key={season.id}>
                <td>
                  {formatSeasonLabel(season.dateFrom, season.dateTo)}
                </td>
                <td className="text-right font-mono">{rate ? fmtDecimal(rate.rate) : "—"}</td>
                <td className="text-right font-mono">{rate ? fmtDecimal(rate.singleRate) : "—"}</td>
                <td className="text-right font-mono">{rate ? fmtDecimal(rate.doubleRate) : "—"}</td>
                <td className="text-right font-mono">{rate ? fmtDecimal(rate.tripleRate) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-muted-foreground">
        All rates in {contract.baseCurrency.code}, {RATE_BASIS_LABELS[contract.rateBasis]?.toLowerCase() ?? contract.rateBasis} per night.
      </p>
    </div>
  );
}

function SupplementsTable({ contract }: { contract: ExportContract }) {
  if (contract.supplements.length === 0) return null;
  return (
    <div className="print-break-before print-avoid-break">
      <SectionTitle>Supplements</SectionTitle>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Room Type</th>
            <th>Meal Basis</th>
            <th>Label</th>
            <th className="text-right">Value</th>
            <th>Per-P</th>
            <th>Per-N</th>
          </tr>
        </thead>
        <tbody>
          {contract.supplements.map((s) => (
            <tr key={s.id}>
              <td>{SUPPLEMENT_TYPE_LABELS[s.supplementType] ?? s.supplementType}</td>
              <td>{s.roomType?.name ?? "—"}</td>
              <td>{s.mealBasis?.name ?? "—"}</td>
              <td>{s.label ?? "—"}</td>
              <td className="text-right font-mono">
                {s.isReduction ? "-" : ""}
                {fmtDecimal(s.value)}
                {s.valueType === "PERCENTAGE" ? "%" : ""}
              </td>
              <td>{s.perPerson ? "Yes" : ""}</td>
              <td>{s.perNight ? "Yes" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpecialOffersTable({ contract }: { contract: ExportContract }) {
  if (contract.specialOffers.length === 0) return null;
  return (
    <div className="print-avoid-break">
      <SectionTitle>Special Offers</SectionTitle>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Discount</th>
            <th>Valid From</th>
            <th>Valid To</th>
            <th>Book By</th>
            <th>Min Nights</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {contract.specialOffers.map((so) => (
            <tr key={so.id}>
              <td className="font-medium">{so.name}</td>
              <td>{OFFER_TYPE_LABELS[so.offerType] ?? so.offerType}</td>
              <td className="font-mono">
                {so.discountType === "PERCENTAGE"
                  ? `${Number(so.discountValue)}%`
                  : fmtDecimal(so.discountValue)}
              </td>
              <td>{fmtDate(so.validFrom)}</td>
              <td>{fmtDate(so.validTo)}</td>
              <td>{fmtDate(so.bookByDate)}</td>
              <td>{so.minimumNights}</td>
              <td>{so.active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllotmentsTable({ contract }: { contract: ExportContract }) {
  if (contract.allotments.length === 0) return null;
  return (
    <div className="print-avoid-break">
      <SectionTitle>Allotments</SectionTitle>
      <table>
        <thead>
          <tr>
            <th>Season</th>
            <th>Room Type</th>
            <th className="text-right">Total Rooms</th>
            <th>Free Sale</th>
          </tr>
        </thead>
        <tbody>
          {contract.allotments.map((a) => (
            <tr key={a.id}>
              <td>{formatSeasonLabel(a.season.dateFrom, a.season.dateTo)}</td>
              <td>{a.roomType.name}</td>
              <td className="text-right">{a.totalRooms}</td>
              <td>{a.freeSale ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChildPoliciesTable({ contract }: { contract: ExportContract }) {
  if (contract.childPolicies.length === 0) return null;
  return (
    <div className="print-avoid-break">
      <SectionTitle>Child Policies</SectionTitle>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Age Range</th>
            <th>Label</th>
            <th>Free in Sharing</th>
            <th>Max Free/Room</th>
            <th>Extra Bed</th>
            <th>Meals Incl.</th>
          </tr>
        </thead>
        <tbody>
          {contract.childPolicies.map((cp) => (
            <tr key={cp.id}>
              <td className="font-medium">{CHILD_AGE_CATEGORY_LABELS[cp.category] ?? cp.category}</td>
              <td>{cp.ageFrom}–{cp.ageTo} years</td>
              <td>{cp.label ?? "—"}</td>
              <td>{cp.freeInSharing ? "Yes" : "No"}</td>
              <td>{cp.maxFreePerRoom}</td>
              <td>{cp.extraBedAllowed ? "Yes" : "No"}</td>
              <td>{cp.mealsIncluded ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CancellationTable({ contract }: { contract: ExportContract }) {
  if (contract.cancellationPolicies.length === 0) return null;

  function formatCharge(cp: ExportContract["cancellationPolicies"][number]): string {
    if (cp.chargeType === "FIRST_NIGHT") return "First Night Rate";
    if (cp.chargeType === "PERCENTAGE") return `${Number(cp.chargeValue)}%`;
    return fmtDecimal(cp.chargeValue);
  }

  return (
    <div className="print-avoid-break">
      <SectionTitle>Cancellation Policy</SectionTitle>
      <table>
        <thead>
          <tr>
            <th>Days Before Check-in</th>
            <th>Charge Type</th>
            <th>Charge</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {contract.cancellationPolicies.map((cp) => (
            <tr key={cp.id}>
              <td>{cp.daysBefore}+ days</td>
              <td>{CANCELLATION_CHARGE_TYPE_LABELS[cp.chargeType] ?? cp.chargeType}</td>
              <td className="font-mono">{formatCharge(cp)}</td>
              <td>{cp.description ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TermsAndNotes({ contract }: { contract: ExportContract }) {
  if (!contract.terms && !contract.internalNotes && !contract.hotelNotes) return null;
  return (
    <div className="print-break-before">
      <SectionTitle>Terms & Notes</SectionTitle>
      {contract.terms && (
        <div className="mb-4 print-avoid-break">
          <h3 className="mb-1 font-semibold">Contract Terms</h3>
          <p className="whitespace-pre-wrap text-sm">{contract.terms}</p>
        </div>
      )}
      {contract.hotelNotes && (
        <div className="mb-4 print-avoid-break">
          <h3 className="mb-1 font-semibold">Hotel Notes</h3>
          <p className="whitespace-pre-wrap text-sm">{contract.hotelNotes}</p>
        </div>
      )}
      {contract.internalNotes && (
        <div className="mb-4 print-avoid-break">
          <h3 className="mb-1 font-semibold">Internal Notes</h3>
          <p className="whitespace-pre-wrap text-sm">{contract.internalNotes}</p>
        </div>
      )}
    </div>
  );
}
