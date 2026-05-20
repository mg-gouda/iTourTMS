import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("crm", code);

// Parse "YYYY-MM-DD" as local date (avoids UTC midnight timezone shift)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const runStopSchema = z.object({
  hotelId: z.string(),
  sequence: z.number().int().min(0),
  paxCount: z.number().int().min(0),
});

const runSchema = z.object({
  runNumber: z.number().int().min(1),
  repId: z.string().optional(),
  notes: z.string().optional(),
  stops: z.array(runStopSchema),
});

export const excursionDispatchRouter = createTRPCRouter({
  // Hotels with booked pax for a given excursion+date
  getHotels: p("crm:booking:read")
    .input(z.object({ excursionId: z.string(), date: z.string() }))
    .query(async ({ ctx, input }) => {
      const date = parseLocalDate(input.date);
      const tickets = await ctx.db.crmExcursionTicket.findMany({
        where: {
          companyId: ctx.companyId,
          excursionId: input.excursionId,
          excursionDate: date,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
        select: {
          hotelId: true,
          adults: true,
          children: true,
          hotel: { select: { id: true, name: true, code: true, latitude: true, longitude: true } },
        },
      });

      // Group by hotel
      const hotelMap = new Map<string, { hotel: typeof tickets[0]["hotel"]; adults: number; children: number }>();
      for (const t of tickets) {
        const existing = hotelMap.get(t.hotelId);
        if (existing) {
          existing.adults += t.adults;
          existing.children += t.children;
        } else {
          hotelMap.set(t.hotelId, { hotel: t.hotel, adults: t.adults, children: t.children });
        }
      }

      return Array.from(hotelMap.values()).map((h) => ({
        ...h.hotel,
        adults: h.adults,
        children: h.children,
        pax: h.adults + h.children,
      }));
    }),

  // Load existing dispatch (or null)
  getDispatch: p("crm:booking:read")
    .input(z.object({ excursionId: z.string(), date: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmExcursionDispatch.findUnique({
        where: {
          companyId_excursionId_dispatchDate: {
            companyId: ctx.companyId,
            excursionId: input.excursionId,
            dispatchDate: parseLocalDate(input.date),
          },
        },
        include: {
          excursion: { select: { id: true, name: true, code: true } },
          runs: {
            include: {
              rep: { select: { id: true, user: { select: { name: true } } } },
              stops: {
                include: { hotel: { select: { id: true, name: true, code: true, latitude: true, longitude: true } } },
                orderBy: { sequence: "asc" },
              },
            },
            orderBy: { runNumber: "asc" },
          },
        },
      });
    }),

  // Upsert dispatch + runs + stops (full replace of runs)
  saveDispatch: p("crm:booking:update")
    .input(
      z.object({
        excursionId: z.string(),
        date: z.string(),
        assemblyPointName: z.string().optional(),
        assemblyPointLat: z.number().optional(),
        assemblyPointLng: z.number().optional(),
        notes: z.string().optional(),
        runs: z.array(runSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const date = parseLocalDate(input.date);

      const dispatch = await ctx.db.crmExcursionDispatch.upsert({
        where: {
          companyId_excursionId_dispatchDate: {
            companyId: ctx.companyId,
            excursionId: input.excursionId,
            dispatchDate: date,
          },
        },
        create: {
          companyId: ctx.companyId,
          excursionId: input.excursionId,
          dispatchDate: date,
          assemblyPointName: input.assemblyPointName ?? null,
          assemblyPointLat: input.assemblyPointLat ?? null,
          assemblyPointLng: input.assemblyPointLng ?? null,
          notes: input.notes ?? null,
          status: "DRAFT",
        },
        update: {
          assemblyPointName: input.assemblyPointName ?? null,
          assemblyPointLat: input.assemblyPointLat ?? null,
          assemblyPointLng: input.assemblyPointLng ?? null,
          notes: input.notes ?? null,
        },
        select: { id: true },
      });

      // Replace all runs (delete + recreate)
      await ctx.db.$transaction(async (tx) => {
        const existing = await tx.crmDispatchRun.findMany({
          where: { dispatchId: dispatch.id },
          select: { id: true },
        });
        for (const r of existing) {
          await tx.crmDispatchRunStop.deleteMany({ where: { runId: r.id } });
        }
        await tx.crmDispatchRun.deleteMany({ where: { dispatchId: dispatch.id } });

        for (const run of input.runs) {
          const created = await tx.crmDispatchRun.create({
            data: {
              dispatchId: dispatch.id,
              runNumber: run.runNumber,
              repId: run.repId || null,
              notes: run.notes || null,
            },
          });
          if (run.stops.length > 0) {
            await tx.crmDispatchRunStop.createMany({
              data: run.stops.map((s) => ({
                runId: created.id,
                hotelId: s.hotelId,
                sequence: s.sequence,
                paxCount: s.paxCount,
              })),
            });
          }
        }
      });

      return { dispatchId: dispatch.id };
    }),

  // Generate one TtTrafficJob per run (idempotent — skips runs that already have a job)
  generateJobs: p("crm:booking:create")
    .input(z.object({ excursionId: z.string(), date: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dispatch = await ctx.db.crmExcursionDispatch.findUnique({
        where: {
          companyId_excursionId_dispatchDate: {
            companyId: ctx.companyId,
            excursionId: input.excursionId,
            dispatchDate: parseLocalDate(input.date),
          },
        },
        include: {
          excursion: { select: { name: true } },
          runs: {
            include: {
              stops: {
                include: { hotel: { select: { id: true, name: true } } },
                orderBy: { sequence: "asc" },
              },
            },
            orderBy: { runNumber: "asc" },
          },
        },
      });

      if (!dispatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No saved dispatch found. Please save the dispatch first before generating jobs.",
        });
      }

      if (dispatch.runs.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No runs configured. Add at least one run with hotels before generating jobs.",
        });
      }

      const created: string[] = [];

      for (const run of dispatch.runs) {
        if (run.trafficJobId) continue; // already generated

        const totalPax = run.stops.reduce((s, st) => s + st.paxCount, 0);
        const stopList = run.stops
          .map((s, i) => `${i + 1}. ${s.hotel.name} (${s.paxCount} pax)`)
          .join("\n");
        const notes = [
          `Excursion: ${dispatch.excursion.name}`,
          `Run ${run.runNumber} — ${totalPax} pax`,
          ``,
          `Pickup sequence:`,
          stopList,
          dispatch.assemblyPointName ? `\nAssembly Point: ${dispatch.assemblyPointName}` : "",
        ]
          .join("\n")
          .trim();

        // Auto-generate job code
        const seq = await ctx.db.sequence.upsert({
          where: { companyId_code: { companyId: ctx.companyId, code: "traffic_job" } },
          create: { companyId: ctx.companyId, code: "traffic_job", prefix: "FT", padding: 5, nextNumber: 2 },
          update: { nextNumber: { increment: 1 } },
        });
        const jobCode = `FT-${String(seq.nextNumber - 1).padStart(5, "0")}`;

        const firstStop = run.stops[0];

        const job = await ctx.db.ttTrafficJob.create({
          data: {
            companyId: ctx.companyId,
            code: jobCode,
            serviceType: "EXCURSION",
            status: "PENDING",
            serviceDate: dispatch.dispatchDate,
            paxCount: totalPax,
            passengerNotes: notes,
            // First hotel as pickup (FK for display in job detail)
            pickupHotelId: firstStop?.hotel.id ?? null,
            pickupAddress: firstStop?.hotel.name ?? null,
            // Assembly point as dropoff
            dropoffAddress: dispatch.assemblyPointName ?? null,
            price: 0,
            cost: 0,
            createdById: ctx.session.user.id,
          },
          select: { id: true },
        });

        // Create assignment for rep if set
        if (run.repId) {
          await ctx.db.ttTrafficAssignment.create({
            data: {
              companyId: ctx.companyId,
              jobId: job.id,
              repId: run.repId,
              status: "PENDING",
            },
          });
        }

        // Link job back to run
        await ctx.db.crmDispatchRun.update({
          where: { id: run.id },
          data: { trafficJobId: job.id },
        });

        created.push(job.id);
      }

      // Mark dispatch as DISPATCHED
      await ctx.db.crmExcursionDispatch.update({
        where: { id: dispatch.id },
        data: { status: "DISPATCHED" },
      });

      return { created: created.length };
    }),

  // Supporting dropdowns
  listReps: p("crm:booking:read").query(async ({ ctx }) => {
    return ctx.db.ttRep.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    });
  }),

  listExcursions: p("crm:booking:read").query(async ({ ctx }) => {
    return ctx.db.crmExcursion.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),
});
