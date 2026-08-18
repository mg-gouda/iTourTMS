import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { RATE_BASIS_LABELS } from "@/lib/constants/contracting";
import { generateRatesPdf } from "@/lib/export/rates-pdf";
import { db } from "@/server/db";
import { loadContractRateGrid } from "@/server/services/contracting/rate-grid-loader";

/** Cap the logo read so an oversized/looping path cannot OOM the process. */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const { id } = await params;

    // Check contracting module is installed
    const moduleInstalled = await db.installedModule.findFirst({
      where: { companyId, name: "contracting" },
    });
    if (!moduleInstalled) {
      return NextResponse.json(
        { error: "Contracting module not installed" },
        { status: 403 },
      );
    }

    const loaded = await loadContractRateGrid(id, companyId);
    if (!loaded) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }
    const { grid, contract } = loaded;

    // Fetch company branding
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, reportsLogoUrl: true },
    });

    const companyName = company?.name ?? "iTourTMS";

    // Read logo from disk if set
    let logoBase64: string | null = null;
    let logoFormat: string | undefined;
    if (company?.reportsLogoUrl) {
      try {
        const logoPath = path.resolve(
          path.join(process.cwd(), "public", company.reportsLogoUrl),
        );
        const allowedDir = path.resolve(
          path.join(process.cwd(), "public", "uploads"),
        );
        // Prevent path traversal
        if (!logoPath.startsWith(allowedDir)) {
          throw new Error("Invalid logo path");
        }
        const { size } = await stat(logoPath);
        if (size > MAX_LOGO_BYTES) {
          throw new Error("Logo file too large");
        }
        const logoBuffer = await readFile(logoPath);
        const ext = company.reportsLogoUrl.split(".").pop()?.toLowerCase() ?? "png";
        const mimeMap: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          webp: "image/webp",
          gif: "image/gif",
        };
        const mime = mimeMap[ext] ?? "image/png";
        logoBase64 = `data:${mime};base64,${logoBuffer.toString("base64")}`;
        logoFormat = ext === "jpg" ? "jpeg" : ext;
      } catch {
        // Logo file missing — generate PDF without it
      }
    }

    // Generate PDF
    const pdfBuffer = generateRatesPdf(grid, {
      hotelName: contract.hotelName,
      contractCode: contract.code,
      contractName: contract.name,
      currency: contract.currencyCode,
      rateBasis: RATE_BASIS_LABELS[contract.rateBasis] ?? contract.rateBasis,
      companyName,
      logoBase64,
      logoFormat,
    });

    // Build filename
    const filename = `Rates_${contract.code}_${format(new Date(), "yyyyMMdd")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[rates-pdf export]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 },
    );
  }
}
