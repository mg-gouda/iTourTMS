import { createTRPCRouter } from "@/server/trpc";
import { financeRouter } from "@/server/trpc/routers/finance";
import { setupRouter } from "@/server/trpc/routers/shared/setup";

export const appRouter = createTRPCRouter({
  setup: setupRouter,
  finance: financeRouter,
});

export type AppRouter = typeof appRouter;
