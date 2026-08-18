import { format } from "date-fns";
import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * The pages a rate sheet needs before a partner can actually quote from it.
 *
 * A grid of net rates on its own is not sellable: it does not say what a child
 * costs, when the hotel is closed, what cancelling costs, or which offer is
 * running. Those live here, appended to the same document, so the partner has
 * one file rather than four.
 */
export interface PartnerRateSheetAnnex {
  contractCode: string;
  hotelName: string;
  currencyCode: string;
  minimumStayNote: string | null;
  cancellation: { daysBefore: number; chargeType: string; chargeValue: number; description: string | null }[];
  childPolicies: {
    label: string;
    ageFrom: number;
    ageTo: number;
    freeInSharing: boolean;
    maxFreePerRoom: number;
    extraBedAllowed: boolean;
    chargePercentage: number;
  }[];
  stopSales: { dateFrom: Date; dateTo: Date; roomType: string | null }[];
  specialOffers: {
    name: string;
    offerType: string;
    validFrom: Date | null;
    validTo: Date | null;
    bookByDate: Date | null;
    minimumNights: number | null;
    discountType: string | null;
    discountValue: number | null;
    stayNights: number | null;
    payNights: number | null;
    targeted: boolean;
  }[];
}

const day = (d: Date | null) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

function chargeText(chargeType: string, value: number, currency: string): string {
  if (chargeType === "PERCENTAGE") return `${value}% of the booking`;
  if (chargeType === "FIRST_NIGHT") return "First night";
  return `${value} ${currency}`;
}

function offerText(o: PartnerRateSheetAnnex["specialOffers"][number]): string {
  if (o.stayNights && o.payNights) return `Stay ${o.stayNights} pay ${o.payNights}`;
  if (o.discountType === "PERCENTAGE" && o.discountValue !== null) return `${o.discountValue}% off`;
  if (o.discountValue !== null) return `${o.discountValue} off`;
  return o.offerType.replace(/_/g, " ").toLowerCase();
}

export function appendPartnerRateSheetAnnex(doc: jsPDF, data: PartnerRateSheetAnnex): void {
  doc.addPage("a4", "landscape");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 16;

  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(30);
  doc.text(`${data.hotelName} — terms`, margin, y);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(120);
  doc.text(data.contractCode, pageWidth - margin, y, { align: "right" });
  y += 8;

  const section = (title: string, head: string[], body: string[][], empty: string) => {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
    doc.text(title, margin, y);
    y += 2;

    if (body.length === 0) {
      y += 4;
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(130);
      doc.text(empty, margin, y);
      y += 9;
      return;
    }

    autoTable(doc, {
      head: [head],
      body,
      startY: y + 2,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [68, 36, 110], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 246, 252] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  };

  section(
    "Cancellation",
    ["Days before arrival", "Charge", "Notes"],
    data.cancellation.map((c) => [
      `${c.daysBefore}+`,
      chargeText(c.chargeType, c.chargeValue, data.currencyCode),
      c.description ?? "",
    ]),
    "No cancellation policy is set on this contract — ask your account manager before quoting one.",
  );

  section(
    "Children",
    ["Category", "Ages", "Free sharing", "Max free per room", "Extra bed", "Charge"],
    data.childPolicies.map((p) => [
      p.label,
      `${p.ageFrom}–${p.ageTo}`,
      p.freeInSharing ? "Yes" : "No",
      String(p.maxFreePerRoom),
      p.extraBedAllowed ? "Allowed" : "Not allowed",
      `${p.chargePercentage}%`,
    ]),
    "No child policy on this contract — children are charged as adults.",
  );

  section(
    "Special offers",
    ["Offer", "Benefit", "Stay dates", "Book by", "Min nights", "Availability"],
    data.specialOffers.map((o) => [
      o.name,
      offerText(o),
      `${day(o.validFrom)} – ${day(o.validTo)}`,
      day(o.bookByDate),
      o.minimumNights ? String(o.minimumNights) : "—",
      o.targeted ? "Your account only" : "All partners",
    ]),
    "No offers are running on this contract.",
  );

  section(
    "Closed dates",
    ["From", "To", "Room type"],
    data.stopSales.map((s) => [day(s.dateFrom), day(s.dateTo), s.roomType ?? "All rooms"]),
    "No stop sales — all dates in this contract are open, subject to allotment.",
  );

  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(130);
  const notes = [
    data.minimumStayNote,
    "Rates are net, per the contract, and exclude your own mark-up.",
    "Availability shown at the time of booking is what applies; a rate sheet is not a guarantee of space.",
  ].filter(Boolean) as string[];
  for (const note of notes) {
    doc.text(`· ${note}`, margin, y);
    y += 4.5;
  }
}
