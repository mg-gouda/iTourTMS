import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBoatCreateSchema, cruiseBoatUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseBoatRouter = createTRPCRouter({
  list: p("nile-cruises:boat:read").query(async ({ ctx }) => {
    return ctx.db.cruiseBoat.findMany({
      where: { companyId: ctx.companyId },
      include: {
        operatorPartner: { select: { id: true, name: true } },
        _count: { select: { cabins: true, departures: true, contracts: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: p("nile-cruises:boat:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBoat.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          operatorPartner: { select: { id: true, name: true } },
          decks: { orderBy: { sortOrder: "asc" } },
          cabinCategories: { orderBy: { sortOrder: "asc" } },
          amenities: { orderBy: { name: "asc" } },
          images: { orderBy: { sortOrder: "asc" } },
          _count: { select: { cabins: true, departures: true, contracts: true } },
        },
      });
    }),

  create: p("nile-cruises:boat:create")
    .input(cruiseBoatCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoat.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), data: cruiseBoatUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoat.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("nile-cruises:boat:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoat.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  setActive: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoat.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { active: input.active },
      });
    }),

  listImages: p("nile-cruises:boat:read")
    .input(z.object({ boatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBoatImage.findMany({
        where: { boatId: input.boatId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  addImage: p("nile-cruises:boat:update")
    .input(z.object({ boatId: z.string(), url: z.string(), caption: z.string().optional(), isPrimary: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoatImage.create({ data: input });
    }),

  deleteImage: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoatImage.delete({ where: { id: input.id } });
    }),

  listAmenities: p("nile-cruises:boat:read")
    .input(z.object({ boatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBoatAmenity.findMany({
        where: { boatId: input.boatId },
        orderBy: { name: "asc" },
      });
    }),

  createAmenity: p("nile-cruises:boat:update")
    .input(z.object({ boatId: z.string(), name: z.string(), iconKey: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoatAmenity.create({ data: input });
    }),

  deleteAmenity: p("nile-cruises:boat:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBoatAmenity.delete({ where: { id: input.id } });
    }),
});
