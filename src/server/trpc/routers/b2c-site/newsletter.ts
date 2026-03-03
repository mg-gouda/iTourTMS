import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

export const newsletterRouter = createTRPCRouter({
  listSubscribers: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.newsletterSubscriber.findMany({
      where: { companyId },
      orderBy: { subscribedAt: "desc" },
    });
  }),

  exportCsv: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    const subs = await ctx.db.newsletterSubscriber.findMany({
      where: { companyId, active: true },
      select: { email: true, subscribedAt: true },
      orderBy: { subscribedAt: "desc" },
    });

    const header = "email,subscribed_at";
    const rows = subs.map(
      (s) => `${s.email},${s.subscribedAt.toISOString()}`,
    );
    return [header, ...rows].join("\n");
  }),
});
