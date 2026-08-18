import { format } from "date-fns";
import { jsPDF } from "jspdf";

import type { CompanyLogo } from "@/lib/export/company-logo";
import type { HelpModule } from "@/lib/help/types";

/**
 * The whole partner manual as one file.
 *
 * Partners print this, or send it to a new starter who has no login yet, so it
 * has to stand on its own away from the portal — which means carrying the same
 * figures the web version shows, not just the words describing them.
 */

/** Matches the portal's primary, so the document looks like the product. */
const BRAND = { r: 106, g: 13, b: 106 };
const TEXT = 40;
const MUTED = 120;

export interface ManualScreenshot {
  /** PNG bytes. */
  data: Buffer;
  width: number;
  height: number;
}

export interface ManualPdfOptions {
  companyName: string;
  logo?: CompanyLogo | null;
  /** Keyed by the filename each section names, e.g. "02-dashboard.png". */
  screenshots?: Map<string, ManualScreenshot>;
}

const A4 = { width: 210, height: 297 };
/** Small enough to sit above the content margin on every page. */
const HEADER_LOGO_HEIGHT = 5;
const MARGIN = 18;
const CONTENT = A4.width - MARGIN * 2;

export function generateB2bManualPdf(
  manual: HelpModule,
  options: ManualPdfOptions,
): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 0;

  const room = (needed: number) => {
    if (y + needed > A4.height - 20) {
      doc.addPage();
      y = 22;
    }
  };

  const paragraph = (text: string, size = 10, style: "normal" | "bold" = "normal", grey = TEXT) => {
    doc.setFont("helvetica", style).setFontSize(size).setTextColor(grey);
    const lines = doc.splitTextToSize(text, CONTENT) as string[];
    room(lines.length * (size * 0.42) + 3);
    doc.text(lines, MARGIN, y);
    y += lines.length * (size * 0.42) + 3;
  };

  /** How wide the logo will be at a given height, for right-aligning it. */
  const logoWidthAt = (height: number): number => {
    if (!options.logo) return 0;
    try {
      const props = doc.getImageProperties(options.logo.dataUrl);
      return (props.width / props.height) * height;
    } catch {
      return 0;
    }
  };

  /** Draws the branding image at a fixed height, keeping its own proportions. */
  const drawLogo = (x: number, top: number, height: number): number => {
    if (!options.logo) return 0;
    try {
      const props = doc.getImageProperties(options.logo.dataUrl);
      const width = (props.width / props.height) * height;
      // Compressed like the figures are: an uncompressed logo added several
      // megabytes to a document that is otherwise well under one.
      doc.addImage(
        options.logo.dataUrl,
        options.logo.format.toUpperCase(),
        x,
        top,
        width,
        height,
        undefined,
        "FAST",
      );
      return width;
    } catch {
      // A logo that will not decode must not cost us the document.
      return 0;
    }
  };

  // ── Cover ────────────────────────────────────────────────────────────────
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, A4.width, 6, "F");

  y = 42;
  const logoWidth = drawLogo(MARGIN, y - 18, 18);
  if (!logoWidth) {
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(options.companyName, MARGIN, y - 6);
  }

  y += 18;
  doc.setFont("helvetica", "bold").setFontSize(26).setTextColor(20);
  doc.text(manual.name, MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal").setFontSize(12).setTextColor(MUTED);
  doc.text(options.companyName, MARGIN, y);
  y += 14;
  paragraph(manual.overview, 11, "normal", 70);

  doc.setFontSize(9).setTextColor(150);
  doc.text(`Issued ${format(new Date(), "dd MMMM yyyy")}`, MARGIN, A4.height - 24);

  // ── Contents ─────────────────────────────────────────────────────────────
  doc.addPage();
  y = 26;
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(20);
  doc.text("What is in this guide", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
  for (const section of manual.sections) {
    room(6);
    doc.text(section.title, MARGIN, y);
    y += 6;
  }

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const section of manual.sections) {
    doc.addPage();
    y = 26;

    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(20);
    const heading = doc.splitTextToSize(section.title, CONTENT) as string[];
    doc.text(heading, MARGIN, y);
    y += heading.length * 7 + 2;

    paragraph(section.description, 10, "normal", 90);
    y += 2;

    if (section.features.length) {
      paragraph("The short version", 9, "bold", 20);
      for (const feature of section.features) {
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(TEXT);
        const lines = doc.splitTextToSize(`•  ${feature}`, CONTENT - 4) as string[];
        room(lines.length * 4.4 + 2);
        doc.text(lines, MARGIN + 2, y);
        y += lines.length * 4.4 + 1.5;
      }
      y += 4;
    }

    // The figure, at the same point in the story as on screen.
    const shot = section.screenshot ? options.screenshots?.get(section.screenshot) : undefined;
    if (shot) {
      const width = CONTENT;
      const height = (shot.height / shot.width) * width;
      room(height + 8);
      try {
        doc.addImage(shot.data, "PNG", MARGIN, y, width, height, undefined, "FAST");
        doc.setDrawColor(215).setLineWidth(0.2);
        doc.rect(MARGIN, y, width, height);
        y += height + 3;
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150);
        doc.text(section.title, MARGIN, y);
        y += 6;
      } catch {
        // An unreadable figure is not a reason to lose the section.
      }
    }

    if (section.steps?.length) {
      paragraph("Step by step", 9, "bold", 20);
      for (const step of section.steps) {
        doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
        room(10);
        doc.text(`${step.step}.  ${step.title}`, MARGIN, y);
        y += 5;
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
        const lines = doc.splitTextToSize(step.description, CONTENT - 6) as string[];
        room(lines.length * 4.4 + 4);
        doc.text(lines, MARGIN + 6, y);
        y += lines.length * 4.4 + 5;
      }
    }
  }

  // ── Running header and footer ─────────────────────────────────────────────
  // Done last, once every page exists, so the page count is right and the
  // header lands on pages the content loop created along the way.
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);

    // The cover already carries the logo large; every other page gets it small
    // in the corner, so a page photocopied out of context still says whose it is.
    const drawn = drawLogo(A4.width - MARGIN - logoWidthAt(HEADER_LOGO_HEIGHT), 10, HEADER_LOGO_HEIGHT);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150);
    doc.text(manual.name, MARGIN, 14);
    if (!drawn) {
      doc.text(options.companyName, A4.width - MARGIN, 14, { align: "right" });
    }
    doc.setDrawColor(225).setLineWidth(0.2);
    doc.line(MARGIN, 17, A4.width - MARGIN, 17);

    doc.line(MARGIN, A4.height - 14, A4.width - MARGIN, A4.height - 14);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150);
    doc.text(`${manual.name} — ${options.companyName}`, MARGIN, A4.height - 10);
    doc.text(`${i - 1} of ${pages - 1}`, A4.width - MARGIN, A4.height - 10, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
