import { createTRPCRouter } from "@/server/trpc";
import { contractingRouter } from "@/server/trpc/routers/contracting";
import { financeRouter } from "@/server/trpc/routers/finance";
import { setupRouter } from "@/server/trpc/routers/shared/setup";

export const appRouter = createTRPCRouter({
  setup: setupRouter,
  finance: financeRouter,
  contracting: contractingRouter,
});

export type AppRouter = typeof appRouter;
