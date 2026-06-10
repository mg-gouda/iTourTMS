import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { OPS_COMPONENT_TYPE_LABELS, OPS_CLIENT_TYPE_LABELS } from "@/lib/constants/tour-ops";

export interface QuotationPdfData {
  code: string;
  status: string;
  clientType: string;
  validUntil?: Date | string | null;
  createdAt: Date | string;
  file: {
    code: string;
    guestName?: string | null;
    guestEmail?: string | null;
    travelFrom: Date | string;
    travelTo: Date | string;
    adults: number;
    children: number;
    infants: number;
  };
  package: {
    name: string;
    baseCurrency: string;
    components: Array<{
      type: string;
      description: string;
      qty: number;
      unitCost: number;
      currency: string;
      totalCost: number;
      markupType: string;
      markupValue: number;
      sellingPrice: number;
      mgmtFeeType?: string;
      mgmtFeeValue?: number;
      mgmtFeeAmount?: number;
      serviceDate?: Date | string | null;
    }>;
  };
  totalCost: number;
  totalSelling: number;
  totalMgmtFees?: number;
  margin: number;
  marginPct: number;
  packageMarkupType?: string | null;
  packageMarkupValue?: number | null;
  notes?: string | null;
  terms?: string | null;
  companyName?: string;
}

const PRIMARY: [number, number, number] = [41, 98, 255];
const GREY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];

export function generateQuotationPdf(data: QuotationPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName ?? "Tour Operations", margin, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Tour Quotation", pageW - margin, 13, { align: "right" });

  // Title row
  let y = 30;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Quotation ${data.code}`, margin, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(`File: ${data.file.code}`, pageW - margin, y, { align: "right" });
  y += 6;
  doc.setTextColor(...GREY);
  doc.text(
    `Issued: ${format(new Date(data.createdAt), "dd MMM yyyy")}${data.validUntil ? `  ·  Valid until: ${format(new Date(data.validUntil), "dd MMM yyyy")}` : ""}`,
    margin,
    y
  );
  y += 8;

  // Guest / Travel info box
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const infoLeft = [
    { label: "Client", value: data.file.guestName ?? OPS_CLIENT_TYPE_LABELS[data.clientType as keyof typeof OPS_CLIENT_TYPE_LABELS] ?? data.clientType },
    { label: "Email", value: data.file.guestEmail ?? "—" },
    { label: "Travel From", value: format(new Date(data.file.travelFrom), "dd MMM yyyy") },
    { label: "Travel To", value: format(new Date(data.file.travelTo), "dd MMM yyyy") },
  ];
  const infoRight = [
    { label: "Adults", value: String(data.file.adults) },
    { label: "Children", value: String(data.file.children) },
    { label: "Infants", value: String(data.file.infants) },
    { label: "Package", value: data.package.name },
  ];

  infoLeft.forEach((row, i) => {
    const iy = y + 5 + i * 5.5;
    doc.setFont("helvetica", "bold");
    doc.text(row.label, margin + 3, iy);
    doc.setFont("helvetica", "normal");
    doc.text(row.value, margin + 35, iy);
  });
  infoRight.forEach((row, i) => {
    const iy = y + 5 + i * 5.5;
    const halfX = pageW / 2 + 3;
    doc.setFont("helvetica", "bold");
    doc.text(row.label, halfX, iy);
    doc.setFont("helvetica", "normal");
    doc.text(row.value, halfX + 30, iy);
  });
  y += 34;

  // Components table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Package Components", margin, y);
  y += 4;

  const hasMgmtFees = data.package.components.some((c) => (c.mgmtFeeAmount ?? 0) > 0);
  autoTable(doc, {
    startY: y,
    head: [hasMgmtFees
      ? ["#", "Type", "Description", "Date", "Qty", "Unit Cost", "Total Cost", "Markup", "Selling", "Mgmt Fee"]
      : ["#", "Type", "Description", "Date", "Qty", "Unit Cost", "Total Cost", "Markup", "Selling Price"]],
    body: data.package.components.map((c, i) => {
      const row = [
        String(i + 1),
        OPS_COMPONENT_TYPE_LABELS[c.type as keyof typeof OPS_COMPONENT_TYPE_LABELS] ?? c.type,
        c.description,
        c.serviceDate ? format(new Date(c.serviceDate), "dd MMM") : "—",
        String(Number(c.qty)),
        `${c.currency} ${Number(c.unitCost).toLocaleString()}`,
        `$${Number(c.totalCost).toLocaleString()}`,
        `${Number(c.markupValue)}${c.markupType === "PERCENTAGE" ? "%" : " fixed"}`,
        `$${Number(c.sellingPrice).toLocaleString()}`,
      ];
      if (hasMgmtFees) row.push(Number(c.mgmtFeeAmount ?? 0) > 0 ? `$${Number(c.mgmtFeeAmount).toLocaleString()}` : "—");
      return row;
    }),
    foot: [hasMgmtFees
      ? ["", "", "", "", "", "Total Cost", `$${data.totalCost.toLocaleString()}`, "Mgmt Fees", `$${(data.totalMgmtFees ?? 0).toLocaleString()}`, `Total: $${data.totalSelling.toLocaleString()}`]
      : ["", "", "", "", "", "Total Cost", `$${data.totalCost.toLocaleString()}`, "Selling", `$${data.totalSelling.toLocaleString()}`]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: PRIMARY, textColor: 255 },
    footStyles: { fillColor: LIGHT, textColor: [0, 0, 0], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Totals summary
  const summaryRows: [string, string][] = [
    ["Total Cost", `$${data.totalCost.toLocaleString()}`],
  ];
  if ((data.totalMgmtFees ?? 0) > 0) {
    summaryRows.push(["Management Fees", `$${(data.totalMgmtFees ?? 0).toLocaleString()}`]);
  }
  summaryRows.push(
    ["Total Selling Price", `$${data.totalSelling.toLocaleString()}`],
    ["Margin", `$${data.margin.toLocaleString()}`],
    ["Margin %", `${Number(data.marginPct).toFixed(1)}%`],
  );
  autoTable(doc, {
    startY: finalY,
    body: summaryRows,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 }, 1: { halign: "right" } },
    styles: { fontSize: 9 },
    tableWidth: 80,
    margin: { left: pageW - margin - 80 },
  });

  // Notes / Terms
  const notesY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, notesY);
    doc.setFont("helvetica", "normal");
    doc.text(data.notes, margin, notesY + 5, { maxWidth: pageW - margin * 2 });
  }
  if (data.terms) {
    const termsY = notesY + (data.notes ? 14 : 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions:", margin, termsY);
    doc.setFont("helvetica", "normal");
    doc.text(data.terms, margin, termsY + 5, { maxWidth: pageW - margin * 2 });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      `Page ${i} of ${pageCount}  ·  ${data.code}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc;
}
