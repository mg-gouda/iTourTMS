import { format } from "date-fns";

import type { FullRateGridData } from "@/server/services/contracting/rate-calculator";
import { CHILD_AGE_CATEGORY_LABELS } from "@/lib/constants/contracting";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtSeasonDates(dateFrom: string, dateTo: string): string {
  return `${format(new Date(dateFrom), "dd MMM")} — ${format(new Date(dateTo), "dd MMM yyyy")}`;
}

function fmtDecimal(v: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportRatesGridToExcel(
  grid: FullRateGridData,
  contractCode: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Rate Grid ─────────────────────────────
  const header: string[] = ["Room Type", "Occ", "Season"];
  for (const mb of grid.mealBases) {
    const label = mb.suppLabel ? `${mb.name} ${mb.suppLabel}` : mb.name;
    header.push(label);
  }

  const rateRows: (string | number)[][] = [header];

  for (const rt of grid.roomTypes) {
    for (const variant of grid.occupancyVariants) {
      for (const season of grid.seasons) {
        const row: (string | number)[] = [
          rt.name + (rt.isBase ? " (base)" : rt.suppLabel ? ` ${rt.suppLabel}` : ""),
          variant.label,
          fmtSeasonDates(season.dateFrom, season.dateTo),
        ];
        for (const mb of grid.mealBases) {
          const cell = grid.cells.find(
            (c) =>
              c.roomTypeId === rt.id &&
              c.occupancyLabel === variant.label &&
              c.seasonId === season.id &&
              c.mealBasisId === mb.id,
          );
          row.push(cell ? Number(fmtDecimal(cell.adultRate)) : 0);
        }
        rateRows.push(row);
      }
    }
  }

  const wsRates = XLSX.utils.aoa_to_sheet(rateRows);
  wsRates["!cols"] = [
    { wch: 24 },
    { wch: 8 },
    { wch: 26 },
    ...grid.mealBases.map(() => ({ wch: 14 })),
  ];
  XLSX.utils.book_append_sheet(wb, wsRates, "Rate Grid");

  // ─── Sheet 2: Child Rates ──────────────────────────
  if (grid.childRates.length > 0) {
    const childHeader: string[] = ["Category", "Age", "Bedding", "Season"];
    for (const mb of grid.mealBases) {
      childHeader.push(mb.name);
    }

    const childRows: (string | number)[][] = [childHeader];

    // Group unique category/bedding combos
    const seen = new Set<string>();
    const childKeys: { category: string; ageRange: string; bedding: string }[] = [];
    for (const cr of grid.childRates) {
      const key = `${cr.category}|${cr.bedding}`;
      if (!seen.has(key)) {
        seen.add(key);
        childKeys.push({ category: cr.category, ageRange: cr.ageRange, bedding: cr.bedding });
      }
    }

    for (const ck of childKeys) {
      for (const season of grid.seasons) {
        const row: (string | number)[] = [
          CHILD_AGE_CATEGORY_LABELS[ck.category] ?? ck.category,
          ck.ageRange,
          ck.bedding,
          fmtSeasonDates(season.dateFrom, season.dateTo),
        ];
        for (const mb of grid.mealBases) {
          const cr = grid.childRates.find(
            (c) =>
              c.category === ck.category &&
              c.bedding === ck.bedding &&
              c.seasonId === season.id &&
              c.mealBasisId === mb.id,
          );
          if (cr) {
            row.push(cr.isFree ? "FREE" : Number(fmtDecimal(cr.rate)));
          } else {
            row.push("—");
          }
        }
        childRows.push(row);
      }
    }

    const wsChild = XLSX.utils.aoa_to_sheet(childRows);
    wsChild["!cols"] = [
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 26 },
      ...grid.mealBases.map(() => ({ wch: 14 })),
    ];
    XLSX.utils.book_append_sheet(wb, wsChild, "Child Rates");
  }

  // ─── Download ──────────────────────────────────────
  const filename = `Rates_${contractCode}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
