import { format } from "date-fns";
import { jsPDF } from "jspdf";

import type { HelpModule } from "@/lib/help/types";

/**
 * The whole partner manual as one file.
 *
 * Partners print this, or send it to a new starter who has no login yet, so it
 * has to stand on its own away from the portal. Text only — the screenshots
 * are in the web version, and embedding a dozen of them turns a guide somebody
 * will actually read into a 20 MB attachment nobody opens.
 */
export function generateB2bManualPdf(manual: HelpModule, companyName: string): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const width = pageWidth - margin * 2;
  let y = 0;

  const room = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = 22;
    }
  };

  const paragraph = (text: string, size = 10, style: "normal" | "bold" = "normal", grey = 40) => {
    doc.setFont("helvetica", style).setFontSize(size).setTextColor(grey);
    const lines = doc.splitTextToSize(text, width) as string[];
    room(lines.length * (size * 0.42) + 3);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.42) + 3;
  };

  // Cover
  y = 60;
  doc.setFont("helvetica", "bold").setFontSize(24).setTextColor(20);
  doc.text(manual.name, margin, y);
  y += 10;
  doc.setFont("helvetica", "normal").setFontSize(12).setTextColor(110);
  doc.text(companyName, margin, y);
  y += 16;
  paragraph(manual.overview, 11, "normal", 60);
  y = pageHeight - 30;
  doc.setFontSize(9).setTextColor(150);
  doc.text(`Issued ${format(new Date(), "dd MMMM yyyy")}`, margin, y);

  // Contents
  doc.addPage();
  y = 24;
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(20);
  doc.text("What is in this guide", margin, y);
  y += 10;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
  for (const section of manual.sections) {
    room(6);
    doc.text(section.title, margin, y);
    y += 6;
  }

  // Sections
  for (const section of manual.sections) {
    doc.addPage();
    y = 24;

    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(20);
    const heading = doc.splitTextToSize(section.title, width) as string[];
    doc.text(heading, margin, y);
    y += heading.length * 7 + 2;

    paragraph(section.description, 10, "normal", 90);
    y += 2;

    if (section.features.length) {
      paragraph("The short version", 9, "bold", 20);
      for (const feature of section.features) {
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(40);
        const lines = doc.splitTextToSize(`•  ${feature}`, width - 4) as string[];
        room(lines.length * 4.4 + 2);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4.4 + 1.5;
      }
      y += 4;
    }

    if (section.steps?.length) {
      paragraph("Step by step", 9, "bold", 20);
      for (const step of section.steps) {
        doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
        room(10);
        doc.text(`${step.step}.  ${step.title}`, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
        const lines = doc.splitTextToSize(step.description, width - 6) as string[];
        room(lines.length * 4.4 + 4);
        doc.text(lines, margin + 6, y);
        y += lines.length * 4.4 + 5;
      }
    }
  }

  // Footers, once every page exists so the count is right.
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150);
    doc.text(`${manual.name} — ${companyName}`, margin, pageHeight - 10);
    doc.text(`${i - 1} of ${pages - 1}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
