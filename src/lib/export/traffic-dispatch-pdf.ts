import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  TT_SERVICE_TYPE_LABELS,
  TT_JOB_STATUS_LABELS,
} from "@/lib/constants/traffic";

export interface DispatchJob {
  code: string;
  serviceType: string;
  status: string;
  serviceDate: string | Date;
  serviceTime: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  guestName: string | null;
  flightNo: string | null;
  pax: number;
  vehicleName: string | null;
  driverName: string | null;
  repName: string | null;
}

export interface DispatchPdfData {
  date: string | Date;
  jobs: DispatchJob[];
  companyName?: string;
}

const PRIMARY = [41, 98, 255] as const;
const DARK = [30, 30, 30] as const;
const MUTED = [120, 120, 120] as const;

export function generateDispatchPdf(data: DispatchPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // ── Header ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 25, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DAILY DISPATCH SHEET", margin, 12);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(data.date), "EEEE, dd MMMM yyyy"), margin, 20);

  if (data.companyName) {
    doc.setFontSize(10);
    doc.text(data.companyName, pageWidth - margin, 12, { align: "right" });
  }

  doc.setFontSize(9);
  doc.text(`${data.jobs.length} job(s)`, pageWidth - margin, 20, { align: "right" });

  // ── Jobs Table ──
  const arrivals = data.jobs.filter((j) => j.serviceType === "ARR");
  const departures = data.jobs.filter((j) => j.serviceType === "DEP");
  const others = data.jobs.filter((j) => j.serviceType !== "ARR" && j.serviceType !== "DEP");

  let y = 30;

  function addSection(label: string, jobs: DispatchJob[]) {
    if (jobs.length === 0) return;

    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} (${jobs.length})`, margin, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Code", "Time", "Type", "Status", "Guest", "Flight", "Pax", "Pickup", "Dropoff", "Vehicle", "Driver", "Rep"]],
      body: jobs.map((j, i) => [
        String(i + 1),
        j.code,
        j.serviceTime ?? "",
        TT_SERVICE_TYPE_LABELS[j.serviceType] ?? j.serviceType,
        TT_JOB_STATUS_LABELS[j.status] ?? j.status,
        j.guestName ?? "",
        j.flightNo ?? "",
        String(j.pax),
        j.pickupLocation ?? "",
        j.dropoffLocation ?? "",
        j.vehicleName ?? "",
        j.driverName ?? "",
        j.repName ?? "",
      ]),
      headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontSize: 6.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 6.5, textColor: [...DARK] },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 7 },
        1: { cellWidth: 18 },
        2: { cellWidth: 14 },
        3: { cellWidth: 18 },
        4: { cellWidth: 16 },
        7: { cellWidth: 10, halign: "center" },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  addSection("Arrivals", arrivals);
  addSection("Departures", departures);
  addSection("Other Services", others);

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 8;
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(
      `Generated on ${format(new Date(), "dd MMM yyyy HH:mm")}`,
      margin,
      footerY,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
  }

  return doc;
}
