import { z } from "zod";

import { customerCreateSchema, customerUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const customerRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.crmCustomer.findMany({
      where: { companyId: ctx.companyId },
      include: {
        partner: { select: { id: true, name: true } },
        _count: { select: { activities: true, opportunities: true, bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmCustomer.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          partner: { select: { id: true, name: true } },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { assignedTo: { select: { id: true, name: true } } },
          },
          opportunities: {
            orderBy: { createdAt: "desc" },
            include: { owner: { select: { id: true, name: true } } },
          },
          bookings: {
            orderBy: { travelDate: "desc" },
            select: {
              id: true,
              code: true,
              status: true,
              travelDate: true,
              paxAdults: true,
              paxChildren: true,
              paxInfants: true,
              totalSelling: true,
              currency: true,
              _count: { select: { items: true } },
            },
          },
        },
      });
    }),

  create: proc
    .input(customerCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmCustomer.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email || null,
          phone: input.phone || null,
          nationality: input.nationality || null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          loyaltyTier: input.loyaltyTier || "STANDARD",
          partnerId: input.partnerId || null,
          notes: input.notes || null,
          companyId: ctx.companyId,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: customerUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.email !== undefined) data.email = data.email || null;
      if (data.phone !== undefined) data.phone = data.phone || null;
      if (data.nationality !== undefined) data.nationality = data.nationality || null;
      if (data.dateOfBirth !== undefined) data.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth as string) : null;
      if (data.partnerId !== undefined) data.partnerId = data.partnerId || null;
      if (data.notes !== undefined) data.notes = data.notes || null;

      return ctx.db.crmCustomer.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmCustomer.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
