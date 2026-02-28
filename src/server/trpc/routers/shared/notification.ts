import { z } from "zod";

import { createTRPCRouter } from "@/server/trpc";
import { protectedProcedure } from "@/server/trpc";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.findMany({
      where: {
        recipientId: ctx.session.user.id,
        companyId: ctx.user.companyId!,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.count({
      where: {
        recipientId: ctx.session.user.id,
        companyId: ctx.user.companyId!,
        read: false,
      },
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.update({
        where: { id: input.id },
        data: { read: true, readAt: new Date() },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: {
        recipientId: ctx.session.user.id,
        companyId: ctx.user.companyId!,
        read: false,
      },
      data: { read: true, readAt: new Date() },
    });
    return { success: true };
  }),
});
