import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { B2B_CREDIT_TX_TYPE_LABELS } from "@/lib/constants/b2b-portal";

export interface StatementTransaction {
  type: string;
  amount: unknown;
  runningBalance: unknown;
  reference: string | null;
  notes: string | null;
  createdAt: string | Date;
  booking: { code: string } | null;
}

export interface B2bStatementPdfData {
  tourOperator: {
    name: string;
    code: string;
    creditLimit: number;
    creditUsed: number;
  };
  dateFrom: string | Date;
  dateTo: string | Date;
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTransaction[];
  companyName?: string;
}

const PRIMARY = [41, 98, 255] as const;
const DARK = [30, 30, 30] as const;
const MUTED = [120, 120, 120] as const;

function n(v: unknown): number {
  return Number(v ?? 0);
}

export function generateB2bStatementPdf(data: B2bStatementPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ── Header ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PARTNER STATEMENT", margin, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.tourOperator.name} (${data.tourOperator.code})`, margin, 24);

  doc.setFontSize(9);
  doc.text(
    `${format(new Date(data.dateFrom), "dd MMM yyyy")} — ${format(new Date(data.dateTo), "dd MMM yyyy")}`,
    margin,
    30,
  );

  if (data.companyName) {
    doc.setFontSize(10);
    doc.text(data.companyName, pageWidth - margin, 16, { align: "right" });
  }

  y = 45;

  // ── Summary Box ──
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, pageWidth - 2 * margin, 20, "F");

  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const colW = (pageWidth - 2 * margin) / 4;
  const labels = ["Opening Balance", "Period Movement", "Closing Balance", "Credit Limit"];
  const periodMovement = data.closingBalance - data.openingBalance;
  const values = [
    data.openingBalance.toFixed(2),
    periodMovement.toFixed(2),
    data.closingBalance.toFixed(2),
    data.tourOperator.creditLimit.toFixed(2),
  ];

  for (let i = 0; i < 4; i++) {
    const x = margin + i * colW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(labels[i], x + 3, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(values[i], x + 3, y + 14);
  }

  y += 28;

  // ── Transactions Table ──
  if (data.transactions.length > 0) {
    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Transactions", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Date", "Type", "Booking", "Reference", "Notes", "Amount", "Balance"]],
      body: data.transactions.map((tx) => [
        format(new Date(tx.createdAt), "dd MMM yyyy"),
        B2B_CREDIT_TX_TYPE_LABELS[tx.type] ?? tx.type,
        tx.booking?.code ?? "",
        tx.reference ?? "",
        tx.notes ?? "",
        n(tx.amount).toFixed(2),
        n(tx.runningBalance).toFixed(2),
      ]),
      headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [...DARK] },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        5: { halign: "right", cellWidth: 22 },
        6: { halign: "right", cellWidth: 22 },
      },
    });
  } else {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text("No transactions in this period.", margin, y + 5);
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(
      `Generated on ${format(new Date(), "dd MMM yyyy HH:mm")} | ${data.tourOperator.code}`,
      margin,
      footerY,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
  }

  return doc;
}
