import { createTRPCRouter } from "@/server/trpc";
import { contractingRouter } from "@/server/trpc/routers/contracting";
import { financeRouter } from "@/server/trpc/routers/finance";
import { reservationsRouter } from "@/server/trpc/routers/reservations";
import { trafficRouter } from "@/server/trpc/routers/traffic";
import { b2cSiteRouter } from "@/server/trpc/routers/b2c-site";
import { b2bPortalRouter } from "@/server/trpc/routers/b2b-portal";
import { crmRouter } from "@/server/trpc/routers/crm";
import { apiIntegrationRouter } from "@/server/trpc/routers/shared/api-integration";
import { settingsRouter } from "@/server/trpc/routers/shared/settings";
import { setupRouter } from "@/server/trpc/routers/shared/setup";
import { userRouter } from "@/server/trpc/routers/shared/user";
import { notificationRouter } from "@/server/trpc/routers/shared/notification";
import { giataRouter } from "@/server/trpc/routers/shared/giata";

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
  giata: giataRouter,
  crm: crmRouter,
  b2cSite: b2cSiteRouter,
  b2bPortal: b2bPortalRouter,
});

export type AppRouter = typeof appRouter;
