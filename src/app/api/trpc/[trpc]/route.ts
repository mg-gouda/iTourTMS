import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { auth } from "@/lib/auth";
import { createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/trpc/router";

const handler = async (req: Request) => {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("[tRPC] auth() threw:", e);
    // Session is invalid/corrupted — continue with null session
    // The authMiddleware will return UNAUTHORIZED gracefully
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ session }),
  });
};

export { handler as GET, handler as POST };
