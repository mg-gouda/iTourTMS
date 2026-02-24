import { z } from "zod";

import { seasonSpoBulkSaveSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import type { PrismaClient } from "@prisma/client";

const proc = moduleProcedure("contracting");

async function verifyContract(
  db: PrismaClient,
  contractId: string,
  companyId: string,
) {
  await db.contract.findFirstOrThrow({
    where: { id: contractId, companyId },
  });
}

export const seasonSpoRouter = createTRPCRouter({
  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractSeasonSpo.findMany({
        where: { contractId: input.contractId },
        orderBy: [{ spoType: "asc" }, { sortOrder: "asc" }],
      });
    }),

  bulkSave: proc
    .input(seasonSpoBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      return ctx.db.$transaction(async (tx) => {
        // Delete all existing rows of this spoType for this contract
        await tx.contractSeasonSpo.deleteMany({
          where: {
            contractId: input.contractId,
            spoType: input.spoType,
          },
        });

        // Create new rows
        if (input.items.length === 0) return [];

        const created = await Promise.all(
          input.items.map((item, idx) =>
            tx.contractSeasonSpo.create({
              data: {
                contractId: input.contractId,
                spoType: input.spoType,
                dateFrom: new Date(item.dateFrom),
                dateTo: new Date(item.dateTo),
                basePp: item.basePp ?? null,
                sglSup: item.sglSup ?? null,
                thirdAdultRed: item.thirdAdultRed ?? null,
                firstChildPct: item.firstChildPct ?? null,
                secondChildPct: item.secondChildPct ?? null,
                bookFrom: item.bookFrom ? new Date(item.bookFrom) : null,
                bookTo: item.bookTo ? new Date(item.bookTo) : null,
                value: item.value ?? null,
                valueType: item.valueType ?? null,
                active: item.active,
                sortOrder: idx,
              },
            }),
          ),
        );
        return created;
      });
    }),

  toggleActive: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.contractSeasonSpo.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (row.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.contractSeasonSpo.update({
        where: { id: input.id },
        data: { active: !row.active },
      });
    }),

  deleteRow: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.contractSeasonSpo.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (row.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.contractSeasonSpo.delete({
        where: { id: input.id },
      });
    }),
});
