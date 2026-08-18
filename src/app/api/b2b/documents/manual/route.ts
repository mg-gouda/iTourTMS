import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { partnerAuth } from "@/lib/auth-partner";
import { auditPartner } from "@/lib/b2b/audit";
import { loadCompanyLogo } from "@/lib/export/company-logo";
import {
  generateB2bManualPdf,
  type ManualScreenshot,
} from "@/lib/export/b2b-manual-pdf";
import { b2bManual } from "@/lib/help/b2b-manual";
import { db } from "@/server/db";

/** Where the capture script writes the figures the manual refers to. */
const SHOTS_DIR = path.join(process.cwd(), "public", "help", "b2b");

/** PNG header: width and height are big-endian 32-bit at bytes 16..24. */
function pngSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * Reads the figures each section names. A missing file is skipped rather than
 * fatal — the manual has already survived one figure that was never captured,
 * and a guide that refuses to download is worse than one with a gap.
 */
async function loadScreenshots(): Promise<Map<string, ManualScreenshot>> {
  const wanted = [
    ...new Set(b2bManual.sections.map((s) => s.screenshot).filter((f): f is string => !!f)),
  ];

  const shots = new Map<string, ManualScreenshot>();
  await Promise.all(
    wanted.map(async (file) => {
      // Names come from our own manual, never from a request, but resolve and
      // check anyway so that stays true if it is ever wired to input.
      const full = path.resolve(path.join(SHOTS_DIR, file));
      if (!full.startsWith(SHOTS_DIR + path.sep)) return;
      try {
        const data = await readFile(full);
        const size = pngSize(data);
        if (size) shots.set(file, { data, ...size });
      } catch {
        // Not captured yet — the section just goes without.
      }
    }),
  );
  return shots;
}

/** The whole partner guide as one file, for printing or passing to a new starter. */
export async function GET(req: NextRequest) {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; companyId?: string | null; tourOperatorId?: string | null }
    | undefined;

  if (!user || user.realm !== "partner" || !user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [company, logo, screenshots] = await Promise.all([
    db.company.findUnique({ where: { id: user.companyId }, select: { name: true } }),
    loadCompanyLogo(user.companyId),
    loadScreenshots(),
  ]);

  const pdf = generateB2bManualPdf(b2bManual, {
    companyName: company?.name ?? "",
    logo,
    screenshots,
  });

  await auditPartner("DOCUMENT_DOWNLOADED", {
    companyId: user.companyId,
    tourOperatorId: user.tourOperatorId,
    userId: user.id,
    entityType: "Manual",
    request: req,
    metadata: { figures: screenshots.size },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="portal-guide.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
