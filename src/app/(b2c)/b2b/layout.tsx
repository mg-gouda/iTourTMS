import { SessionProvider } from "next-auth/react";

import B2bPortalLayoutClient from "@/components/b2c/b2b-portal-layout";

export const dynamic = "force-dynamic";

export default function B2bLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <B2bPortalLayoutClient>{children}</B2bPortalLayoutClient>
    </SessionProvider>
  );
}
