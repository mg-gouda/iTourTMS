import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { contractRoomTypeCreateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const contractRoomTypeRouter = createTRPCRouter({
  list: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractRoomType.findMany({
        where: { contractId: input.contractId },
        include: {
          roomType: { select: { id: true, name: true, code: true, maxAdults: true, maxChildren: true } },
        },
        orderBy: { sortOrder: "asc" },
      });
    }),

  add: proc
    .input(contractRoomTypeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      // Verify room type belongs to contract's hotel
      await ctx.db.hotelRoomType.findFirstOrThrow({
        where: { id: input.roomTypeId, hotelId: contract.hotelId },
      });

      return ctx.db.contractRoomType.create({
        data: input,
      });
    }),

  remove: proc
    .input(z.object({ id: z.string(), contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      const assignment = await ctx.db.contractRoomType.findUniqueOrThrow({
        where: { id: input.id },
      });

      if (assignment.isBase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the base room type from the contract",
        });
      }

      return ctx.db.contractRoomType.delete({ where: { id: input.id } });
    }),
});
