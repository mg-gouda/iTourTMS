import { createTRPCRouter } from "@/server/trpc";
import { contractingRouter } from "@/server/trpc/routers/contracting";
import { financeRouter } from "@/server/trpc/routers/finance";
import { reservationsRouter } from "@/server/trpc/routers/reservations";
import { trafficRouter } from "@/server/trpc/routers/traffic";
import { apiIntegrationRouter } from "@/server/trpc/routers/shared/api-integration";
import { settingsRouter } from "@/server/trpc/routers/shared/settings";
import { setupRouter } from "@/server/trpc/routers/shared/setup";
import { userRouter } from "@/server/trpc/routers/shared/user";
import { notificationRouter } from "@/server/trpc/routers/shared/notification";

export const appRouter = createTRPCRouter({
  setup: setupRouter,
  settings: settingsRouter,
  user: userRouter,
  finance: financeRouter,
  contracting: contractingRouter,
  reservations: reservationsRouter,
  traffic: trafficRouter,
  apiIntegration: apiIntegrationRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
