import { redirect } from "next/navigation";

import { TermsAcceptance } from "@/components/b2b/terms-acceptance";
import { partnerAuth } from "@/lib/auth-partner";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Sits outside the portal gate on purpose: that gate is what sends people
 * here, so a page inside it would bounce forever. It still demands a partner
 * session — this is a signed-in screen, not a public one.
 */
export default async function B2bTermsPage() {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; companyId?: string | null }
    | undefined;

  if (!user || user.realm !== "partner" || !user.companyId) redirect("/b2b/login");

  const [terms, current] = await Promise.all([
    db.partnerTermsVersion.findFirst({
      where: { companyId: user.companyId },
      orderBy: { publishedAt: "desc" },
      select: { version: true, body: true, publishedAt: true },
    }),
    db.user.findUnique({ where: { id: user.id }, select: { termsVersion: true } }),
  ]);

  // Nothing published, or already accepted — there is nothing to ask for.
  if (!terms || current?.termsVersion === terms.version) redirect("/b2b");

  return (
    <TermsAcceptance
      version={terms.version}
      body={terms.body}
      publishedAt={terms.publishedAt.toISOString()}
    />
  );
}
