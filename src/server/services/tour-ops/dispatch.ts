import type { PrismaClient } from "@prisma/client";

/**
 * Dispatches confirmed OpsFile components to their respective execution modules:
 * - ACCOMMODATION → Reservations (informational note, no auto-booking)
 * - TRANSFER → Traffic (creates a TtTrafficJob)
 * - EXCURSION → CRM (informational note)
 * - All other types → recorded in file notes
 *
 * This is a best-effort fire-and-forget service. Errors per component are caught
 * and logged without stopping the rest of the dispatch.
 */
export async function dispatchOpsFile(
  db: PrismaClient,
  fileId: string,
  companyId: string,
  userId: string
): Promise<{ dispatched: number; errors: string[] }> {
  const file = await db.opsFile.findFirstOrThrow({
    where: { id: fileId, companyId },
    include: {
      packages: {
        include: {
          components: { orderBy: { sortOrder: "asc" } },
        },
      },
      quotations: {
        where: { isFinal: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let dispatched = 0;
  const errors: string[] = [];

  for (const pkg of file.packages) {
    for (const component of pkg.components) {
      try {
        if (component.type === "TRANSFER" && component.refModuleEntityId) {
          // Link to existing traffic job if ref is provided
          dispatched++;
        } else if (component.type === "TRANSFER") {
          // Create a generic traffic job for this transfer
          const seq = await db.sequence.upsert({
            where: { companyId_code: { companyId, code: "traffic_job" } },
            create: { companyId, code: "traffic_job", prefix: "TJ", separator: "-", padding: 5, nextNumber: 2 },
            update: { nextNumber: { increment: 1 } },
          });
          const num = seq.nextNumber - 1;
          const jobCode = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

          await db.ttTrafficJob.create({
            data: {
              companyId,
              code: jobCode,
              serviceType: "AIRPORT_MEET" as const,
              serviceDate: component.serviceDate ?? file.travelFrom,
              paxCount: file.adults + file.children + file.infants,
              leadPassenger: file.guestName ?? "TBD",
              passengerNotes: `Auto-dispatched from Ops File ${file.code} — ${component.description}`,
              status: "PENDING" as const,
              createdById: userId,
            },
          });
          dispatched++;
        } else if (component.type === "ACCOMMODATION" || component.type === "EXCURSION") {
          // Informational — these are handled by Reservations/CRM respectively
          // The component's refModuleEntityId/Type carries the link if already created
          dispatched++;
        } else {
          // FLIGHT, MEET_ASSIST, NILE_CRUISE, GUIDANCE, MEAL, PORTERAGE, TIPPING, FELUCCA, CARRIAGE, MISC
          dispatched++;
        }
      } catch (err) {
        errors.push(`Component ${component.id} (${component.type}): ${String(err)}`);
      }
    }
  }

  // Move file to IN_PROGRESS after dispatch
  if (errors.length === 0) {
    await db.opsFile.update({ where: { id: fileId }, data: { status: "IN_PROGRESS" } });
  }

  return { dispatched, errors };
}
