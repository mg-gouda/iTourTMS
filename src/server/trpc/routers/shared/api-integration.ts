import crypto from "crypto";

import { z } from "zod";

import { generateApiKey } from "@/server/api-auth";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { dispatchWebhooks } from "@/server/services/contracting/webhook-dispatcher";

const proc = protectedProcedure;

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export const apiIntegrationRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.apiIntegration.findMany({
      where: { companyId: ctx.session.user.companyId! },
      include: {
        tourOperator: { select: { id: true, name: true, code: true } },
        apiKey: { select: { id: true, keyPrefix: true, active: true, lastUsedAt: true } },
        hotels: {
          include: { hotel: { select: { id: true, name: true, code: true } } },
        },
        _count: { select: { webhookDeliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.apiIntegration.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.session.user.companyId! },
        include: {
          tourOperator: { select: { id: true, name: true, code: true } },
          apiKey: { select: { id: true, keyPrefix: true, active: true, lastUsedAt: true, createdAt: true } },
          hotels: {
            include: { hotel: { select: { id: true, name: true, code: true } } },
          },
          webhookDeliveries: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });
    }),

  create: proc
    .input(
      z.object({
        tourOperatorId: z.string(),
        hotelIds: z.array(z.string()).min(1),
        webhookUrl: z.string().url().optional(),
        webhookSecret: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;

      // Generate API key
      const to = await ctx.db.tourOperator.findFirstOrThrow({
        where: { id: input.tourOperatorId, companyId },
        select: { name: true, code: true },
      });

      const keyResult = await generateApiKey(companyId, `API: ${to.name}`);

      // Create integration
      const integration = await ctx.db.apiIntegration.create({
        data: {
          companyId,
          tourOperatorId: input.tourOperatorId,
          apiKeyId: keyResult.id,
          webhookUrl: input.webhookUrl ?? null,
          webhookSecret: input.webhookSecret ?? null,
          notes: input.notes ?? null,
          hotels: {
            create: input.hotelIds.map((hotelId) => ({ hotelId })),
          },
        },
        include: {
          tourOperator: { select: { id: true, name: true, code: true } },
          apiKey: { select: { id: true, keyPrefix: true } },
        },
      });

      return {
        integration,
        plainKey: keyResult.plainKey, // returned once only
      };
    }),

  update: proc
    .input(
      z.object({
        id: z.string(),
        hotelIds: z.array(z.string()).optional(),
        webhookUrl: z.string().url().nullable().optional(),
        webhookSecret: z.string().nullable().optional(),
        active: z.boolean().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const integration = await ctx.db.apiIntegration.findFirstOrThrow({
        where: { id: input.id, companyId },
      });

      // Update hotels if provided (delete-all + create)
      if (input.hotelIds) {
        await ctx.db.$transaction(async (tx) => {
          await tx.apiIntegrationHotel.deleteMany({
            where: { apiIntegrationId: integration.id },
          });
          if (input.hotelIds!.length > 0) {
            await tx.apiIntegrationHotel.createMany({
              data: input.hotelIds!.map((hotelId) => ({
                apiIntegrationId: integration.id,
                hotelId,
              })),
            });
          }
        });
      }

      // Update integration fields
      const data: Record<string, unknown> = {};
      if (input.webhookUrl !== undefined) data.webhookUrl = input.webhookUrl;
      if (input.webhookSecret !== undefined) data.webhookSecret = input.webhookSecret;
      if (input.active !== undefined) data.active = input.active;
      if (input.notes !== undefined) data.notes = input.notes;

      if (Object.keys(data).length > 0) {
        await ctx.db.apiIntegration.update({
          where: { id: integration.id },
          data,
        });
      }

      return ctx.db.apiIntegration.findFirstOrThrow({
        where: { id: integration.id },
        include: {
          tourOperator: { select: { id: true, name: true, code: true } },
          apiKey: { select: { id: true, keyPrefix: true, active: true, lastUsedAt: true } },
          hotels: {
            include: { hotel: { select: { id: true, name: true, code: true } } },
          },
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const integration = await ctx.db.apiIntegration.findFirstOrThrow({
        where: { id: input.id, companyId },
        select: { id: true, apiKeyId: true },
      });

      // Delete integration (cascades hotels, deliveries) then the API key
      await ctx.db.$transaction(async (tx) => {
        await tx.apiIntegration.delete({ where: { id: integration.id } });
        await tx.apiKey.delete({ where: { id: integration.apiKeyId } });
      });

      return { success: true };
    }),

  regenerateKey: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const integration = await ctx.db.apiIntegration.findFirstOrThrow({
        where: { id: input.id, companyId },
        include: {
          apiKey: { select: { id: true, name: true } },
        },
      });

      // Deactivate old key
      await ctx.db.apiKey.update({
        where: { id: integration.apiKeyId },
        data: { active: false },
      });

      // Generate new key
      const keyResult = await generateApiKey(companyId, integration.apiKey.name);

      // Link new key to integration
      await ctx.db.apiIntegration.update({
        where: { id: integration.id },
        data: { apiKeyId: keyResult.id },
      });

      return { plainKey: keyResult.plainKey, keyPrefix: keyResult.keyPrefix };
    }),

  testWebhook: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const integration = await ctx.db.apiIntegration.findFirstOrThrow({
        where: { id: input.id, companyId },
        select: { id: true, webhookUrl: true, webhookSecret: true, hotels: { select: { hotelId: true }, take: 1 } },
      });

      if (!integration.webhookUrl) {
        throw new Error("No webhook URL configured");
      }

      // Use first hotel or a dummy ID
      const hotelId = integration.hotels[0]?.hotelId ?? "test";

      await dispatchWebhooks(companyId, hotelId, "test.ping", {
        message: "This is a test webhook from iTourTMS",
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    }),

  listDeliveries: proc
    .input(
      z.object({
        integrationId: z.string(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      // Verify ownership
      await ctx.db.apiIntegration.findFirstOrThrow({
        where: { id: input.integrationId, companyId },
        select: { id: true },
      });

      const [deliveries, total] = await Promise.all([
        ctx.db.webhookDelivery.findMany({
          where: { apiIntegrationId: input.integrationId },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.webhookDelivery.count({
          where: { apiIntegrationId: input.integrationId },
        }),
      ]);

      return { deliveries, total, page: input.page, pageSize: input.pageSize };
    }),
});
