import { z } from "zod";

import { seasonSpoBulkSaveSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { maybeDispatchContractWebhook } from "@/server/services/contracting/webhook-dispatcher";
import type { PrismaClient } from "@prisma/client";

const p = (code: string) => modulePermissionProcedure("contracting", code);

const SPO_INCLUDE = {
  roomSupplements: {
    include: { roomType: { select: { id: true, name: true, code: true } } },
  },
  travelDates: { orderBy: { sortOrder: "asc" as const } },
  btcPeriods: { orderBy: { sortOrder: "asc" as const } },
} as const;

async function verifyContract(db: PrismaClient, contractId: string, companyId: string) {
  await db.contract.findFirstOrThrow({ where: { id: contractId, companyId } });
}

export const seasonSpoRouter = createTRPCRouter({
  getById: p("contracting:offer:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const spo = await ctx.db.contractSeasonSpo.findFirstOrThrow({
        where: { id: input.id },
        include: {
          ...SPO_INCLUDE,
          contract: {
            select: {
              companyId: true,
              id: true,
              name: true,
              hotel: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });
      if (spo.contract.companyId !== ctx.companyId) throw new Error("Not found");
      return spo;
    }),

  listByContract: p("contracting:offer:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);
      return ctx.db.contractSeasonSpo.findMany({
        where: { contractId: input.contractId },
        orderBy: [{ spoType: "asc" }, { sortOrder: "asc" }],
        include: SPO_INCLUDE,
      });
    }),

  // Smart upsert: update existing SPOs (preserving their IDs), create new ones,
  // delete removed ones. This keeps SPO codes stable across saves.
  bulkSave: p("contracting:offer:import")
    .input(seasonSpoBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContract(ctx.db, input.contractId, ctx.companyId);

      return ctx.db.$transaction(async (tx) => {
        // Existing SPOs of this type for this contract
        const existing = await tx.contractSeasonSpo.findMany({
          where: { contractId: input.contractId, spoType: input.spoType },
          select: { id: true },
        });

        // IDs provided by the client (items that already exist)
        const inputIds = new Set(
          input.items.filter((i) => i.id).map((i) => i.id as string),
        );

        // Delete SPOs that were removed from the list
        const toDelete = existing.filter((e) => !inputIds.has(e.id)).map((e) => e.id);
        if (toDelete.length > 0) {
          await tx.contractSeasonSpo.deleteMany({ where: { id: { in: toDelete } } });
        }

        // Upsert each item
        const results = await Promise.all(
          input.items.map(async (item, idx) => {
            const commonData = {
              spoType: input.spoType,
              name: item.name ?? null,
              dateFrom: item.dateFrom ? new Date(item.dateFrom) : null,
              dateTo: item.dateTo ? new Date(item.dateTo) : null,
              basePp: item.basePp ?? null,
              sglSup: item.sglSup ?? null,
              thirdAdultRed: item.thirdAdultRed ?? null,
              firstChildPct: item.firstChildPct ?? null,
              secondChildPct: item.secondChildPct ?? null,
              bookFrom: item.bookFrom ? new Date(item.bookFrom) : null,
              bookTo: item.bookTo ? new Date(item.bookTo) : null,
              value: item.value ?? null,
              valueType: item.valueType ?? null,
              excludedRoomTypeIds: item.excludedRoomTypeIds ?? [],
              active: item.active,
              sortOrder: idx,
            };

            const travelDatesCreate = item.travelDates?.length
              ? {
                  create: item.travelDates.map((td, tdIdx) => ({
                    dateFrom: new Date(td.dateFrom),
                    dateTo: new Date(td.dateTo),
                    sortOrder: tdIdx,
                    basePp: td.basePp ?? null,
                    sglSup: td.sglSup ?? null,
                    thirdAdultRed: td.thirdAdultRed ?? null,
                    firstChildPct: td.firstChildPct ?? null,
                    secondChildPct: td.secondChildPct ?? null,
                    value: td.value ?? null,
                    valueType: td.valueType ?? null,
                  })),
                }
              : undefined;

            const roomSupsCreate = item.roomSupplements?.length
              ? {
                  create: item.roomSupplements.map((rs) => ({
                    roomTypeId: rs.roomTypeId,
                    value: rs.value,
                    valueType: rs.valueType,
                  })),
                }
              : undefined;

            if (item.id) {
              // Verify this ID belongs to the current contract (security)
              const owned = existing.some((e) => e.id === item.id);
              if (!owned) throw new Error(`SPO ${item.id} not found on this contract`);

              // Delete child records then recreate
              await tx.contractSeasonSpoDate.deleteMany({ where: { spoId: item.id } });
              await tx.contractSeasonSpoRoomSup.deleteMany({ where: { spoId: item.id } });

              return tx.contractSeasonSpo.update({
                where: { id: item.id },
                data: {
                  ...commonData,
                  travelDates: travelDatesCreate,
                  roomSupplements: roomSupsCreate,
                },
                include: SPO_INCLUDE,
              });
            } else {
              return tx.contractSeasonSpo.create({
                data: {
                  contractId: input.contractId,
                  ...commonData,
                  travelDates: travelDatesCreate,
                  roomSupplements: roomSupsCreate,
                },
                include: SPO_INCLUDE,
              });
            }
          }),
        );

        maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "spo.updated");
        return results;
      });
    }),

  toggleActive: p("contracting:offer:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.contractSeasonSpo.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (row.contract.companyId !== ctx.companyId) throw new Error("Not found");
      return ctx.db.contractSeasonSpo.update({
        where: { id: input.id },
        data: { active: !row.active },
      });
    }),

  deleteRow: p("contracting:offer:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.contractSeasonSpo.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (row.contract.companyId !== ctx.companyId) throw new Error("Not found");
      return ctx.db.contractSeasonSpo.delete({ where: { id: input.id } });
    }),
});
