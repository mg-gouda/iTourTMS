import { z } from "zod";

import { ttZoneCreateSchema, ttZoneUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const zoneRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.ttZone.findMany({
      where: { companyId: ctx.companyId },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            code: true,
            destination: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ city: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttZone.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          city: { select: { id: true, name: true, code: true } },
          repZones: {
            include: { rep: { include: { user: { select: { id: true, name: true } } } } },
          },
        },
      });
    }),

  create: proc
    .input(ttZoneCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttZone.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: ttZoneUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttZone.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttZone.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
