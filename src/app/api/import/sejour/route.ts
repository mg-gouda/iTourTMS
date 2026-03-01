import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseSejourPdf } from "@/lib/import/sejour/parse-sejour";
import { importSejourContract } from "@/lib/import/sejour/import-sejour";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    // ---- Auth ----
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;
    const userId = session.user.id;

    // ---- Parse multipart form data ----
    const formData = await req.formData();
    const files = formData.getAll("files[]");

    if (files.length === 0) {
      // Try single file field
      const single = formData.get("file");
      if (single && single instanceof File) {
        files.push(single);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No PDF files uploaded." },
        { status: 400 },
      );
    }

    // ---- Preview mode ----
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get("preview") === "true";

    const results: Array<{
      fileName: string;
      parsed?: Awaited<ReturnType<typeof parseSejourPdf>>;
      imported?: Awaited<ReturnType<typeof importSejourContract>>;
      error?: string;
    }> = [];

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      if (!(file instanceof File)) {
        errorCount++;
        results.push({ fileName: "unknown", error: "Invalid file" });
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const parsed = await parseSejourPdf(data);

        if (isPreview) {
          results.push({ fileName: file.name, parsed });
          successCount++;
        } else {
          const imported = await importSejourContract(
            db,
            parsed,
            companyId,
            userId,
          );
          results.push({ fileName: file.name, imported });
          successCount++;
        }
      } catch (err) {
        errorCount++;
        results.push({
          fileName: file.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (isPreview) {
      return NextResponse.json({
        contracts: results.map((r) => ({
          fileName: r.fileName,
          header: r.parsed?.header,
          periods: r.parsed?.periods,
          rates: r.parsed?.rates,
          allotments: r.parsed?.allotments,
          codeDefinitions: r.parsed?.codeDefinitions,
          accommodations: r.parsed?.accommodations,
          cancellations: r.parsed?.cancellations,
          specialOffers: r.parsed?.specialOffers,
          minimumStay: r.parsed?.minimumStay,
          remarks: r.parsed?.remarks,
          warnings: r.parsed?.warnings,
          error: r.error,
        })),
        successCount,
        errorCount,
      });
    }

    return NextResponse.json({
      contracts: results.map((r) => ({
        fileName: r.fileName,
        hotelName: r.imported?.hotelName,
        contractId: r.imported?.contractId,
        contractCode: r.imported?.contractCode,
        hotelId: r.imported?.hotelId,
        roomTypesCreated: r.imported?.roomTypesCreated,
        mealBasesCreated: r.imported?.mealBasesCreated,
        seasonsCreated: r.imported?.seasonsCreated,
        ratesCreated: r.imported?.ratesCreated,
        error: r.error,
      })),
      successCount,
      errorCount,
    });
  } catch (err) {
    console.error("[sejour-import]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Sejour import failed",
      },
      { status: 500 },
    );
  }
}
