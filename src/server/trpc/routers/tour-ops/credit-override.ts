import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { createNotification, notifyRole } from "@/server/services/shared/notifications";
import { recalcCreditUsed } from "@/server/services/tour-ops/credit";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);

const OPERATIONS_MANAGER_ROLE = "operations_manager";

export const opsCreditOverrideRouter = createTRPCRouter({
  listPending: p("tour-ops:file:read")
    .query(async ({ ctx }) => {
      return ctx.db.creditOverrideRequest.findMany({
        where: { companyId: ctx.companyId, status: "PENDING" },
        include: {
          tourOperator: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  listAll: p("tour-ops:file:read")
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.creditOverrideRequest.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          tourOperator: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
          createdFile: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }),

  approve: p("tour-ops:file:manage")
    .input(z.object({ id: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, session } = ctx;

      // Only operations managers (or super_admin) may approve
      const roles = session.user.roles ?? [];
      if (!roles.includes("super_admin") && !roles.includes(OPERATIONS_MANAGER_ROLE)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only operations managers can approve credit overrides" });
      }

      const req = await db.creditOverrideRequest.findFirst({
        where: { id: input.id, companyId, status: "PENDING" },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Override request not found or already resolved" });

      if (req.pendingType !== "calculator_post" || !req.pendingPayload) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No pending payload to replay" });
      }

      const payload = req.pendingPayload as {
        fileId: string;
        state: unknown;
        components: {
          type: string;
          description: string;
          unitCost: number;
          qty: number;
          nights: number;
          pricingBasis: string;
          notes?: string;
          sortOrder: number;
        }[];
        totalCostUSD: number;
        totalSellingUSD: number;
        totalMgmtFeesUSD: number;
        mgmtFeesPct: number;
        pax: number;
      };

      const file = await db.opsFile.findFirst({
        where: { id: payload.fileId, companyId },
        select: { id: true, travelFrom: true, clientType: true },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Target file not found" });

      // Replay the calculator post inside a transaction
      const result = await db.$transaction(async (tx) => {
        const dateLabel = new Date(file.travelFrom).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
        });
        const pkg = await tx.opsPackage.create({
          data: {
            companyId,
            fileId: file.id,
            name: `Calculation — ${dateLabel}`,
            baseCurrency: "USD",
            totalCost: new Decimal(payload.totalCostUSD).toDecimalPlaces(2).toNumber(),
          },
        });

        await tx.opsPackageComponent.createMany({
          data: payload.components.map((c, i) => {
            const isNightsBased = c.type === "ACCOMMODATION" || c.type === "NILE_CRUISE";
            const nightsFactor = isNightsBased ? Math.max(1, c.nights) : 1;
            const totalCost =
              c.pricingBasis === "BULK"
                ? new Decimal(c.unitCost).times(nightsFactor).toDecimalPlaces(2).toNumber()
                : new Decimal(c.qty).times(c.unitCost).times(nightsFactor).toDecimalPlaces(2).toNumber();
            const mgmtFeeAmount = new Decimal(totalCost)
              .times(new Decimal(payload.mgmtFeesPct).div(100))
              .toDecimalPlaces(2)
              .toNumber();
            return {
              packageId: pkg.id,
              type: c.type,
              description: c.description,
              pricingBasis: c.pricingBasis,
              nights: c.nights,
              qty: c.qty,
              unitCost: c.unitCost,
              currency: "USD",
              exchangeRate: 1,
              totalCost,
              markupType: "PERCENTAGE" as const,
              markupValue: 0,
              sellingPrice: totalCost,
              mgmtFeeType: "PERCENTAGE" as const,
              mgmtFeeValue: payload.mgmtFeesPct,
              mgmtFeeAmount,
              notes: c.notes ?? null,
              sortOrder: c.sortOrder ?? i,
            };
          }),
        });

        const seq = await tx.sequence.upsert({
          where: { companyId_code: { companyId, code: "ops_quotation" } },
          create: { companyId, code: "ops_quotation", prefix: "QT", separator: "-", padding: 5, nextNumber: 2 },
          update: { nextNumber: { increment: 1 } },
        });
        const num = seq.nextNumber - 1;
        const code = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

        const totalCost = new Decimal(payload.totalCostUSD).toDecimalPlaces(2).toNumber();
        const totalSelling = new Decimal(payload.totalSellingUSD).toDecimalPlaces(2).toNumber();
        const margin = new Decimal(totalSelling).minus(totalCost).toDecimalPlaces(2).toNumber();
        const marginPct = totalCost > 0
          ? new Decimal(margin).div(totalCost).times(100).toDecimalPlaces(2).toNumber()
          : 0;

        const quotation = await tx.opsQuotation.create({
          data: {
            companyId,
            code,
            fileId: file.id,
            packageId: pkg.id,
            clientType: file.clientType,
            status: "DRAFT",
            totalCost,
            totalSelling,
            totalMgmtFees: new Decimal(payload.totalMgmtFeesUSD).toDecimalPlaces(2).toNumber(),
            margin,
            marginPct,
          },
        });

        await tx.opsFile.update({
          where: { id: file.id },
          data: { calculatorState: payload.state, calculatorPosted: true, status: "QUOTED" },
        });

        await tx.creditOverrideRequest.update({
          where: { id: req.id },
          data: {
            status: "APPROVED",
            resolvedById: session.user.id,
            resolvedAt: new Date(),
            notes: input.notes ?? null,
            createdFileId: file.id,
          },
        });

        return { quotationId: quotation.id, quotationCode: code, fileId: file.id };
      });

      // Recalc creditUsed
      await recalcCreditUsed(db, companyId, req.tourOperatorId);

      // Notify the requester
      await createNotification(db, {
        companyId,
        recipientId: req.requestedById,
        type: "CREDIT_OVERRIDE_APPROVED",
        title: "Credit override approved",
        message: `Your credit limit override request has been approved. Quotation ${result.quotationCode} has been created.`,
        link: `/tour-ops/files/${result.fileId}`,
      });

      return result;
    }),

  deny: p("tour-ops:file:manage")
    .input(z.object({ id: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, session } = ctx;

      const roles = session.user.roles ?? [];
      if (!roles.includes("super_admin") && !roles.includes(OPERATIONS_MANAGER_ROLE)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only operations managers can deny credit overrides" });
      }

      const req = await db.creditOverrideRequest.findFirst({
        where: { id: input.id, companyId, status: "PENDING" },
        include: { tourOperator: { select: { name: true } } },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Override request not found or already resolved" });

      await db.creditOverrideRequest.update({
        where: { id: req.id },
        data: {
          status: "DENIED",
          resolvedById: session.user.id,
          resolvedAt: new Date(),
          notes: input.notes ?? null,
        },
      });

      await createNotification(db, {
        companyId,
        recipientId: req.requestedById,
        type: "CREDIT_OVERRIDE_DENIED",
        title: "Credit override denied",
        message: `Your credit limit override request for ${req.tourOperator.name} ($${Number(req.amount).toLocaleString()}) has been denied.${input.notes ? ` Reason: ${input.notes}` : ""}`,
        link: `/tour-ops/credit-overrides`,
      });

      return { success: true };
    }),
});
