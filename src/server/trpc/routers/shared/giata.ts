import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  searchGiataByName,
  getGiataProperty,
  enrichFromGiata,
} from "@/server/services/shared/giata";

async function getApiKey(ctx: { db: typeof import("@/server/db").db; session: { user: { companyId?: string | null } } }): Promise<string> {
  const companyId = ctx.session.user.companyId;
  if (!companyId) throw new Error("No company associated with this session");

  const company = await ctx.db.company.findUnique({
    where: { id: companyId },
    select: { giataApiKey: true },
  });

  if (!company?.giataApiKey) {
    throw new Error(
      "GIATA API key is not configured. Go to Settings → Integrations → GIATA to add your key.",
    );
  }
  return company.giataApiKey;
}

export const giataRouter = createTRPCRouter({
  /**
   * Search GIATA by hotel name (+ optional country code)
   */
  search: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        countryCode: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const apiKey = await getApiKey(ctx);
      return searchGiataByName(apiKey, input.name, input.countryCode);
    }),

  /**
   * Fetch a single GIATA property by GIATA ID
   */
  getProperty: protectedProcedure
    .input(z.object({ giataId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const apiKey = await getApiKey(ctx);
      return getGiataProperty(apiKey, input.giataId);
    }),

  /**
   * Enrich a hotel with GIATA data (description, address, coordinates, images)
   */
  enrich: protectedProcedure
    .input(
      z.object({
        hotelId: z.string(),
        giataId: z.number().int().positive(),
        fields: z
          .object({
            description: z.boolean().default(true),
            address: z.boolean().default(true),
            coordinates: z.boolean().default(true),
            images: z.boolean().default(true),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const apiKey = await getApiKey(ctx);
      const fields = input.fields ?? {
        description: true,
        address: true,
        coordinates: true,
        images: true,
      };

      const hotel = await ctx.db.hotel.findFirst({
        where: { id: input.hotelId, companyId },
        select: { id: true },
      });
      if (!hotel) throw new Error("Hotel not found");

      const data = await enrichFromGiata(apiKey, input.giataId);

      const updateData: Record<string, unknown> = { giataId: data.giataId };
      if (fields.description && data.description) updateData.description = data.description;
      if (fields.address) {
        if (data.address) updateData.address = data.address;
        if (data.zipCode) updateData.zipCode = data.zipCode;
      }
      if (fields.coordinates) {
        if (data.latitude != null) updateData.latitude = data.latitude;
        if (data.longitude != null) updateData.longitude = data.longitude;
      }

      await ctx.db.hotel.update({ where: { id: input.hotelId }, data: updateData });

      if (fields.images && data.images.length > 0) {
        await ctx.db.hotelImage.deleteMany({
          where: { hotelId: input.hotelId, url: { contains: "giatamedia" } },
        });
        await ctx.db.hotelImage.createMany({
          data: data.images
            .filter((img) => img.url)
            .map((img) => ({
              hotelId: input.hotelId,
              url: img.url,
              caption: img.caption ?? null,
              sortOrder: img.sortOrder,
            })),
        });
      }

      return { success: true, giataId: data.giataId, imagesImported: data.images.length };
    }),

  /**
   * Save giataId link only (no enrichment)
   */
  link: protectedProcedure
    .input(z.object({ hotelId: z.string(), giataId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const hotel = await ctx.db.hotel.findFirst({
        where: { id: input.hotelId, companyId },
        select: { id: true },
      });
      if (!hotel) throw new Error("Hotel not found");

      await ctx.db.hotel.update({
        where: { id: input.hotelId },
        data: { giataId: input.giataId },
      });
      return { success: true };
    }),

  /**
   * Remove GIATA link from a hotel
   */
  unlink: protectedProcedure
    .input(z.object({ hotelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const hotel = await ctx.db.hotel.findFirst({
        where: { id: input.hotelId, companyId },
        select: { id: true },
      });
      if (!hotel) throw new Error("Hotel not found");

      await ctx.db.hotel.update({
        where: { id: input.hotelId },
        data: { giataId: null },
      });
      return { success: true };
    }),
});
