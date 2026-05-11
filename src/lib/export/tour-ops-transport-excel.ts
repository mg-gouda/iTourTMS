import * as XLSX from "xlsx";
import { OPS_VEHICLE_TYPE_LABELS } from "@/lib/constants/tour-ops";
import type { OpsVehicleType } from "@prisma/client";

const VEHICLE_TYPES: OpsVehicleType[] = ["SEDAN", "VAN_11", "VAN_16", "BUS_25", "BUS_45"];

export interface TransportExportRow {
  destinationCode: string;
  destinationName: string;
  routeNameEn: string;
  routeNameAr: string;
  seasonName: string;
  dateFrom: string;
  dateTo: string;
  isActive: boolean;
  rates: Partial<Record<OpsVehicleType, { rentEGP: number; tipEGP: number; repAllowEGP: number }>>;
}

export function exportTransportRatesExcel(
  destinations: {
    code: string;
    nameEn: string;
    routes: {
      nameEn: string;
      nameAr: string | null;
      seasons: {
        name: string;
        dateFrom: Date | string;
        dateTo: Date | string;
        isActive: boolean;
        rates: { vehicleType: OpsVehicleType; rentEGP: number | string | { toString(): string }; tipEGP: number | string | { toString(): string }; repAllowEGP: number | string | { toString(): string } }[];
      }[];
    }[];
  }[]
): ArrayBuffer {
  const headers = [
    "Destination Code", "Destination Name", "Route (EN)", "Route (AR)",
    "Season Name", "Date From", "Date To", "Active",
    ...VEHICLE_TYPES.flatMap((v) => [
      `${OPS_VEHICLE_TYPE_LABELS[v]} Rent`,
      `${OPS_VEHICLE_TYPE_LABELS[v]} Tip`,
      `${OPS_VEHICLE_TYPE_LABELS[v]} Rep Allow`,
    ]),
  ];

  const rows: (string | number | boolean)[][] = [headers];

  for (const dest of destinations) {
    for (const route of dest.routes) {
      if (route.seasons.length === 0) {
        rows.push([
          dest.code, dest.nameEn, route.nameEn, route.nameAr ?? "",
          "", "", "", true,
          ...VEHICLE_TYPES.flatMap(() => [0, 0, 0]),
        ]);
      } else {
        for (const season of route.seasons) {
          const rateMap: Partial<Record<OpsVehicleType, typeof season.rates[number]>> = {};
          for (const r of season.rates) rateMap[r.vehicleType] = r;
          rows.push([
            dest.code, dest.nameEn, route.nameEn, route.nameAr ?? "",
            season.name,
            new Date(season.dateFrom).toISOString().slice(0, 10),
            new Date(season.dateTo).toISOString().slice(0, 10),
            season.isActive,
            ...VEHICLE_TYPES.flatMap((v) => {
              const r = rateMap[v];
              return [Number(r?.rentEGP ?? 0), Number(r?.tipEGP ?? 0), Number(r?.repAllowEGP ?? 0)];
            }),
          ]);
        }
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 30 },
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
    ...VEHICLE_TYPES.flatMap(() => [{ wch: 14 }, { wch: 10 }, { wch: 14 }]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transport Rates");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function exportTransportTemplate(): ArrayBuffer {
  return exportTransportRatesExcel([]);
}
