import { z } from "zod";

import { guestCreateSchema, guestUpdateSchema } from "@/lib/validations/reservations";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("reservations");

export const guestRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          search: z.string().optional(),
          nationality: z.string().optional(),
          isVip: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { companyId: ctx.companyId };

      if (input?.search) {
        const s = input.search;
        where.OR = [
          { firstName: { contains: s, mode: "insensitive" } },
          { lastName: { contains: s, mode: "insensitive" } },
          { email: { contains: s, mode: "insensitive" } },
          { passportNo: { contains: s, mode: "insensitive" } },
          { phone: { contains: s, mode: "insensitive" } },
        ];
      }
      if (input?.nationality) where.nationality = input.nationality;
      if (input?.isVip !== undefined) where.isVip = input.isVip;

      return ctx.db.guest.findMany({
        where,
        include: {
          country: { select: { id: true, name: true, code: true } },
          _count: { select: { bookingGuests: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.guest.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: { select: { id: true, name: true, code: true } },
          bookingGuests: {
            include: {
              booking: {
                select: {
                  id: true,
                  code: true,
                  status: true,
                  checkIn: true,
                  checkOut: true,
                  hotel: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });
    }),

  create: proc
    .input(guestCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.guest.create({
        data: {
          ...input,
          passportExpiry: input.passportExpiry ? new Date(input.passportExpiry) : null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          companyId: ctx.companyId,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: guestUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (input.data.passportExpiry !== undefined) {
        data.passportExpiry = input.data.passportExpiry ? new Date(input.data.passportExpiry) : null;
      }
      if (input.data.dateOfBirth !== undefined) {
        data.dateOfBirth = input.data.dateOfBirth ? new Date(input.data.dateOfBirth) : null;
      }
      return ctx.db.guest.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.bookingGuest.count({ where: { guestId: input.id } });
      if (count > 0) {
        throw new Error("Cannot delete guest with existing bookings");
      }
      return ctx.db.guest.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  search: proc
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.guest.findMany({
        where: {
          companyId: ctx.companyId,
          OR: [
            { firstName: { contains: input.query, mode: "insensitive" } },
            { lastName: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
            { passportNo: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          passportNo: true,
          nationality: true,
          isVip: true,
        },
        take: 20,
        orderBy: { lastName: "asc" },
      });
    }),
});
