"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
