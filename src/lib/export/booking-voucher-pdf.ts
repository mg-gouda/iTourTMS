import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  CRM_BOOKING_STATUS_LABELS,
} from "@/lib/constants/crm";

export interface BookingVoucherData {
  code: string;
  status: string;
  travelDate: string | Date;
  paxAdults: number;
  paxChildren: number;
  paxInfants: number;
  totalCost: number;
  totalSelling: number;
  currency: string;
  notes: string | null;
  createdAt: string | Date;
  customer: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    nationality?: string | null;
  } | null;
  bookedBy: { name: string | null } | null;
  items: Array<{
    label: string;
    excursionName: string;
    excursionCode: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  companyName?: string;
}

const PRIMARY = [41, 98, 255] as const; // brand blue
const DARK = [30, 30, 30] as const;
const MUTED = [120, 120, 120] as const;

export function generateBookingVoucher(data: BookingVoucherData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ── Header ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BOOKING VOUCHER", margin, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.code, margin, 24);

  doc.setFontSize(9);
  doc.text(
    `Status: ${CRM_BOOKING_STATUS_LABELS[data.status] ?? data.status}`,
    margin,
    30
  );

  if (data.companyName) {
    doc.setFontSize(10);
    doc.text(data.companyName, pageWidth - margin, 16, { align: "right" });
  }

  doc.setFontSize(9);
  doc.text(
    `Issued: ${format(new Date(data.createdAt), "dd MMM yyyy")}`,
    pageWidth - margin,
    24,
    { align: "right" }
  );

  y = 45;

  // ── Customer & Travel Info ──
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Guest Information", margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);

  const infoLines: string[] = [];
  if (data.customer) {
    infoLines.push(`Name: ${data.customer.firstName} ${data.customer.lastName}`);
    if (data.customer.email) infoLines.push(`Email: ${data.customer.email}`);
    if (data.customer.phone) infoLines.push(`Phone: ${data.customer.phone}`);
    if (data.customer.nationality) infoLines.push(`Nationality: ${data.customer.nationality}`);
  } else {
    infoLines.push("Guest: Walk-in");
  }

  for (const line of infoLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  // Travel details on the right
  const rightX = pageWidth / 2 + 10;
  let ry = 51;
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Travel Details", rightX, 45);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);

  doc.text(`Travel Date: ${format(new Date(data.travelDate), "dd MMM yyyy")}`, rightX, ry);
  ry += 5;

  const paxParts = [`${data.paxAdults} Adult(s)`];
  if (data.paxChildren > 0) paxParts.push(`${data.paxChildren} Child(ren)`);
  if (data.paxInfants > 0) paxParts.push(`${data.paxInfants} Infant(s)`);
  doc.text(`Passengers: ${paxParts.join(", ")}`, rightX, ry);
  ry += 5;

  doc.text(`Currency: ${data.currency}`, rightX, ry);

  y = Math.max(y, ry) + 8;

  // ── Divider ──
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Items Table ──
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Booking Items", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Item", "Excursion", "Qty", "Unit Price", "Total"]],
    body: data.items.map((item, i) => [
      String(i + 1),
      item.label,
      `${item.excursionCode} — ${item.excursionName}`,
      String(item.quantity),
      `${data.currency} ${item.unitPrice.toFixed(2)}`,
      `${data.currency} ${item.totalPrice.toFixed(2)}`,
    ]),
    foot: [[
      "",
      "",
      "",
      "",
      "TOTAL",
      `${data.currency} ${data.totalSelling.toFixed(2)}`,
    ]],
    headStyles: {
      fillColor: [...PRIMARY],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8, textColor: [...DARK] },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [...DARK],
      fontSize: 9,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      3: { halign: "center", cellWidth: 15 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 28 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Notes ──
  if (data.notes) {
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 4;
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setTextColor(...MUTED);
  doc.setFontSize(7);
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy HH:mm")} | ${data.code}`,
    margin,
    footerY
  );
  if (data.bookedBy?.name) {
    doc.text(`Booked by: ${data.bookedBy.name}`, pageWidth - margin, footerY, { align: "right" });
  }

  return doc;
}
