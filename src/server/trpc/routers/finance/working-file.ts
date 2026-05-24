import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

export const workingFileRouter = createTRPCRouter({
  list: p("finance:settings:read")
    .input(z.object({ state: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workingFile.findMany({
        where: { companyId: ctx.companyId, ...(input.state ? { state: input.state } : {}) },
        include: { period: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: p("finance:settings:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const wf = await ctx.db.workingFile.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { period: { select: { id: true, name: true } } },
      });
      if (!wf) throw new TRPCError({ code: "NOT_FOUND" });
      return wf;
    }),

  create: p("finance:settings:create")
    .input(z.object({
      name: z.string().min(1),
      periodId: z.string().optional(),
      assignedTo: z.string().optional(),
      dueDate: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workingFile.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        },
      });
    }),

  update: p("finance:settings:update")
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      periodId: z.string().optional().nullable(),
      assignedTo: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      conclusion: z.string().optional().nullable(),
      state: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, dueDate, ...rest } = input;
      return ctx.db.workingFile.update({
        where: { id, companyId: ctx.companyId },
        data: { ...rest, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}) },
      });
    }),

  delete: p("finance:settings:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workingFile.delete({ where: { id: input.id, companyId: ctx.companyId } });
    }),
});
