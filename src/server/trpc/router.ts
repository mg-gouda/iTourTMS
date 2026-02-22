import { createTRPCRouter } from "@/server/trpc";
import { setupRouter } from "@/server/trpc/routers/shared/setup";

export const appRouter = createTRPCRouter({
  setup: setupRouter,
});

export type AppRouter = typeof appRouter;
