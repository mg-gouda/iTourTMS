import { z } from "zod";

import { airportCreateSchema, airportUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("traffic", code);

export const airportRouter = createTRPCRouter({
  list: p("traffic:airport:read").query(async ({ ctx }) => {
    return ctx.db.airport.findMany({
      include: {
        country: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: p("traffic:airport:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.airport.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          country: { select: { id: true, name: true, code: true } },
        },
      });
    }),

  create: p("traffic:airport:create")
    .input(airportCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.airport.findFirst({
        where: { code: input.code },
      });
      if (existing) {
        throw new Error(`An airport with code "${input.code}" already exists.`);
      }
      return ctx.db.airport.create({ data: input });
    }),

  update: p("traffic:airport:update")
    .input(z.object({ id: z.string(), data: airportUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.airport.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: p("traffic:airport:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.airport.delete({ where: { id: input.id } });
    }),
});
