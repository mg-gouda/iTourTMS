import { z } from "zod";

import { repCreateSchema, repUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("traffic", code);

export const repRouter = createTRPCRouter({
  list: p("traffic:driver:read").query(async ({ ctx }) => {
    return ctx.db.ttRep.findMany({
      where: { companyId: ctx.companyId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { repZones: true, assignments: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
  }),

  getById: p("traffic:driver:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttRep.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          repZones: {
            include: {
              zone: {
                select: { id: true, name: true, code: true, city: { select: { name: true } } },
              },
            },
          },
          assignments: {
            take: 20,
            orderBy: { assignedAt: "desc" },
            include: {
              job: { select: { id: true, code: true, serviceDate: true, serviceType: true, status: true } },
            },
          },
        },
      });
    }),

  create: p("traffic:driver:create")
    .input(repCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.ttRep.findFirst({
        where: { userId: input.userId },
      });
      if (existing) {
        throw new Error("This user is already registered as a rep.");
      }
      return ctx.db.ttRep.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("traffic:driver:update")
    .input(z.object({ id: z.string(), data: repUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttRep.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("traffic:driver:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttRep.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  assignZones: p("traffic:driver:update")
    .input(z.object({ repId: z.string(), zoneIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Delete existing, then create new
      await ctx.db.ttRepZone.deleteMany({
        where: { repId: input.repId, companyId: ctx.companyId },
      });
      if (input.zoneIds.length === 0) return { count: 0 };
      return ctx.db.ttRepZone.createMany({
        data: input.zoneIds.map((zoneId) => ({
          companyId: ctx.companyId,
          repId: input.repId,
          zoneId,
        })),
      });
    }),
});
