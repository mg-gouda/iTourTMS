import { redirect } from "next/navigation";

import { partnerAuth } from "@/lib/auth-partner";

export const dynamic = "force-dynamic";

/**
 * User management is for partner admins only. The procedures refuse anyone
 * else anyway, but a page that renders its shell and then shows an error is a
 * worse answer than never opening.
 */
export default async function PartnerUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await partnerAuth();
  const user = session?.user as { realm?: string; partnerRole?: string | null } | undefined;

  if (user?.realm !== "partner") redirect("/b2b/login");
  if (user.partnerRole !== "PARTNER_ADMIN") redirect("/b2b");

  return <>{children}</>;
}
