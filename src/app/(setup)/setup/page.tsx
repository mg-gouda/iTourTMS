import { redirect } from "next/navigation";

import { db } from "@/server/db";
import { SetupWizard } from "@/components/layout/setup-wizard";

export default async function SetupPage() {
  // If already set up, redirect to dashboard
  const companyCount = await db.company.count();
  if (companyCount > 0) {
    redirect("/dashboard");
  }

  // Check if a license has already been activated (resume from step 2)
  const activeLicense = await db.license.findFirst({
    where: { isActivated: true, isRevoked: false },
    select: { id: true },
  });

  // Fetch countries, currencies, and COA templates for the wizard
  const [countries, currencies, coaTemplates] = await Promise.all([
    db.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.currency.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, symbol: true },
    }),
    db.coaTemplate.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        locale: true,
        _count: { select: { groups: true, accounts: true } },
      },
    }),
  ]);

  return (
    <SetupWizard
      countries={countries}
      currencies={currencies}
      coaTemplates={coaTemplates}
      existingLicenseId={activeLicense?.id ?? null}
    />
  );
}
