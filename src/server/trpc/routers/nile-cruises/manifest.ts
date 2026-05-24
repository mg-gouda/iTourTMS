import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseManifestUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseManifestRouter = createTRPCRouter({
  listByDeparture: p("nile-cruises:manifest:read")
    .input(z.object({ departureId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseManifest.findMany({
        where: input.departureId ? { departureId: input.departureId } : {
          departure: { companyId: ctx.companyId },
        },
        include: {
          departure: {
            select: { id: true, code: true, embarkDate: true, disembarkDate: true, boat: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  generate: p("nile-cruises:manifest:generate")
    .input(z.object({ departureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const departure = await ctx.db.cruiseDeparture.findFirstOrThrow({
        where: { id: input.departureId, companyId: ctx.companyId },
        include: {
          bookings: {
            where: { status: { in: ["CONFIRMED", "EMBARKED"] } },
            select: { adults: true, children: true, infants: true },
          },
        },
      });
      const totals = departure.bookings.reduce(
        (acc: { pax: number; adults: number; children: number; infants: number }, b) => ({
          pax: acc.pax + b.adults + b.children + b.infants,
          adults: acc.adults + b.adults,
          children: acc.children + b.children,
          infants: acc.infants + b.infants,
        }),
        { pax: 0, adults: 0, children: 0, infants: 0 }
      );

      const existing = await ctx.db.cruiseManifest.findUnique({ where: { departureId: input.departureId } });
      if (existing) {
        return ctx.db.cruiseManifest.update({
          where: { id: existing.id },
          data: {
            totalPax: totals.pax,
            totalAdults: totals.adults,
            totalChildren: totals.children,
            totalInfants: totals.infants,
            versionNumber: { increment: 1 },
          },
        });
      }
      return ctx.db.cruiseManifest.create({
        data: {
          departureId: input.departureId,
          totalPax: totals.pax,
          totalAdults: totals.adults,
          totalChildren: totals.children,
          totalInfants: totals.infants,
          createdById: ctx.session.user.id,
        },
      });
    }),

  getById: p("nile-cruises:manifest:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseManifest.findFirstOrThrow({
        where: { id: input.id },
        include: {
          departure: {
            include: {
              boat: true,
              cruiseType: true,
              bookings: {
                where: { status: { in: ["CONFIRMED", "EMBARKED"] } },
                include: {
                  passengers: { include: { nationality: true, title: true } },
                  cabinAssignments: { include: { cabin: true } },
                },
              },
            },
          },
          amendments: { orderBy: { performedAt: "desc" } },
        },
      });
    }),

  markSubmitted: p("nile-cruises:manifest:submit")
    .input(z.object({ id: z.string(), submissionRef: z.string().optional(), method: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseManifest.update({
        where: { id: input.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          submittedById: ctx.session.user.id,
          submissionRef: input.submissionRef,
          submissionMethod: (input.method as never) ?? null,
        },
      });
    }),

  markAccepted: p("nile-cruises:manifest:submit")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseManifest.update({
        where: { id: input.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
    }),

  markRejected: p("nile-cruises:manifest:submit")
    .input(z.object({ id: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseManifest.update({
        where: { id: input.id },
        data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: input.reason },
      });
    }),

  amend: p("nile-cruises:manifest:submit")
    .input(z.object({ id: z.string(), changeSummary: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const manifest = await ctx.db.cruiseManifest.findFirstOrThrow({ where: { id: input.id } });
      await ctx.db.cruiseManifestAmendment.create({
        data: {
          manifestId: manifest.id,
          versionNumber: manifest.versionNumber,
          changeSummary: input.changeSummary,
          performedById: ctx.session.user.id,
        },
      });
      return ctx.db.cruiseManifest.update({
        where: { id: manifest.id },
        data: { status: "AMENDED", versionNumber: { increment: 1 } },
      });
    }),

  exportPdf: p("nile-cruises:manifest:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Returns manifest data for client-side PDF generation
      const manifest = await ctx.db.cruiseManifest.findFirstOrThrow({
        where: { id: input.id },
        include: {
          departure: {
            include: {
              boat: true,
              cruiseType: true,
              bookings: {
                where: { status: { in: ["CONFIRMED", "EMBARKED"] } },
                include: { passengers: { include: { nationality: true, title: true } }, cabinAssignments: { include: { cabin: true } } },
              },
            },
          },
        },
      });
      return manifest;
    }),

  exportExcel: p("nile-cruises:manifest:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseManifest.findFirstOrThrow({ where: { id: input.id } });
    }),
});
