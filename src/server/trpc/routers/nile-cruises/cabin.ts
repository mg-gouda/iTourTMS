import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseCabinCreateSchema, cruiseCabinUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseCabinRouter = createTRPCRouter({
  listByBoat: p("nile-cruises:boat:read")
    .input(z.object({ boatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseCabin.findMany({
        where: { boatId: input.boatId },
        include: {
          deck: true,
          category: true,
        },
        orderBy: [{ deck: { sortOrder: "asc" } }, { cabinNumber: "asc" }],
      });
    }),

  listByDeck: p("nile-cruises:boat:read")
    .input(z.object({ deckId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseCabin.findMany({
        where: { deckId: input.deckId },
        include: { category: true },
        orderBy: { cabinNumber: "asc" },
      });
    }),

  getById: p("nile-cruises:boat:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseCabin.findFirstOrThrow({
        where: { id: input.id },
        include: { deck: true, category: true },
      });
    }),

  create: p("nile-cruises:boat:update")
    .input(cruiseCabinCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCabin.create({ data: input });
    }),

  update: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), data: cruiseCabinUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCabin.update({ where: { id: input.id }, data: input.data });
    }),

  delete: p("nile-cruises:boat:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCabin.delete({ where: { id: input.id } });
    }),

  bulkCreate: p("nile-cruises:boat:update")
    .input(z.object({
      boatId: z.string(),
      cabins: z.array(cruiseCabinCreateSchema.omit({ boatId: true })),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseCabin.createMany({
        data: input.cabins.map((c) => ({ ...c, boatId: input.boatId })),
        skipDuplicates: true,
      });
    }),

  bulkSave: p("nile-cruises:boat:update")
    .input(z.object({
      boatId: z.string(),
      cabins: z.array(cruiseCabinCreateSchema.omit({ boatId: true })),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseCabin.deleteMany({ where: { boatId: input.boatId } });
      return ctx.db.cruiseCabin.createMany({
        data: input.cabins.map((c) => ({ ...c, boatId: input.boatId })),
      });
    }),

  listOutOfOrder: p("nile-cruises:boat:read")
    .input(z.object({ cabinId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cabinOutOfOrder.findMany({
        where: { cabinId: input.cabinId },
        orderBy: { fromDate: "desc" },
      });
    }),

  markOutOfOrder: p("nile-cruises:boat:update")
    .input(z.object({
      cabinId: z.string(),
      fromDate: z.string(),
      toDate: z.string(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cabinOutOfOrder.create({
        data: {
          cabinId: input.cabinId,
          fromDate: new Date(input.fromDate),
          toDate: new Date(input.toDate),
          reason: input.reason,
          createdById: ctx.session.user.id,
        },
      });
    }),

  clearOutOfOrder: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cabinOutOfOrder.delete({ where: { id: input.id } });
    }),
});
