import { createTRPCRouter } from "@/server/trpc";
import { contractingRouter } from "@/server/trpc/routers/contracting";
import { financeRouter } from "@/server/trpc/routers/finance";
import { apiIntegrationRouter } from "@/server/trpc/routers/shared/api-integration";
import { settingsRouter } from "@/server/trpc/routers/shared/settings";
import { setupRouter } from "@/server/trpc/routers/shared/setup";
import { userRouter } from "@/server/trpc/routers/shared/user";

export const appRouter = createTRPCRouter({
  setup: setupRouter,
  settings: settingsRouter,
  user: userRouter,
  finance: financeRouter,
  contracting: contractingRouter,
  apiIntegration: apiIntegrationRouter,
});

export type AppRouter = typeof appRouter;
