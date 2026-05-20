import { z } from "zod";

import {
  cancellationPolicyCreateSchema,
  cancellationPolicyUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import type { PrismaClient } from "@prisma/client";

const p = (code: string) => modulePermissionProcedure("contracting", code);

async function verifyContract(
  db: PrismaClient,
  contractId: string,
  companyId: string,
) {
  await db.contract.findFirstOrThrow({
    where: { id: contractId, companyId },
  });
}

export const cancellationPolicyRouter = createTRPCRouter({
  listByContract: p("contracting:policy:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractCancellationPolicy.findMany({
        where: { contractId: input.contractId },
        orderBy: { daysBefore: "desc" },
      });
    }),

  create: p("contracting:policy:create")
    .input(cancellationPolicyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractCancellationPolicy.create({
        data: {
          contractId: input.contractId,
          daysBefore: input.daysBefore,
          chargeType: input.chargeType,
          chargeValue: input.chargeValue,
          description: input.description ?? null,
          sortOrder: input.sortOrder,
        },
      });
    }),

  update: p("contracting:policy:update")
    .input(cancellationPolicyUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.contractCancellationPolicy.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (policy.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      const data: Record<string, unknown> = {};
      if (input.daysBefore !== undefined) data.daysBefore = input.daysBefore;
      if (input.chargeType !== undefined) data.chargeType = input.chargeType;
      if (input.chargeValue !== undefined) data.chargeValue = input.chargeValue;
      if (input.description !== undefined) data.description = input.description ?? null;
      if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

      return ctx.db.contractCancellationPolicy.update({
        where: { id: input.id },
        data,
      });
    }),

  delete: p("contracting:policy:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.contractCancellationPolicy.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (policy.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.contractCancellationPolicy.delete({
        where: { id: input.id },
      });
    }),
});
