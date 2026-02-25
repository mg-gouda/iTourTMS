"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeftRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  PenLine,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
  RATE_BASIS_LABELS,
  SUPPLEMENT_TYPE_LABELS,
  SUPPLEMENT_VALUE_TYPE_LABELS,
  CHILD_AGE_CATEGORY_LABELS,
  CANCELLATION_CHARGE_TYPE_LABELS,
  OFFER_TYPE_LABELS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { formatSeasonLabel } from "@/lib/utils";
import type { AppRouter } from "@/server/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouterOutput = inferRouterOutputs<AppRouter>;
type CompareOutput = RouterOutput["contracting"]["contract"]["compare"];
type ContractFull = CompareOutput["contractA"];

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

interface DiffRow<T> {
  status: DiffStatus;
  key: string;
  a?: T;
  b?: T;
  changedFields?: string[];
}

// ---------------------------------------------------------------------------
// Generic diff helper
// ---------------------------------------------------------------------------

function diffArrays<T>(
  aItems: T[],
  bItems: T[],
  getKey: (item: T) => string,
  compareFields: (a: T, b: T) => string[],
): DiffRow<T>[] {
  const aMap = new Map<string, T>();
  const bMap = new Map<string, T>();
  for (const item of aItems) aMap.set(getKey(item), item);
  for (const item of bItems) bMap.set(getKey(item), item);

  const rows: DiffRow<T>[] = [];

  // Items only in A (removed)
  for (const [key, a] of aMap) {
    if (!bMap.has(key)) {
      rows.push({ status: "removed", key, a });
    }
  }

  // Items in both
  for (const [key, a] of aMap) {
    const b = bMap.get(key);
    if (b) {
      const changedFields = compareFields(a, b);
      rows.push({
        status: changedFields.length > 0 ? "changed" : "unchanged",
        key,
        a,
        b,
        changedFields,
      });
    }
  }

  // Items only in B (added)
  for (const [key, b] of bMap) {
    if (!aMap.has(key)) {
      rows.push({ status: "added", key, b });
    }
  }

  return rows;
}

function countChanges<T>(rows: DiffRow<T>[]): number {
  return rows.filter((r) => r.status !== "unchanged").length;
}

// ---------------------------------------------------------------------------
// Row color helpers
// ---------------------------------------------------------------------------

const ROW_BG: Record<DiffStatus, string> = {
  removed: "bg-red-50 dark:bg-red-950/30",
  added: "bg-green-50 dark:bg-green-950/30",
  changed: "bg-amber-50 dark:bg-amber-950/30",
  unchanged: "",
};

const STATUS_BADGE: Record<DiffStatus, { label: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
  removed: { label: "Removed", variant: "destructive" },
  added: { label: "Added", variant: "default" },
  changed: { label: "Changed", variant: "secondary" },
  unchanged: { label: "Same", variant: "outline" },
};

// ---------------------------------------------------------------------------
// Value display helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

function fmtDecimal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(2);
}

function cellClass(field: string, changedFields?: string[]): string {
  if (changedFields?.includes(field)) return "font-semibold text-amber-700 dark:text-amber-400";
  return "";
}

