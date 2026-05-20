import { z } from "zod";

import {
  programCreateSchema,
  programUpdateSchema,
  programItemCreateSchema,
  programItemUpdateSchema,
} from "@/lib/validations/crm";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("crm", code);

export const programRouter = createTRPCRouter({
  listByExcursion: p("crm:excursion:read")
    .input(z.object({ excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify excursion belongs to company
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmExcursionProgram.findMany({
        where: { excursionId: input.excursionId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: p("crm:excursion:create")
    .input(programCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmExcursionProgram.create({
        data: {
          excursionId: input.excursionId,
          dayNumber: input.dayNumber,
          title: input.title,
          description: input.description || null,
          sortOrder: input.sortOrder,
        },
      });
    }),

  update: p("crm:excursion:update")
    .input(z.object({ id: z.string(), data: programUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through excursion
      const program = await ctx.db.crmExcursionProgram.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (program.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      const data: Record<string, unknown> = { ...input.data };
      if (data.description !== undefined) data.description = data.description || null;
      return ctx.db.crmExcursionProgram.update({
        where: { id: input.id },
        data,
      });
    }),

  delete: p("crm:excursion:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.crmExcursionProgram.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (program.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.crmExcursionProgram.delete({ where: { id: input.id } });
    }),

  // ── Program Items ──

  createItem: p("crm:excursion:create")
    .input(programItemCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.crmExcursionProgram.findFirstOrThrow({
        where: { id: input.programId },
        include: { excursion: { select: { companyId: true } } },
      });
      if (program.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.crmProgramItem.create({
        data: {
          programId: input.programId,
          time: input.time || null,
          title: input.title,
          description: input.description || null,
          location: input.location || null,
          sortOrder: input.sortOrder,
        },
      });
    }),

  updateItem: p("crm:excursion:update")
    .input(z.object({ id: z.string(), data: programItemUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.crmProgramItem.findFirstOrThrow({
        where: { id: input.id },
        include: { program: { include: { excursion: { select: { companyId: true } } } } },
      });
      if (item.program.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      const data: Record<string, unknown> = { ...input.data };
      if (data.time !== undefined) data.time = data.time || null;
      if (data.description !== undefined) data.description = data.description || null;
      if (data.location !== undefined) data.location = data.location || null;
      return ctx.db.crmProgramItem.update({ where: { id: input.id }, data });
    }),

  deleteItem: p("crm:excursion:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.crmProgramItem.findFirstOrThrow({
        where: { id: input.id },
        include: { program: { include: { excursion: { select: { companyId: true } } } } },
      });
      if (item.program.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.crmProgramItem.delete({ where: { id: input.id } });
    }),
});
