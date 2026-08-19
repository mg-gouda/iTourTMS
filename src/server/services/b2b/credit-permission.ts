import { TRPCError } from "@trpc/server";

import { P } from "@/lib/constants/permissions";

/**
 * Who may move a partner's credit limit.
 *
 * The limit decides how much a partner can commit us to before anyone reviews
 * it, so it is a finance decision rather than a contracting one. Editing a
 * partner's name and editing their exposure should not need the same
 * permission, even though they sit on the same screen.
 */
export function assertMayChangeCredit(session: {
  user?: { roles?: string[] | null; permissions?: string[] | null } | null;
}): void {
  const roles = session.user?.roles ?? [];
  const permissions = session.user?.permissions ?? [];

  if (roles.includes("super_admin") || permissions.includes(P.B2B_CREDIT_MANAGE)) return;

  throw new TRPCError({
    code: "FORBIDDEN",
    message: `Changing a credit limit needs the "${P.B2B_CREDIT_MANAGE}" permission.`,
  });
}
