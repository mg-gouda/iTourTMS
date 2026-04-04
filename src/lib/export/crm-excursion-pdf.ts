import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  CRM_PRODUCT_TYPE_LABELS,
  CRM_ACTIVITY_CATEGORY_LABELS,
  CRM_TRIP_MODE_LABELS,
  CRM_AGE_GROUP_LABELS,
  CRM_COST_COMPONENT_TYPE_LABELS,
  CRM_COST_CALC_BASIS_LABELS,
} from "@/lib/constants/crm";

export interface ExcursionPdfData {
  name: string;
  code: string;
  productType: string;
  category: string;
  tripMode: string;
  duration: string | null;
  maxPax: number | null;
  description: string | null;
  inclusions: string | null;
  exclusions: string | null;
  importantNotes: string | null;
  programs: Array<{
    name: string;
    sortOrder: number;
    items: Array<{
      sortOrder: number;
      time: string | null;
      title: string;
      description: string | null;
    }>;
  }>;
  ageGroups: Array<{
    label: string;
    ageGroup: string;
    minAge: number;
    maxAge: number;
  }>;
  costSheets: Array<{
    label: string;
    seasonType: string;
    validFrom: string | Date;
    validTo: string | Date;
    totalCost: unknown;
    currency: string;
    components: Array<{
      componentType: string;
      description: string | null;
      calcBasis: string;
      unitCost: unknown;
      quantity: number;
      totalCost: unknown;
      supplier: { name: string } | null;
    }>;
  }>;
  companyName?: string;
}

const PRIMARY = [41, 98, 255] as const;
const DARK = [30, 30, 30] as const;
const MUTED = [120, 120, 120] as const;

export function generateExcursionPdf(data: ExcursionPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ── Header ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EXCURSION DETAIL", margin, 16);

  doc.setFontSize(14);
  doc.text(data.name, margin, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Code: ${data.code}`, margin, 33);

  if (data.companyName) {
    doc.setFontSize(10);
    doc.text(data.companyName, pageWidth - margin, 16, { align: "right" });
  }

  y = 48;

  // ── Overview ──
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Overview", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);

  const overviewLines = [
    `Type: ${CRM_PRODUCT_TYPE_LABELS[data.productType] ?? data.productType}`,
    `Category: ${CRM_ACTIVITY_CATEGORY_LABELS[data.category] ?? data.category}`,
    `Trip Mode: ${CRM_TRIP_MODE_LABELS[data.tripMode] ?? data.tripMode}`,
    ...(data.duration ? [`Duration: ${data.duration}`] : []),
    ...(data.maxPax ? [`Max Pax: ${data.maxPax}`] : []),
  ];

  for (const line of overviewLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  // ── Description ──
  if (data.description) {
    y += 3;
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Description", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const descLines = doc.splitTextToSize(data.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, y);
    y += descLines.length * 4 + 3;
  }

  // ── Inclusions / Exclusions ──
  for (const [label, text] of [
    ["Inclusions", data.inclusions],
    ["Exclusions", data.exclusions],
    ["Important Notes", data.importantNotes],
  ] as const) {
    if (text) {
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 3;
    }
  }

  // ── Programs ──
  if (data.programs.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Program / Itinerary", margin, y);
    y += 4;

    for (const prog of data.programs) {
      y += 4;
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(prog.name, margin, y);
      y += 2;

      if (prog.items.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["#", "Time", "Activity", "Details"]],
          body: prog.items.map((it, i) => [
            String(i + 1),
            it.time ?? "",
            it.title,
            it.description ?? "",
          ]),
          headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [...DARK] },
          alternateRowStyles: { fillColor: [250, 250, 252] },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 20 } },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }
  }

  // ── Age Groups ──
  if (data.ageGroups.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Age Groups", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Label", "Group", "Min Age", "Max Age"]],
      body: data.ageGroups.map((ag) => [
        ag.label,
        CRM_AGE_GROUP_LABELS[ag.ageGroup] ?? ag.ageGroup,
        String(ag.minAge),
        String(ag.maxAge),
      ]),
      headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [...DARK] },
      alternateRowStyles: { fillColor: [250, 250, 252] },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Cost Sheets ──
  if (data.costSheets.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cost Sheets", margin, y);
    y += 4;

    for (const cs of data.costSheets) {
      if (y > 250) {
        doc.addPage();
        y = margin;
      }

      y += 3;
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${cs.label} (${format(new Date(cs.validFrom), "dd MMM yyyy")} – ${format(new Date(cs.validTo), "dd MMM yyyy")})`,
        margin,
        y,
      );
      y += 2;

      if (cs.components.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Type", "Description", "Supplier", "Basis", "Unit Cost", "Qty", "Total"]],
          body: cs.components.map((c) => [
            CRM_COST_COMPONENT_TYPE_LABELS[c.componentType] ?? c.componentType,
            c.description ?? "",
            c.supplier?.name ?? "",
            CRM_COST_CALC_BASIS_LABELS[c.calcBasis] ?? c.calcBasis,
            Number(c.unitCost ?? 0).toFixed(2),
            String(c.quantity),
            Number(c.totalCost ?? 0).toFixed(2),
          ]),
          foot: [["", "", "", "", "", "TOTAL", `${cs.currency} ${Number(cs.totalCost ?? 0).toFixed(2)}`]],
          headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontSize: 7 },
          bodyStyles: { fontSize: 7, textColor: [...DARK] },
          footStyles: { fillColor: [245, 245, 245], textColor: [...DARK], fontSize: 8, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 252] },
          columnStyles: { 4: { halign: "right" }, 5: { halign: "center" }, 6: { halign: "right" } },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(
      `Generated on ${format(new Date(), "dd MMM yyyy HH:mm")} | ${data.code}`,
      margin,
      footerY,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
  }

  return doc;
}
