import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  MOVE_TYPE_LABELS,
  MOVE_STATE_LABELS,
  PAYMENT_STATE_LABELS,
} from "@/lib/constants/finance";

export interface InvoicePdfData {
  name: string;
  moveType: string;
  state: string;
  paymentState: string | null;
  date: string | Date;
  dueDate: string | Date | null;
  ref: string | null;
  narration: string | null;
  amountUntaxed: unknown;
  amountTax: unknown;
  amountTotal: unknown;
  amountResidual: unknown;
  partner: { name: string } | null;
  journal: { code: string; name: string };
  currency: { code: string; symbol: string };
  paymentTerm: { name: string } | null;
  lineItems: Array<{
    displayType: string;
    name: string | null;
    accountName: string;
    quantity: unknown;
    priceUnit: unknown;
    discount: unknown;
    debit: unknown;
    credit: unknown;
    taxAmount: unknown;
  }>;
  companyName?: string;
  companyAddress?: string;
  companyVat?: string;
}

const PRIMARY = [41, 98, 255] as const;
const DARK = [30, 30, 30] as const;
const MUTED = [120, 120, 120] as const;

function n(v: unknown): number {
  return Number(v ?? 0);
}

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const isInvoice = data.moveType === "OUT_INVOICE" || data.moveType === "IN_INVOICE";
  const isRefund = data.moveType === "OUT_REFUND" || data.moveType === "IN_REFUND";
  const title = isInvoice ? "INVOICE" : isRefund ? "CREDIT NOTE" : "JOURNAL ENTRY";

  // ── Header ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.name, margin, 24);

  doc.setFontSize(9);
  doc.text(
    `${MOVE_STATE_LABELS[data.state] ?? data.state}${data.paymentState ? ` • ${PAYMENT_STATE_LABELS[data.paymentState] ?? data.paymentState}` : ""}`,
    margin,
    30,
  );

  if (data.companyName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(data.companyName, pageWidth - margin, 14, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (data.companyAddress) doc.text(data.companyAddress, pageWidth - margin, 20, { align: "right" });
    if (data.companyVat) doc.text(`VAT: ${data.companyVat}`, pageWidth - margin, 25, { align: "right" });
  }

  y = 45;

  // ── Partner & Invoice Info (two columns) ──
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.moveType.startsWith("OUT") ? "Bill To" : "Vendor", margin, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  y += 6;
  doc.text(data.partner?.name ?? "—", margin, y);

  // Right column
  const rightX = pageWidth / 2 + 10;
  let ry = 45;
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Details", rightX, ry);
  ry += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);

  const details = [
    `Type: ${MOVE_TYPE_LABELS[data.moveType] ?? data.moveType}`,
    `Date: ${format(new Date(data.date), "dd MMM yyyy")}`,
    ...(data.dueDate ? [`Due: ${format(new Date(data.dueDate), "dd MMM yyyy")}`] : []),
    `Journal: ${data.journal.code} — ${data.journal.name}`,
    ...(data.paymentTerm ? [`Terms: ${data.paymentTerm.name}`] : []),
    ...(data.ref ? [`Reference: ${data.ref}`] : []),
  ];

  for (const line of details) {
    doc.text(line, rightX, ry);
    ry += 5;
  }

  y = Math.max(y + 6, ry) + 6;

  // ── Divider ──
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Line Items Table ──
  const productLines = data.lineItems.filter(
    (l) => l.displayType === "PRODUCT" || l.displayType === "TAX" || l.displayType === "ROUNDING",
  );

  if (productLines.length > 0) {
    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Line Items", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Description", "Account", "Qty", "Unit Price", "Discount %", "Debit", "Credit"]],
      body: productLines.map((l, i) => [
        String(i + 1),
        l.name ?? "",
        l.accountName,
        n(l.quantity) > 0 ? n(l.quantity).toString() : "",
        n(l.priceUnit) > 0 ? n(l.priceUnit).toFixed(2) : "",
        n(l.discount) > 0 ? `${n(l.discount).toFixed(1)}%` : "",
        n(l.debit) > 0 ? `${data.currency.symbol} ${n(l.debit).toFixed(2)}` : "",
        n(l.credit) > 0 ? `${data.currency.symbol} ${n(l.credit).toFixed(2)}` : "",
      ]),
      headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [...DARK] },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: "center", cellWidth: 12 },
        4: { halign: "right", cellWidth: 22 },
        5: { halign: "center", cellWidth: 22 },
        6: { halign: "right", cellWidth: 26 },
        7: { halign: "right", cellWidth: 26 },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Totals Box ──
  const totalsBoxX = pageWidth - margin - 70;
  doc.setFillColor(245, 245, 245);
  doc.rect(totalsBoxX, y, 70, 32, "F");

  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const sym = data.currency.symbol;
  doc.text("Untaxed:", totalsBoxX + 4, y + 7);
  doc.text(`${sym} ${n(data.amountUntaxed).toFixed(2)}`, totalsBoxX + 66, y + 7, { align: "right" });

  doc.text("Tax:", totalsBoxX + 4, y + 14);
  doc.text(`${sym} ${n(data.amountTax).toFixed(2)}`, totalsBoxX + 66, y + 14, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total:", totalsBoxX + 4, y + 22);
  doc.text(`${sym} ${n(data.amountTotal).toFixed(2)}`, totalsBoxX + 66, y + 22, { align: "right" });

  if (n(data.amountResidual) > 0) {
    doc.setTextColor(200, 50, 50);
    doc.setFontSize(9);
    doc.text("Amount Due:", totalsBoxX + 4, y + 29);
    doc.text(`${sym} ${n(data.amountResidual).toFixed(2)}`, totalsBoxX + 66, y + 29, { align: "right" });
  }

  y += 40;

  // ── Narration / Notes ──
  if (data.narration) {
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(data.narration, pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setTextColor(...MUTED);
  doc.setFontSize(7);
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy HH:mm")} | ${data.name}`,
    margin,
    footerY,
  );

  return doc;
}
