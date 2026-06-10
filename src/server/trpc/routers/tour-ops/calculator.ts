import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { getCreditStatus, checkCredit, recalcCreditUsed } from "@/server/services/tour-ops/credit";
import { notifyRole } from "@/server/services/shared/notifications";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);
const OPERATIONS_MANAGER_ROLE = "operations_manager";

const generatedComponentSchema = z.object({
  type: z.enum([
    "ACCOMMODATION",
    "NILE_CRUISE",
    "TRANSFER",
    "EXCURSION",
    "GUIDANCE",
    "MEAL",
    "MISC",
  ]),
  description: z.string().min(1),
  unitCost: z.number().min(0),
  qty: z.number().min(0).default(1),
  nights: z.number().int().min(1).default(1),
  pricingBasis: z.enum(["PER_PERSON", "BULK"]).default("PER_PERSON"),
  notes: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const opsCalculatorRouter = createTRPCRouter({
  saveState: p("tour-ops:quotation:update")
    .input(z.object({ fileId: z.string().min(1), state: z.any() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.opsFile.updateMany({
        where: { id: input.fileId, companyId: ctx.companyId },
        data: { calculatorState: input.state },
      });
      return { ok: true };
    }),

  getState: p("tour-ops:quotation:read")
    .input(z.object({ fileId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.db.opsFile.findFirst({
        where: { id: input.fileId, companyId: ctx.companyId },
        select: { calculatorState: true, calculatorPosted: true },
      });
      return file ? { state: file.calculatorState, posted: file.calculatorPosted } : null;
    }),

  post: p("tour-ops:quotation:confirm")
    .input(
      z.object({
        fileId: z.string().min(1),
        state: z.any(),
        components: z.array(generatedComponentSchema).min(1),
        totalCostUSD: z.number().min(0),
        totalSellingUSD: z.number().min(0),
        totalMgmtFeesUSD: z.number().min(0).default(0),
        mgmtFeesPct: z.number().min(0).default(0),
        pax: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, session } = ctx;

      const file = await db.opsFile.findFirst({
        where: { id: input.fileId, companyId },
        select: { id: true, travelFrom: true, clientType: true, tourOperatorId: true },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      // ── Credit check ──────────────────────────────────────────────────────
      if (file.tourOperatorId) {
        const creditStatus = await getCreditStatus(db, companyId, file.tourOperatorId);
        if (creditStatus) {
          const check = checkCredit(creditStatus, input.totalSellingUSD);
          if (!check.allowed) {
            // Store override request and notify OMs
            const overrideReq = await db.creditOverrideRequest.create({
              data: {
                companyId,
                tourOperatorId: file.tourOperatorId,
                requestedById: session.user.id,
                amount: new Decimal(input.totalSellingUSD).toDecimalPlaces(2).toNumber(),
                currentUsed: creditStatus.creditUsed,
                creditLimit: creditStatus.creditLimit,
                overageAmount: check.overageAmount,
                status: "PENDING",
                pendingType: "calculator_post",
                pendingPayload: input as unknown as Record<string, unknown>,
              },
              include: { tourOperator: { select: { name: true } } },
            });

            await notifyRole(db, companyId, OPERATIONS_MANAGER_ROLE, {
              type: "CREDIT_OVERRIDE_REQUESTED",
              title: "Credit limit override requested",
              message: `${overrideReq.tourOperator.name} — a new quotation of $${input.totalSellingUSD.toLocaleString()} would exceed the credit limit by $${check.overageAmount.toLocaleString()}. Approve or deny.`,
              link: `/tour-ops/credit-overrides`,
            });

            // Return blocked signal — no file/package/quotation created yet
            return {
              blocked: true,
              overrideRequestId: overrideReq.id,
              overageAmount: check.overageAmount,
              creditLimit: creditStatus.creditLimit,
              creditUsed: creditStatus.creditUsed,
              requestedAmount: input.totalSellingUSD,
            } as const;
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      return db.$transaction(async (tx) => {
        // 1. Save & lock calculator state
        await tx.opsFile.update({
          where: { id: input.fileId },
          data: { calculatorState: input.state, calculatorPosted: true },
        });

        // 2. Create auto-named package
        const dateLabel = new Date(file.travelFrom).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const pkg = await tx.opsPackage.create({
          data: {
            companyId,
            fileId: input.fileId,
            name: `Calculation — ${dateLabel}`,
            baseCurrency: "USD",
            totalCost: new Decimal(input.totalCostUSD).toDecimalPlaces(2).toNumber(),
          },
        });

        // 3. Create package components
        await tx.opsPackageComponent.createMany({
          data: input.components.map((c, i) => {
            const isNightsBased = c.type === "ACCOMMODATION" || c.type === "NILE_CRUISE";
            const nightsFactor = isNightsBased ? Math.max(1, c.nights) : 1;
            const totalCost =
              c.pricingBasis === "BULK"
                ? new Decimal(c.unitCost).times(nightsFactor).toDecimalPlaces(2).toNumber()
                : new Decimal(c.qty).times(c.unitCost).times(nightsFactor).toDecimalPlaces(2).toNumber();
            const mgmtFeeAmount = new Decimal(totalCost)
              .times(new Decimal(input.mgmtFeesPct).div(100))
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
              mgmtFeeValue: input.mgmtFeesPct,
              mgmtFeeAmount,
              notes: c.notes ?? null,
              sortOrder: c.sortOrder ?? i,
            };
          }),
        });

        // 4. Generate quotation code
        const seq = await tx.sequence.upsert({
          where: { companyId_code: { companyId, code: "ops_quotation" } },
          create: { companyId, code: "ops_quotation", prefix: "QT", separator: "-", padding: 5, nextNumber: 2 },
          update: { nextNumber: { increment: 1 } },
        });
        const num = seq.nextNumber - 1;
        const code = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

        // 5. Create quotation with calculator-computed totals
        const totalCost = new Decimal(input.totalCostUSD).toDecimalPlaces(2).toNumber();
        const totalSelling = new Decimal(input.totalSellingUSD).toDecimalPlaces(2).toNumber();
        const margin = new Decimal(totalSelling).minus(totalCost).toDecimalPlaces(2).toNumber();
        const marginPct =
          totalCost > 0
            ? new Decimal(margin).div(totalCost).times(100).toDecimalPlaces(2).toNumber()
            : 0;

        const quotation = await tx.opsQuotation.create({
          data: {
            companyId,
            code,
            fileId: input.fileId,
            packageId: pkg.id,
            clientType: file.clientType,
            status: "DRAFT",
            totalCost,
            totalSelling,
            totalMgmtFees: new Decimal(input.totalMgmtFeesUSD).toDecimalPlaces(2).toNumber(),
            margin,
            marginPct,
          },
        });

        // 6. Advance file status to QUOTED
        await tx.opsFile.update({
          where: { id: input.fileId },
          data: { status: "QUOTED" },
        });

        return { quotationId: quotation.id, quotationCode: code };
      });

      // Recalc creditUsed after successful post
      if (file.tourOperatorId) {
        await recalcCreditUsed(db, companyId, file.tourOperatorId).catch(() => {});
      }
    }),

  reopen: p("tour-ops:quotation:manage")
    .input(z.object({ fileId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.opsFile.updateMany({
        where: { id: input.fileId, companyId: ctx.companyId },
        data: { calculatorPosted: false },
      });
      return { ok: true };
    }),

  generateComponents: p("tour-ops:quotation:create")
    .input(
      z.object({
        packageId: z.string().min(1),
        components: z.array(generatedComponentSchema).min(1),
        replaceExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db.opsPackage.findFirst({
        where: { id: input.packageId, companyId: ctx.companyId },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.$transaction(async (tx) => {
        if (input.replaceExisting) {
          await tx.opsPackageComponent.deleteMany({
            where: { packageId: input.packageId },
          });
        }

        await tx.opsPackageComponent.createMany({
          data: input.components.map((c, i) => {
            const isNightsBased = c.type === "ACCOMMODATION" || c.type === "NILE_CRUISE";
            const nightsFactor = isNightsBased ? Math.max(1, c.nights) : 1;
            const totalCost =
              c.pricingBasis === "BULK"
                ? new Decimal(c.unitCost).times(nightsFactor).toDecimalPlaces(2)
                : new Decimal(c.qty).times(c.unitCost).times(nightsFactor).toDecimalPlaces(2);

            return {
              packageId: input.packageId,
              type: c.type,
              description: c.description,
              pricingBasis: c.pricingBasis,
              nights: c.nights,
              qty: c.qty,
              unitCost: c.unitCost,
              currency: "USD",
              exchangeRate: 1,
              totalCost: totalCost.toNumber(),
              markupType: "PERCENTAGE" as const,
              markupValue: 0,
              sellingPrice: totalCost.toNumber(),
              mgmtFeeType: "PERCENTAGE" as const,
              mgmtFeeValue: 0,
              mgmtFeeAmount: 0,
              notes: c.notes ?? null,
              sortOrder: c.sortOrder ?? i,
            };
          }),
        });

        const agg = await tx.opsPackageComponent.aggregate({
          where: { packageId: input.packageId },
          _sum: { totalCost: true },
        });
        await tx.opsPackage.update({
          where: { id: input.packageId },
          data: { totalCost: agg._sum.totalCost ?? 0 },
        });
      });

      return { success: true };
    }),
});
