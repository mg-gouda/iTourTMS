import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { notifyRole } from "@/server/services/shared/notifications";
import { LICENSE_EXPIRY_WARNING_DAYS } from "@/server/services/shared/license";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + LICENSE_EXPIRY_WARNING_DAYS);

  // Find licenses expiring within 30 days that haven't been notified yet
  const expiringLicenses = await db.license.findMany({
    where: {
      isActivated: true,
      isRevoked: false,
      expiryNotified: false,
      expiresAt: {
        gt: now,
        lte: warningDate,
      },
      companyId: { not: null },
    },
    select: {
      id: true,
      companyId: true,
      expiresAt: true,
    },
  });

  let notified = 0;

  for (const license of expiringLicenses) {
    if (!license.companyId || !license.expiresAt) continue;

    const daysRemaining = Math.ceil(
      (license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    await notifyRole(db, license.companyId, "super_admin", {
      type: "LICENSE_EXPIRY_WARNING",
      title: "License expires soon",
      message: `Your iTourTMS license expires on ${license.expiresAt.toLocaleDateString()} (${daysRemaining} days remaining). Contact your provider to renew and avoid service interruption.`,
      link: "/settings",
    });

    await db.license.update({
      where: { id: license.id },
      data: { expiryNotified: true },
    });

    notified++;
  }

  return NextResponse.json({ notified });
}
