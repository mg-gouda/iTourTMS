import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KeyRound, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function LicenseExpiredPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;

  // If license is actually valid, redirect back to dashboard
  if (companyId) {
    const license = await db.license.findFirst({
      where: { companyId, isActivated: true },
      select: { expiresAt: true, isRevoked: true },
    });
    if (license && !license.isRevoked && license.expiresAt && license.expiresAt > new Date()) {
      redirect("/dashboard");
    }
  }

  // Get expiry info for display
  const license = companyId
    ? await db.license.findFirst({
        where: { companyId, isActivated: true },
        select: { expiresAt: true, keyPrefix: true, keySuffix: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">License Expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your iTourTMS license has expired. The system is currently inactive.
        </p>
      </div>

      {license?.expiresAt && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            License expired on{" "}
            <span className="font-semibold">
              {license.expiresAt.toLocaleDateString()}
            </span>
          </p>
          {license.keyPrefix && license.keySuffix && (
            <p className="mt-1 font-mono text-xs text-red-600 dark:text-red-400">
              Key: {license.keyPrefix}-****-****-{license.keySuffix}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Contact your system provider to obtain a new license key.
        </p>
        <Link
          href="/license-activate"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <KeyRound className="h-4 w-4" />
          Activate New Key
        </Link>
      </div>
    </div>
  );
}