function diffValue(aVal: unknown, bVal: unknown, changed: boolean): string {
  if (!changed) return String(aVal ?? "—");
  return `${aVal ?? "—"} → ${bVal ?? "—"}`;
}

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function Section({
  title,
  changeCount,
  defaultOpen = true,
  children,
}: {
  title: string;
  changeCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen && changeCount > 0);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <CardTitle className="text-base">{title}</CardTitle>
          {changeCount > 0 ? (
            <Badge variant="secondary">{changeCount} change{changeCount !== 1 ? "s" : ""}</Badge>
          ) : (
            <Badge variant="outline">No changes</Badge>
          )}
        </div>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status badge for diff rows
// ---------------------------------------------------------------------------

function DiffBadge({ status }: { status: DiffStatus }) {
  const info = STATUS_BADGE[status];
  const Icon = status === "removed" ? Minus : status === "added" ? Plus : PenLine;
  return (
    <Badge variant={info.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Metadata Comparison
// ---------------------------------------------------------------------------

function MetadataSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const fields: { label: string; aVal: string; bVal: string }[] = [
    { label: "Name", aVal: a.name, bVal: b.name },
    { label: "Code", aVal: a.code, bVal: b.code },
    { label: "Status", aVal: CONTRACT_STATUS_LABELS[a.status] ?? a.status, bVal: CONTRACT_STATUS_LABELS[b.status] ?? b.status },
    { label: "Hotel", aVal: a.hotel.name, bVal: b.hotel.name },
    { label: "Valid From", aVal: fmtDate(a.validFrom), bVal: fmtDate(b.validFrom) },
    { label: "Valid To", aVal: fmtDate(a.validTo), bVal: fmtDate(b.validTo) },
    { label: "Rate Basis", aVal: RATE_BASIS_LABELS[a.rateBasis] ?? a.rateBasis, bVal: RATE_BASIS_LABELS[b.rateBasis] ?? b.rateBasis },
    { label: "Currency", aVal: a.baseCurrency.code, bVal: b.baseCurrency.code },
    { label: "Base Room", aVal: a.baseRoomType.name, bVal: b.baseRoomType.name },
    { label: "Base Meal", aVal: a.baseMealBasis.name, bVal: b.baseMealBasis.name },
    { label: "Min Stay", aVal: String(a.minimumStay), bVal: String(b.minimumStay) },
    { label: "Max Stay", aVal: a.maximumStay ? String(a.maximumStay) : "—", bVal: b.maximumStay ? String(b.maximumStay) : "—" },
  ];

  const changeCount = fields.filter((f) => f.aVal !== f.bVal).length;

  return (
    <Section title="Contract Details" changeCount={changeCount}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Field</TableHead>
            <TableHead>Contract A</TableHead>
            <TableHead>Contract B</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((f) => {
            const changed = f.aVal !== f.bVal;
            return (
              <TableRow key={f.label} className={changed ? ROW_BG.changed : ""}>
                <TableCell className="font-medium">{f.label}</TableCell>
                <TableCell className={changed ? "text-red-600 dark:text-red-400 line-through" : ""}>{f.aVal}</TableCell>
                <TableCell className={changed ? "text-green-600 dark:text-green-400 font-semibold" : ""}>{f.bVal}</TableCell>
                <TableCell>{changed && <DiffBadge status="changed" />}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Seasons Section
// ---------------------------------------------------------------------------

function SeasonsSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const rows = diffArrays(
    a.seasons,
    b.seasons,
    (s) => s.id,
    (sa, sb) => {
      const changed: string[] = [];
      if (fmtDate(sa.dateFrom) !== fmtDate(sb.dateFrom)) changed.push("dateFrom");
      if (fmtDate(sa.dateTo) !== fmtDate(sb.dateTo)) changed.push("dateTo");
      if (sa.releaseDays !== sb.releaseDays) changed.push("releaseDays");
      if (sa.minimumStay !== sb.minimumStay) changed.push("minimumStay");
      return changed;
    },
  );

  return (
    <Section title="Seasons" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead>Date From</TableHead>
            <TableHead>Date To</TableHead>
            <TableHead>Release Days</TableHead>
            <TableHead>Min Stay</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">All seasons identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              const cf = r.changedFields ?? [];
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell>{formatSeasonLabel(item.dateFrom, item.dateTo)}</TableCell>
                  <TableCell className={cellClass("dateFrom", cf)}>
                    {r.status === "changed" && cf.includes("dateFrom")
                      ? `${fmtDate(r.a!.dateFrom)} → ${fmtDate(r.b!.dateFrom)}`
                      : fmtDate(item.dateFrom)}
                  </TableCell>
                  <TableCell className={cellClass("dateTo", cf)}>
                    {r.status === "changed" && cf.includes("dateTo")
                      ? `${fmtDate(r.a!.dateTo)} → ${fmtDate(r.b!.dateTo)}`
                      : fmtDate(item.dateTo)}
                  </TableCell>
                  <TableCell className={cellClass("releaseDays", cf)}>
                    {r.status === "changed" && cf.includes("releaseDays")
                      ? `${r.a!.releaseDays} → ${r.b!.releaseDays}`
                      : item.releaseDays}
                  </TableCell>
                  <TableCell className={cellClass("minimumStay", cf)}>
                    {r.status === "changed" && cf.includes("minimumStay")
                      ? `${r.a!.minimumStay} → ${r.b!.minimumStay}`
                      : item.minimumStay}
                  </TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Room Types Section
// ---------------------------------------------------------------------------

function RoomTypesSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const rows = diffArrays(
    a.roomTypes,
    b.roomTypes,
    (rt) => rt.roomTypeId,
    (ra, rb) => {
      const changed: string[] = [];
      if (ra.isBase !== rb.isBase) changed.push("isBase");
      return changed;
    },
  );

  return (
    <Section title="Room Types" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room Type</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Is Base</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">All room types identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell>{item.roomType.name}</TableCell>
                  <TableCell className="font-mono">{item.roomType.code}</TableCell>
                  <TableCell>{item.isBase ? "Yes" : "No"}</TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Meal Bases Section
// ---------------------------------------------------------------------------

function MealBasesSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const rows = diffArrays(
    a.mealBases,
    b.mealBases,
    (mb) => mb.mealBasisId,
    (ma, mb2) => {
      const changed: string[] = [];
      if (ma.isBase !== mb2.isBase) changed.push("isBase");
      return changed;
    },
  );

  return (
    <Section title="Meal Bases" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Meal Basis</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Is Base</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">All meal bases identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell>{item.mealBasis.name}</TableCell>
                  <TableCell className="font-mono">{item.mealBasis.mealCode}</TableCell>
                  <TableCell>{item.isBase ? "Yes" : "No"}</TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Base Rates Section
// ---------------------------------------------------------------------------

function BaseRatesSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const rows = diffArrays(
    a.baseRates,
    b.baseRates,
    (br) => br.season.id,
    (ba, bb) => {
      const changed: string[] = [];
      if (fmtDecimal(ba.rate) !== fmtDecimal(bb.rate)) changed.push("rate");
      if (fmtDecimal(ba.singleRate) !== fmtDecimal(bb.singleRate)) changed.push("singleRate");
      if (fmtDecimal(ba.doubleRate) !== fmtDecimal(bb.doubleRate)) changed.push("doubleRate");
      if (fmtDecimal(ba.tripleRate) !== fmtDecimal(bb.tripleRate)) changed.push("tripleRate");
      return changed;
    },
  );

  return (
    <Section title="Base Rates" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Single</TableHead>
            <TableHead className="text-right">Double</TableHead>
            <TableHead className="text-right">Triple</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">All base rates identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              const cf = r.changedFields ?? [];
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell>{formatSeasonLabel(item.season.dateFrom, item.season.dateTo)}</TableCell>
                  <TableCell className={`text-right ${cellClass("rate", cf)}`}>
                    {r.status === "changed" && cf.includes("rate")
                      ? `${fmtDecimal(r.a!.rate)} → ${fmtDecimal(r.b!.rate)}`
                      : fmtDecimal(item.rate)}
                  </TableCell>
                  <TableCell className={`text-right ${cellClass("singleRate", cf)}`}>
                    {r.status === "changed" && cf.includes("singleRate")
                      ? `${fmtDecimal(r.a!.singleRate)} → ${fmtDecimal(r.b!.singleRate)}`
                      : fmtDecimal(item.singleRate)}
                  </TableCell>
                  <TableCell className={`text-right ${cellClass("doubleRate", cf)}`}>
                    {r.status === "changed" && cf.includes("doubleRate")
                      ? `${fmtDecimal(r.a!.doubleRate)} → ${fmtDecimal(r.b!.doubleRate)}`
                      : fmtDecimal(item.doubleRate)}
                  </TableCell>
                  <TableCell className={`text-right ${cellClass("tripleRate", cf)}`}>
                    {r.status === "changed" && cf.includes("tripleRate")
                      ? `${fmtDecimal(r.a!.tripleRate)} → ${fmtDecimal(r.b!.tripleRate)}`
                      : fmtDecimal(item.tripleRate)}
                  </TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Supplements Section
// ---------------------------------------------------------------------------

function SupplementsSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const getKey = (s: ContractFull["supplements"][number]) =>
    `${s.supplementType}|${s.roomTypeId ?? ""}|${s.mealBasisId ?? ""}|${s.label ?? ""}|${s.childPosition ?? ""}|${s.forChildCategory ?? ""}`;

  const rows = diffArrays(
    a.supplements,
    b.supplements,
    getKey,
    (sa, sb) => {
      const changed: string[] = [];
      if (sa.valueType !== sb.valueType) changed.push("valueType");
      if (fmtDecimal(sa.value) !== fmtDecimal(sb.value)) changed.push("value");
      if (sa.isReduction !== sb.isReduction) changed.push("isReduction");
      if (sa.perPerson !== sb.perPerson) changed.push("perPerson");
      if (sa.perNight !== sb.perNight) changed.push("perNight");
      if (sa.label !== sb.label) changed.push("label");
      return changed;
    },
  );

  return (
    <Section title="Supplements" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Meal</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Per-P</TableHead>
            <TableHead>Per-N</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">All supplements identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              const cf = r.changedFields ?? [];
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell>{SUPPLEMENT_TYPE_LABELS[item.supplementType] ?? item.supplementType}</TableCell>
                  <TableCell>{item.roomType?.name ?? "—"}</TableCell>
                  <TableCell>{item.mealBasis?.name ?? "—"}</TableCell>
                  <TableCell className={`text-right ${cellClass("value", cf)}`}>
                    {r.status === "changed" && cf.includes("value")
                      ? `${fmtDecimal(r.a!.value)} → ${fmtDecimal(r.b!.value)}`
                      : fmtDecimal(item.value)}
                    {item.valueType === "PERCENTAGE" ? "%" : ""}
                    {item.isReduction ? " (red)" : ""}
                  </TableCell>
                  <TableCell>{item.perPerson ? "Yes" : "No"}</TableCell>
                  <TableCell>{item.perNight ? "Yes" : "No"}</TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Special Offers Section
// ---------------------------------------------------------------------------

function SpecialOffersSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const rows = diffArrays(
    a.specialOffers,
    b.specialOffers,
    (so) => so.name,
    (sa, sb) => {
      const changed: string[] = [];
      if (sa.offerType !== sb.offerType) changed.push("offerType");
      if (sa.discountType !== sb.discountType) changed.push("discountType");
      if (fmtDecimal(sa.discountValue) !== fmtDecimal(sb.discountValue)) changed.push("discountValue");
      if (fmtDate(sa.validFrom) !== fmtDate(sb.validFrom)) changed.push("validFrom");
      if (fmtDate(sa.validTo) !== fmtDate(sb.validTo)) changed.push("validTo");
      if (sa.minimumNights !== sb.minimumNights) changed.push("minimumNights");
      if (sa.active !== sb.active) changed.push("active");
      if (sa.stayNights !== sb.stayNights) changed.push("stayNights");
      if (sa.payNights !== sb.payNights) changed.push("payNights");
      return changed;
    },
  );

  return (
    <Section title="Special Offers" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Valid From</TableHead>
            <TableHead>Valid To</TableHead>
            <TableHead>Min Nights</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">All special offers identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              const cf = r.changedFields ?? [];
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{OFFER_TYPE_LABELS[item.offerType] ?? item.offerType}</TableCell>
                  <TableCell className={cellClass("discountValue", cf)}>
                    {r.status === "changed" && cf.includes("discountValue")
                      ? `${fmtDecimal(r.a!.discountValue)} → ${fmtDecimal(r.b!.discountValue)}`
                      : fmtDecimal(item.discountValue)}
                    {item.discountType === "PERCENTAGE" ? "%" : ""}
                  </TableCell>
                  <TableCell className={cellClass("validFrom", cf)}>
                    {r.status === "changed" && cf.includes("validFrom")
                      ? `${fmtDate(r.a!.validFrom)} → ${fmtDate(r.b!.validFrom)}`
                      : fmtDate(item.validFrom)}
                  </TableCell>
                  <TableCell className={cellClass("validTo", cf)}>
                    {r.status === "changed" && cf.includes("validTo")
                      ? `${fmtDate(r.a!.validTo)} → ${fmtDate(r.b!.validTo)}`
                      : fmtDate(item.validTo)}
                  </TableCell>
                  <TableCell className={cellClass("minimumNights", cf)}>
                    {r.status === "changed" && cf.includes("minimumNights")
                      ? `${r.a!.minimumNights} → ${r.b!.minimumNights}`
                      : item.minimumNights}
                  </TableCell>
                  <TableCell className={cellClass("active", cf)}>
                    {item.active ? "Yes" : "No"}
                  </TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Allotments Section
// ---------------------------------------------------------------------------

function AllotmentsSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const getKey = (al: ContractFull["allotments"][number]) =>
    `${al.season.id}|${al.roomType.code}`;

  const rows = diffArrays(
    a.allotments,
    b.allotments,
    getKey,
    (aa, ab) => {
      const changed: string[] = [];
      if (aa.totalRooms !== ab.totalRooms) changed.push("totalRooms");
      if (aa.freeSale !== ab.freeSale) changed.push("freeSale");
      return changed;
    },
  );

  return (
    <Section title="Allotments" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead>Room Type</TableHead>
            <TableHead className="text-right">Total Rooms</TableHead>
            <TableHead>Free Sale</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">All allotments identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              const cf = r.changedFields ?? [];
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell>{formatSeasonLabel(item.season.dateFrom, item.season.dateTo)}</TableCell>
                  <TableCell>{item.roomType.name}</TableCell>
                  <TableCell className={`text-right ${cellClass("totalRooms", cf)}`}>
                    {r.status === "changed" && cf.includes("totalRooms")
                      ? `${r.a!.totalRooms} → ${r.b!.totalRooms}`
                      : item.totalRooms}
                  </TableCell>
                  <TableCell className={cellClass("freeSale", cf)}>
                    {item.freeSale ? "Yes" : "No"}
                  </TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Stop Sales Section
// ---------------------------------------------------------------------------

function StopSalesSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const getKey = (ss: ContractFull["stopSales"][number]) =>
    `${ss.roomTypeId ?? "all"}|${fmtDate(ss.dateFrom)}|${fmtDate(ss.dateTo)}`;

  const rows = diffArrays(
    a.stopSales,
    b.stopSales,
    getKey,
    (sa, sb) => {
      const changed: string[] = [];
      if (sa.reason !== sb.reason) changed.push("reason");
      return changed;
    },
  );

  return (
    <Section title="Stop Sales" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room Type</TableHead>
            <TableHead>Date From</TableHead>
            <TableHead>Date To</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">All stop sales identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell>{item.roomType?.name ?? "All Rooms"}</TableCell>
                  <TableCell>{fmtDate(item.dateFrom)}</TableCell>
                  <TableCell>{fmtDate(item.dateTo)}</TableCell>
                  <TableCell>{item.reason ?? "—"}</TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Child Policies Section
// ---------------------------------------------------------------------------

function ChildPoliciesSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const rows = diffArrays(
    a.childPolicies,
    b.childPolicies,
    (cp) => cp.category,
    (ca, cb) => {
      const changed: string[] = [];
      if (ca.ageFrom !== cb.ageFrom) changed.push("ageFrom");
      if (ca.ageTo !== cb.ageTo) changed.push("ageTo");
      if (ca.freeInSharing !== cb.freeInSharing) changed.push("freeInSharing");
      if (ca.maxFreePerRoom !== cb.maxFreePerRoom) changed.push("maxFreePerRoom");
      if (ca.extraBedAllowed !== cb.extraBedAllowed) changed.push("extraBedAllowed");
      if (ca.mealsIncluded !== cb.mealsIncluded) changed.push("mealsIncluded");
      return changed;
    },
  );

  return (
    <Section title="Child Policies" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Age Range</TableHead>
            <TableHead>Free in Sharing</TableHead>
            <TableHead>Max Free/Room</TableHead>
            <TableHead>Extra Bed</TableHead>
            <TableHead>Meals Incl.</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">All child policies identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              const cf = r.changedFields ?? [];
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell className="font-medium">{CHILD_AGE_CATEGORY_LABELS[item.category] ?? item.category}</TableCell>
                  <TableCell className={cellClass("ageFrom", cf) || cellClass("ageTo", cf)}>
                    {r.status === "changed" && (cf.includes("ageFrom") || cf.includes("ageTo"))
                      ? `${r.a!.ageFrom}-${r.a!.ageTo} → ${r.b!.ageFrom}-${r.b!.ageTo}`
                      : `${item.ageFrom}-${item.ageTo}`}
                  </TableCell>
                  <TableCell className={cellClass("freeInSharing", cf)}>
                    {item.freeInSharing ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className={cellClass("maxFreePerRoom", cf)}>
                    {r.status === "changed" && cf.includes("maxFreePerRoom")
                      ? `${r.a!.maxFreePerRoom} → ${r.b!.maxFreePerRoom}`
                      : item.maxFreePerRoom}
                  </TableCell>
                  <TableCell className={cellClass("extraBedAllowed", cf)}>
                    {item.extraBedAllowed ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className={cellClass("mealsIncluded", cf)}>
                    {item.mealsIncluded ? "Yes" : "No"}
                  </TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Cancellation Policies Section
// ---------------------------------------------------------------------------

function CancellationPoliciesSection({ a, b }: { a: ContractFull; b: ContractFull }) {
  const rows = diffArrays(
    a.cancellationPolicies,
    b.cancellationPolicies,
    (cp) => String(cp.daysBefore),
    (ca, cb) => {
      const changed: string[] = [];
      if (ca.chargeType !== cb.chargeType) changed.push("chargeType");
      if (fmtDecimal(ca.chargeValue) !== fmtDecimal(cb.chargeValue)) changed.push("chargeValue");
      if (ca.description !== cb.description) changed.push("description");
      return changed;
    },
  );

  function formatCharge(cp: ContractFull["cancellationPolicies"][number]): string {
    if (cp.chargeType === "FIRST_NIGHT") return "First Night";
    if (cp.chargeType === "PERCENTAGE") return `${Number(cp.chargeValue)}%`;
    return `$${fmtDecimal(cp.chargeValue)}`;
  }

  return (
    <Section title="Cancellation Policies" changeCount={countChanges(rows)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Days Before</TableHead>
            <TableHead>Charge Type</TableHead>
            <TableHead>Charge</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter((r) => r.status !== "unchanged").length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">All cancellation policies identical</TableCell>
            </TableRow>
          ) : (
            rows.filter((r) => r.status !== "unchanged").map((r) => {
              const item = r.b ?? r.a!;
              const cf = r.changedFields ?? [];
              return (
                <TableRow key={r.key} className={ROW_BG[r.status]}>
                  <TableCell className="font-mono">{item.daysBefore}+ days</TableCell>
                  <TableCell className={cellClass("chargeType", cf)}>
                    {r.status === "changed" && cf.includes("chargeType")
                      ? `${CANCELLATION_CHARGE_TYPE_LABELS[r.a!.chargeType]} → ${CANCELLATION_CHARGE_TYPE_LABELS[r.b!.chargeType]}`
                      : CANCELLATION_CHARGE_TYPE_LABELS[item.chargeType] ?? item.chargeType}
                  </TableCell>
                  <TableCell className={cellClass("chargeValue", cf)}>
                    {r.status === "changed" && cf.includes("chargeValue")
                      ? `${formatCharge(r.a!)} → ${formatCharge(r.b!)}`
                      : formatCharge(item)}
                  </TableCell>
                  <TableCell>{item.description ?? "—"}</TableCell>
                  <TableCell><DiffBadge status={r.status} /></TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ContractComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idA = searchParams.get("a") ?? "";
  const idB = searchParams.get("b") ?? "";

  const { data, isLoading, error } = trpc.contracting.contract.compare.useQuery(
    { contractIdA: idA, contractIdB: idB },
    { enabled: !!idA && !!idB },
  );

  if (!idA || !idB) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Missing contract IDs. Please provide both &quot;a&quot; and &quot;b&quot; query parameters.
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        Error loading contracts: {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-96" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const { contractA, contractB } = data;

  const handleSwap = () => {
    router.replace(`/contracting/contracts/compare?a=${idB}&b=${idA}`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Contract Comparison</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {contractA.name}{" "}
                <Badge variant="outline" className="ml-1 text-xs">v{contractA.version}</Badge>
              </span>
              <ArrowLeftRight className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {contractB.name}{" "}
                <Badge variant="outline" className="ml-1 text-xs">v{contractB.version}</Badge>
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={handleSwap}>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Swap A / B
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          Removed from A
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          Added in B
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          Changed (A → B)
        </span>
      </div>

      {/* Sections */}
      <MetadataSection a={contractA} b={contractB} />
      <SeasonsSection a={contractA} b={contractB} />
      <BaseRatesSection a={contractA} b={contractB} />
      <RoomTypesSection a={contractA} b={contractB} />
      <MealBasesSection a={contractA} b={contractB} />
      <SupplementsSection a={contractA} b={contractB} />
      <SpecialOffersSection a={contractA} b={contractB} />
      <AllotmentsSection a={contractA} b={contractB} />
      <StopSalesSection a={contractA} b={contractB} />
      <ChildPoliciesSection a={contractA} b={contractB} />
      <CancellationPoliciesSection a={contractA} b={contractB} />
    </div>
  );
}
