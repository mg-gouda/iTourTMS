import { NextResponse, type NextRequest } from "next/server";

import { partnerAuth } from "@/lib/auth-partner";
import { auditPartner } from "@/lib/b2b/audit";
import { generateB2bStatementPdf } from "@/lib/export/b2b-statement-pdf";
import { db } from "@/server/db";

/**
 * The partner's own statement, for the period they picked. Same generator the
 * staff side uses — the only difference is that the partner id comes from the
 * session rather than from a query string, so nobody can ask for another
 * partner's ledger.
 */
export async function GET(req: NextRequest) {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; companyId?: string | null; tourOperatorId?: string | null }
    | undefined;

  if (!user || user.realm !== "partner" || !user.companyId || !user.tourOperatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const from = new Date(params.get("from") ?? "");
  const to = new Date(`${params.get("to") ?? ""}T23:59:59`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const scope = { companyId: user.companyId, tourOperatorId: user.tourOperatorId };

  const [partner, company, opening, transactions] = await Promise.all([
    db.tourOperator.findUniqueOrThrow({
      where: { id: user.tourOperatorId },
      select: { name: true, code: true, creditLimit: true, creditUsed: true },
    }),
    db.company.findUnique({ where: { id: user.companyId }, select: { name: true } }),
    db.b2bCreditTransaction.aggregate({
      where: { ...scope, createdAt: { lt: from } },
      _sum: { amount: true },
    }),
    db.b2bCreditTransaction.findMany({
      where: { ...scope, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "asc" },
      select: {
        type: true,
        amount: true,
        runningBalance: true,
        reference: true,
        notes: true,
        createdAt: true,
        booking: { select: { code: true } },
      },
    }),
  ]);

  const openingBalance = Number(opening._sum.amount ?? 0);
  const closingBalance =
    openingBalance + transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  const pdf = generateB2bStatementPdf({
    tourOperator: {
      name: partner.name,
      code: partner.code,
      creditLimit: Number(partner.creditLimit),
      creditUsed: Number(partner.creditUsed),
    },
    dateFrom: from,
    dateTo: to,
    openingBalance,
    closingBalance,
    transactions,
    companyName: company?.name,
  });

  await auditPartner("DOCUMENT_DOWNLOADED", {
    companyId: user.companyId,
    tourOperatorId: user.tourOperatorId,
    userId: user.id,
    entityType: "Statement",
    request: req,
    metadata: { from: from.toISOString(), to: to.toISOString() },
  });

  const stamp = from.toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(pdf.output("arraybuffer")), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statement-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
