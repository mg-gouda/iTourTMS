import * as XLSX from "xlsx";

export function exportSightseeingRatesExcel(
  entries: {
    destinationCode: string;
    nameEn: string;
    nameAr: string | null;
    seasons: {
      name: string;
      dateFrom: Date | string;
      dateTo: Date | string;
      isActive: boolean;
      priceEGP: number | string;
    }[];
  }[]
): ArrayBuffer {
  const headers = ["Destination Code", "Name (EN)", "Name (AR)", "Season Name", "Date From", "Date To", "Active", "Price EGP"];
  const rows: (string | number | boolean)[][] = [headers];

  for (const entry of entries) {
    if (entry.seasons.length === 0) {
      rows.push([entry.destinationCode, entry.nameEn, entry.nameAr ?? "", "", "", "", true, 0]);
    } else {
      for (const season of entry.seasons) {
        rows.push([
          entry.destinationCode, entry.nameEn, entry.nameAr ?? "",
          season.name,
          new Date(season.dateFrom).toISOString().slice(0, 10),
          new Date(season.dateTo).toISOString().slice(0, 10),
          season.isActive,
          Number(season.priceEGP),
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 35 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sightseeing Rates");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function exportSightseeingTemplate(): ArrayBuffer {
  return exportSightseeingRatesExcel([]);
}
