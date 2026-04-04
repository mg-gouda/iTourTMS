import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { BANK_STATEMENT_STATE_LABELS } from "@/lib/constants/finance";

export interface StatementPdfData {
  name: string;
  state: string;
  date: string | Date;
  journal: { code: string; name: string };
  currency: { code: string; symbol: string };
  openingBalance: unknown;
  closingBalance: unknown;
  lines: Array<{
    date: string | Date;
    label: string;
    partnerName: string | null;
    ref: string | null;
    amount: unknown;
  }>;
  companyName?: string;
}

const PRIMARY = [41, 98, 255] as const;
const DARK = [30, 30, 30] as const;
const MUTED = [120, 120, 120] as const;

function n(v: unknown): number {
  return Number(v ?? 0);
}

export function generateStatementPdf(data: StatementPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;
  const sym = data.currency.symbol;

  // ── Header ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BANK STATEMENT", margin, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.name, margin, 24);

  doc.setFontSize(9);
  doc.text(
    `${data.journal.code} — ${data.journal.name} | ${BANK_STATEMENT_STATE_LABELS[data.state] ?? data.state}`,
    margin,
    30,
  );

  if (data.companyName) {
    doc.setFontSize(10);
    doc.text(data.companyName, pageWidth - margin, 16, { align: "right" });
  }
  doc.setFontSize(9);
  doc.text(format(new Date(data.date), "dd MMM yyyy"), pageWidth - margin, 24, { align: "right" });

  y = 45;

  // ── Balances Summary ──
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Opening Balance: ${sym} ${n(data.openingBalance).toFixed(2)}`, margin, y);
  doc.text(
    `Closing Balance: ${sym} ${n(data.closingBalance).toFixed(2)}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );

  y += 8;

  // ── Lines Table ──
  if (data.lines.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Date", "Label", "Partner", "Reference", "Amount"]],
      body: data.lines.map((l) => [
        format(new Date(l.date), "dd MMM yyyy"),
        l.label,
        l.partnerName ?? "",
        l.ref ?? "",
        `${sym} ${n(l.amount).toFixed(2)}`,
      ]),
      headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [...DARK] },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24 },
        4: { halign: "right", cellWidth: 28 },
      },
    });
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
