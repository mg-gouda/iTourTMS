import { createHash } from "node:crypto";

import { InviteFlow } from "@/components/b2b/invite-flow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * The one-time link a partner receives. Read here rather than fetched, so the
 * page never flashes a form for an invitation that is already spent.
 */
export default async function B2bInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const invite = await db.partnerInvite.findUnique({
    where: { tokenHash },
    select: {
      usedAt: true,
      expiresAt: true,
      user: { select: { email: true, name: true } },
      tourOperator: { select: { name: true } },
    },
  });

  const valid = !!invite && !invite.usedAt && invite.expiresAt > new Date();

  if (!valid) {
    return (
      <Card className="animate-fade-in-up border-white/[0.08] bg-white/[0.07] shadow-2xl shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-xl">
        <CardHeader className="pb-4 text-center">
          <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
            Invitation
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
            This invitation link has expired or has already been used.
          </div>
          <p className="text-center text-xs text-gray-500">
            Ask your account manager to send you a new one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <InviteFlow
      token={token}
      email={invite.user.email}
      name={invite.user.name}
      partnerName={invite.tourOperator.name}
    />
  );
}
