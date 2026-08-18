import { redirect } from "next/navigation";

import { PortalShell } from "@/components/b2b/portal-shell";
import { partnerAuth } from "@/lib/auth-partner";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Server gate for the partner portal.
 *
 * The edge only checks that a partner cookie exists. This is where the session
 * is actually verified: right realm, real partner, portal switched on, terms
 * accepted. A staff session reaching here has no partner realm and is sent to
 * its own home rather than being told what lives at /b2b.
 */
export default async function B2bLayout({ children }: { children: React.ReactNode }) {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; tourOperatorId?: string | null; mustSetPassword?: boolean }
    | undefined;

  if (!user || user.realm !== "partner" || !user.tourOperatorId) {
    redirect("/b2b/login");
  }

  // Re-read rather than trusting the token: access can be revoked mid-session.
  const partnerUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      partnerRole: true,
      termsVersion: true,
      twoFactorEnabled: true,
      tourOperator: {
        select: { id: true, name: true, active: true, portalEnabled: true, companyId: true },
      },
    },
  });

  if (
    !partnerUser?.isActive ||
    !partnerUser.partnerRole ||
    !partnerUser.tourOperator?.active ||
    !partnerUser.tourOperator.portalEnabled
  ) {
    redirect("/b2b/login?error=portal_access_denied");
  }

  // 2FA is mandatory here; an un-enrolled account cannot reach any page.
  if (!partnerUser.twoFactorEnabled) {
    redirect("/b2b/login?error=2fa_enrolment_required");
  }

  const currentTerms = await db.partnerTermsVersion.findFirst({
    where: { companyId: partnerUser.tourOperator.companyId },
    orderBy: { publishedAt: "desc" },
    select: { version: true },
  });

  if (currentTerms && partnerUser.termsVersion !== currentTerms.version) {
    redirect("/b2b/terms");
  }

  return (
    <PortalShell
      partnerName={partnerUser.tourOperator.name}
      userName={partnerUser.name ?? partnerUser.email}
      role={partnerUser.partnerRole}
    >
      {children}
    </PortalShell>
  );
}
