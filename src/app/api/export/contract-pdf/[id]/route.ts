import { readFile } from "node:fs/promises";
import path from "node:path";

import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateContractPdf } from "@/lib/export/contract-pdf";
import { db } from "@/server/db";

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

    // Fetch contract with the same includes as getForExport
    const contract = await db.contract.findFirst({
      where: { id, companyId },
      include: {
        hotel: { select: { id: true, name: true, code: true } },
        baseCurrency: { select: { id: true, code: true, name: true } },
        baseRoomType: { select: { id: true, name: true, code: true } },
        baseMealBasis: { select: { id: true, name: true, mealCode: true } },
        seasons: { orderBy: { sortOrder: "asc" as const } },
        roomTypes: {
          include: {
            roomType: {
              select: { id: true, name: true, code: true, maxAdults: true, maxChildren: true },
            },
          },
          orderBy: { sortOrder: "asc" as const },
        },
        mealBases: {
          include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
          orderBy: { sortOrder: "asc" as const },
        },
        baseRates: {
          include: { season: { select: { id: true, name: true, code: true } } },
        },
        supplements: {
          include: {
            roomType: { select: { id: true, name: true, code: true } },
            mealBasis: { select: { id: true, name: true, mealCode: true } },
          },
          orderBy: [
            { supplementType: "asc" as const },
            { sortOrder: "asc" as const },
          ],
        },
        specialOffers: { orderBy: { sortOrder: "asc" as const } },
        allotments: {
          include: {
            season: { select: { id: true, name: true, code: true } },
            roomType: { select: { id: true, name: true, code: true } },
          },
        },
        childPolicies: { orderBy: { category: "asc" as const } },
        cancellationPolicies: { orderBy: { daysBefore: "desc" as const } },
        markets: {
          include: {
            market: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

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
        const logoPath = path.join(process.cwd(), "public", company.reportsLogoUrl);
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
    const pdfBuffer = generateContractPdf(contract, {
      companyName,
      logoBase64,
      logoFormat,
    });

    // Build filename: CODE_vVERSION_YYYYMMDD.pdf
    const filename = `${contract.code}_v${contract.version}_${format(new Date(), "yyyyMMdd")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[contract-pdf export]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 },
    );
  }
}
