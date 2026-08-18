import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { db } from "@/server/db";

/**
 * Reading the company's branding image for a PDF.
 *
 * Every export route needed this and each grew its own copy, path-traversal
 * guard and all. One copy is enough — and one place to fix if the guard ever
 * turns out to be wrong.
 */

/** Cap the read so an oversized or looping path cannot exhaust memory. */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Width to rasterise a vector logo at. PDF readers scale it back down, so this
 * only decides how sharp it looks when somebody zooms or prints.
 */
const VECTOR_RASTER_WIDTH = 600;

export interface CompanyLogo {
  /** data: URI, ready for jsPDF's addImage. */
  dataUrl: string;
  /** Format name jsPDF expects, e.g. "png", "jpeg". */
  format: string;
}

/**
 * Loads a branding image by its public URL. Returns null rather than throwing:
 * a missing or unreadable logo must never be the reason a document fails.
 */
export async function loadLogoFromUrl(url: string | null | undefined): Promise<CompanyLogo | null> {
  if (!url) return null;

  try {
    const file = path.resolve(path.join(process.cwd(), "public", url));
    // Uploads only. Without this, a stored value of "../../etc/passwd" would
    // be read and embedded into a document anyone can download.
    const allowed = path.resolve(path.join(process.cwd(), "public", "uploads"));
    if (!file.startsWith(allowed + path.sep)) return null;

    const { size } = await stat(file);
    if (size > MAX_LOGO_BYTES) return null;

    const bytes = await readFile(file);
    const ext = url.split(".").pop()?.toLowerCase() ?? "png";

    // PDFs cannot embed SVG, and jsPDF silently rejects one — which is how a
    // company with a vector logo ends up with an unbranded document and no
    // error anywhere. Rasterise it instead.
    if (ext === "svg") {
      const png = await sharp(bytes, { density: 300 })
        .resize({ width: VECTOR_RASTER_WIDTH, withoutEnlargement: false })
        .png()
        .toBuffer();
      return { dataUrl: `data:image/png;base64,${png.toString("base64")}`, format: "png" };
    }

    const mime = MIME_BY_EXT[ext] ?? "image/png";
    return {
      dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
      format: ext === "jpg" ? "jpeg" : ext,
    };
  } catch {
    return null;
  }
}

/**
 * The logo a company wants on its documents, falling back through the other
 * branding slots so a company that only uploaded one image still gets it.
 */
export async function loadCompanyLogo(companyId: string): Promise<CompanyLogo | null> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { reportsLogoUrl: true, logoUrl: true, sidebarLogoUrl: true, loginLogoUrl: true },
  });
  if (!company) return null;

  for (const url of [
    company.reportsLogoUrl,
    company.logoUrl,
    company.sidebarLogoUrl,
    company.loginLogoUrl,
  ]) {
    const logo = await loadLogoFromUrl(url);
    if (logo) return logo;
  }
  return null;
}
