import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import { moveCreateSchema, moveUpdateSchema } from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  computeInvoiceLines,
  computeMoveTotals,
  validateBalance,
  buildReversalLines,
  applyFxToLines,
  type TaxWithRepartition,
  type ComputedLine,
} from "@/server/services/finance/move-engine";
import { assertPeriodOpen } from "@/server/services/finance/period-engine";
import { getRate } from "@/server/services/finance/currency-service";
import { applyFiscalPosition } from "@/server/services/finance/fiscal-position";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

const financeProcedure = moduleProcedure("finance");

/** Map MoveType to sequence code */
function getSequenceCode(moveType: string): string {
  switch (moveType) {
    case "OUT_INVOICE": return "out_invoice";
    case "IN_INVOICE": return "in_invoice";
    case "OUT_REFUND": return "out_refund";
    case "IN_REFUND": return "in_refund";
    default: return "journal_entry";
  }
}

/** Check if move type is an invoice/bill (not a plain journal entry) */
function isInvoiceType(moveType: string): boolean {
  return moveType !== "ENTRY";
}

/** Get the default receivable/payable account for a move type */
async function getCounterpartAccountId(
  db: any,
  companyId: string,
  moveType: string,
): Promise<string> {
  const accountType = moveType === "OUT_INVOICE" || moveType === "OUT_REFUND"
    ? "ASSET_RECEIVABLE"
    : "LIABILITY_PAYABLE";

  const account = await db.finAccount.findFirst({
    where: { companyId, accountType, deprecated: false },
    select: { id: true },
  });

  if (!account) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `No ${accountType} account found. Please create one first.`,
    });
  }

  return account.id;
}

export const moveRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z.object({
        moveType: z.enum(["ENTRY", "OUT_INVOICE", "OUT_REFUND", "IN_INVOICE", "IN_REFUND"]).optional(),
        state: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
        partnerId: z.string().optional(),
        journalId: z.string().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const where: Record<string, unknown> = { companyId: ctx.companyId };

      if (input?.moveType) where.moveType = input.moveType;
      if (input?.state) where.state = input.state;
      if (input?.partnerId) where.partnerId = input.partnerId;
      if (input?.journalId) where.journalId = input.journalId;
      if (input?.dateFrom || input?.dateTo) {
        where.date = {
          ...(input.dateFrom && { gte: input.dateFrom }),
          ...(input.dateTo && { lte: input.dateTo }),
        };
      }

      const items = await ctx.db.move.findMany({
        where: where as any,
        include: {
          partner: { select: { id: true, name: true } },
          journal: { select: { id: true, code: true, name: true } },
          currency: { select: { id: true, code: true, symbol: true } },
        },
        orderBy: { date: "desc" },
        take: limit + 1,
        ...(input?.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const move = await ctx.db.move.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          partner: { select: { id: true, name: true } },
          journal: { select: { id: true, code: true, name: true, type: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          companyCurrency: { select: { id: true, code: true, symbol: true } },
          paymentTerm: { select: { id: true, name: true } },
          reversedEntry: { select: { id: true, name: true } },
          lineItems: {
            include: {
              account: { select: { id: true, code: true, name: true } },
              partner: { select: { id: true, name: true } },
              taxLine: { select: { id: true, name: true } },
              taxes: { select: { id: true, name: true, amount: true, amountType: true } },
            },
            orderBy: { sequence: "asc" },
          },
        },
      });

      if (!move) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Move not found" });
      }

      return move;
    }),

  create: financeProcedure
    .input(moveCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { lineItems: inputLines, ...moveData } = input;

      // Get company's base currency
      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });

      const companyCurrencyId = company.baseCurrencyId ?? input.currencyId;

      if (isInvoiceType(input.moveType)) {
        // Auto-compute invoice lines
        const receivableAccountId = await getCounterpartAccountId(
          ctx.db, ctx.companyId, input.moveType,
        );

        // Gather all tax IDs from lines
        const allTaxIds = [...new Set(inputLines.flatMap((l) => l.taxIds))];
        let taxesWithRepart: TaxWithRepartition[] = [];

        if (allTaxIds.length > 0) {
          const taxRecords = await ctx.db.tax.findMany({
            where: { id: { in: allTaxIds }, companyId: ctx.companyId },
            include: { repartitionLines: true },
          });
          taxesWithRepart = taxRecords.map((t: any) => ({
            id: t.id,
            name: t.name,
            amountType: t.amountType,
            amount: t.amount,
            priceInclude: t.priceInclude,
            includeBaseAmount: t.includeBaseAmount,
            taxGroupId: t.taxGroupId,
            sequence: t.sequence,
            repartitionLines: t.repartitionLines.map((r: any) => ({
              factorPercent: r.factorPercent,
              accountId: r.accountId,
              documentType: r.documentType,
            })),
          }));
        }

        // Apply fiscal position remapping if provided
        if (input.fiscalPositionId) {
          const fp = await ctx.db.fiscalPosition.findUnique({
            where: { id: input.fiscalPositionId },
            include: { taxMaps: true, accountMaps: true },
          });
          if (fp) {
            for (const line of inputLines) {
              if (line.taxIds.length > 0 || line.accountId) {
                const result = applyFiscalPosition(fp, line.taxIds, line.accountId);
                line.taxIds = result.mappedTaxIds;
                line.accountId = result.mappedAccountId;
              }
            }
            // Re-gather taxes after remapping
            const remappedTaxIds = [...new Set(inputLines.flatMap((l) => l.taxIds))];
            if (remappedTaxIds.length > 0) {
              const remappedTaxRecords = await ctx.db.tax.findMany({
                where: { id: { in: remappedTaxIds }, companyId: ctx.companyId },
                include: { repartitionLines: true },
              });
              taxesWithRepart = remappedTaxRecords.map((t: any) => ({
                id: t.id, name: t.name, amountType: t.amountType, amount: t.amount,
                priceInclude: t.priceInclude, includeBaseAmount: t.includeBaseAmount,
                taxGroupId: t.taxGroupId, sequence: t.sequence,
                repartitionLines: t.repartitionLines.map((r: any) => ({
                  factorPercent: r.factorPercent, accountId: r.accountId, documentType: r.documentType,
                })),
              }));
            } else {
              taxesWithRepart = [];
            }
          }
        }

        // Get payment term lines if applicable
        let ptLines: any[] | null = null;
        if (input.paymentTermId) {
          const pt = await ctx.db.paymentTerm.findUnique({
            where: { id: input.paymentTermId },
            include: { lines: { orderBy: { sequence: "asc" } } },
          });
          if (pt) ptLines = pt.lines;
        }

        const invoiceDate = input.invoiceDate ?? input.date;
        let computedLines = computeInvoiceLines(
          inputLines,
          taxesWithRepart,
          input.moveType,
          receivableAccountId,
          ptLines,
          invoiceDate,
          input.partnerId,
        );

        // Apply FX conversion if transaction currency differs from base
        let fxRate = new Decimal(1);
        if (input.currencyId !== companyCurrencyId) {
          fxRate = await getRate(ctx.db as any, ctx.companyId, input.currencyId, input.date);
          computedLines = applyFxToLines(computedLines, fxRate);
        }

        const totals = computeMoveTotals(computedLines);

        return ctx.db.move.create({
          data: {
            ...moveData,
            companyId: ctx.companyId,
            companyCurrencyId,
            invoiceDate: input.invoiceDate ?? input.date,
            amountUntaxed: totals.amountUntaxed,
            amountTax: totals.amountTax,
            amountTotal: totals.amountTotal,
            amountResidual: totals.amountTotal,
            lineItems: {
              create: computedLines.map((line) => ({
                accountId: line.accountId,
                partnerId: line.partnerId,
                name: line.name,
                displayType: line.displayType as any,
                currencyId: input.currencyId,
                debit: line.debit,
                credit: line.credit,
                balance: line.balance,
                amountCurrency: line.amountCurrency,
                quantity: line.quantity,
                priceUnit: line.priceUnit,
                discount: line.discount,
                taxLineId: line.taxLineId,
                dateMaturity: line.dateMaturity,
                sequence: line.sequence,
                taxes: line.taxIds.length > 0
                  ? { connect: line.taxIds.map((id) => ({ id })) }
                  : undefined,
              })),
            },
          },
          include: {
            lineItems: { include: { account: true, taxes: true }, orderBy: { sequence: "asc" } },
          },
        });
      } else {
        // Journal entry — direct debit/credit (user enters in transaction currency)
        let fxRate = new Decimal(1);
        if (input.currencyId !== companyCurrencyId) {
          fxRate = await getRate(ctx.db as any, ctx.companyId, input.currencyId, input.date);
        }

        const lines: ComputedLine[] = inputLines.map((line) => {
          const origDebit = new Decimal(line.debit);
          const origCredit = new Decimal(line.credit);
          return {
            accountId: line.accountId,
            partnerId: line.partnerId,
            name: line.name,
            displayType: line.displayType,
            debit: origDebit.times(fxRate).toDecimalPlaces(4),
            credit: origCredit.times(fxRate).toDecimalPlaces(4),
            balance: origDebit.times(fxRate).minus(origCredit.times(fxRate)).toDecimalPlaces(4),
            amountCurrency: origDebit.minus(origCredit).abs(),
            quantity: new Decimal(line.quantity),
            priceUnit: new Decimal(line.priceUnit),
            discount: new Decimal(line.discount),
            taxIds: line.taxIds,
            dateMaturity: line.dateMaturity,
            sequence: line.sequence,
          };
        });

        const totals = computeMoveTotals(lines);

        return ctx.db.move.create({
          data: {
            ...moveData,
            companyId: ctx.companyId,
            companyCurrencyId,
            amountUntaxed: totals.amountUntaxed,
            amountTax: totals.amountTax,
            amountTotal: totals.amountTotal,
            amountResidual: totals.amountTotal,
            lineItems: {
              create: lines.map((line) => ({
                accountId: line.accountId,
                partnerId: line.partnerId,
                name: line.name,
                displayType: line.displayType as any,
                currencyId: input.currencyId,
                debit: line.debit,
                credit: line.credit,
                balance: line.balance,
                amountCurrency: line.amountCurrency,
                quantity: line.quantity,
                priceUnit: line.priceUnit,
                discount: line.discount,
                dateMaturity: line.dateMaturity,
                sequence: line.sequence,
              })),
            },
          },
          include: {
            lineItems: { include: { account: true }, orderBy: { sequence: "asc" } },
          },
        });
      }
    }),

  update: financeProcedure
    .input(z.object({ id: z.string() }).merge(moveUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, lineItems: inputLines, ...moveData } = input;

      const existing = await ctx.db.move.findFirst({
        where: { id, companyId: ctx.companyId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Move not found" });
      }

      if (existing.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft moves can be updated",
        });
      }

      // If date is changing, verify new date is in an open period
      if (moveData.date) {
        await assertPeriodOpen(ctx.db as any, ctx.companyId, moveData.date as Date);
      }

      if (!inputLines) {
        return ctx.db.move.update({ where: { id }, data: moveData as any });
      }

      // Delete-recreate lines pattern
      await ctx.db.moveLineItem.deleteMany({ where: { moveId: id } });

      const moveType = (moveData.moveType ?? existing.moveType) as string;
      const companyCurrencyId = existing.companyCurrencyId;

      if (isInvoiceType(moveType)) {
        const receivableAccountId = await getCounterpartAccountId(
          ctx.db, ctx.companyId, moveType,
        );

        const allTaxIds = [...new Set(inputLines.flatMap((l) => l.taxIds))];
        let taxesWithRepart: TaxWithRepartition[] = [];
        if (allTaxIds.length > 0) {
          const taxRecords = await ctx.db.tax.findMany({
            where: { id: { in: allTaxIds }, companyId: ctx.companyId },
            include: { repartitionLines: true },
          });
          taxesWithRepart = taxRecords.map((t: any) => ({
            id: t.id, name: t.name, amountType: t.amountType, amount: t.amount,
            priceInclude: t.priceInclude, includeBaseAmount: t.includeBaseAmount,
            taxGroupId: t.taxGroupId, sequence: t.sequence,
            repartitionLines: t.repartitionLines.map((r: any) => ({
              factorPercent: r.factorPercent, accountId: r.accountId, documentType: r.documentType,
            })),
          }));
        }

        // Apply fiscal position remapping if provided
        const fpId = moveData.fiscalPositionId ?? existing.fiscalPositionId;
        if (fpId) {
          const fp = await ctx.db.fiscalPosition.findUnique({
            where: { id: fpId },
            include: { taxMaps: true, accountMaps: true },
          });
          if (fp) {
            for (const line of inputLines) {
              if (line.taxIds.length > 0 || line.accountId) {
                const result = applyFiscalPosition(fp, line.taxIds, line.accountId);
                line.taxIds = result.mappedTaxIds;
                line.accountId = result.mappedAccountId;
              }
            }
            const remappedTaxIds = [...new Set(inputLines.flatMap((l) => l.taxIds))];
            if (remappedTaxIds.length > 0) {
              const remappedTaxRecords = await ctx.db.tax.findMany({
                where: { id: { in: remappedTaxIds }, companyId: ctx.companyId },
                include: { repartitionLines: true },
              });
              taxesWithRepart = remappedTaxRecords.map((t: any) => ({
                id: t.id, name: t.name, amountType: t.amountType, amount: t.amount,
                priceInclude: t.priceInclude, includeBaseAmount: t.includeBaseAmount,
                taxGroupId: t.taxGroupId, sequence: t.sequence,
                repartitionLines: t.repartitionLines.map((r: any) => ({
                  factorPercent: r.factorPercent, accountId: r.accountId, documentType: r.documentType,
                })),
              }));
            } else {
              taxesWithRepart = [];
            }
          }
        }

        let ptLines: any[] | null = null;
        const ptId = moveData.paymentTermId ?? existing.paymentTermId;
        if (ptId) {
          const pt = await ctx.db.paymentTerm.findUnique({
            where: { id: ptId },
            include: { lines: { orderBy: { sequence: "asc" } } },
          });
          if (pt) ptLines = pt.lines;
        }

        const invoiceDate = (moveData.invoiceDate ?? existing.invoiceDate ?? moveData.date ?? existing.date) as Date;
        const partnerId = moveData.partnerId ?? existing.partnerId;

        let computedLines = computeInvoiceLines(
          inputLines, taxesWithRepart, moveType, receivableAccountId, ptLines, invoiceDate, partnerId,
        );

        // Apply FX conversion if transaction currency differs from base
        const currencyId = (moveData.currencyId ?? existing.currencyId) as string;
        let fxRate = new Decimal(1);
        if (currencyId !== companyCurrencyId) {
          const moveDate = (moveData.date ?? existing.date) as Date;
          fxRate = await getRate(ctx.db as any, ctx.companyId, currencyId, moveDate);
          computedLines = applyFxToLines(computedLines, fxRate);
        }

        const totals = computeMoveTotals(computedLines);

        return ctx.db.move.update({
          where: { id },
          data: {
            ...moveData,
            amountUntaxed: totals.amountUntaxed,
            amountTax: totals.amountTax,
            amountTotal: totals.amountTotal,
            amountResidual: totals.amountTotal,
            lineItems: {
              create: computedLines.map((line) => ({
                accountId: line.accountId, partnerId: line.partnerId, name: line.name,
                displayType: line.displayType as any, currencyId,
                debit: line.debit, credit: line.credit,
                balance: line.balance, amountCurrency: line.amountCurrency, quantity: line.quantity,
                priceUnit: line.priceUnit, discount: line.discount, taxLineId: line.taxLineId,
                dateMaturity: line.dateMaturity, sequence: line.sequence,
                taxes: line.taxIds.length > 0 ? { connect: line.taxIds.map((tid) => ({ id: tid })) } : undefined,
              })),
            },
          } as any,
          include: { lineItems: { include: { account: true, taxes: true }, orderBy: { sequence: "asc" } } },
        });
      } else {
        // Journal entry — user enters in transaction currency
        const currencyId = (moveData.currencyId ?? existing.currencyId) as string;
        let fxRate = new Decimal(1);
        if (currencyId !== companyCurrencyId) {
          const moveDate = (moveData.date ?? existing.date) as Date;
          fxRate = await getRate(ctx.db as any, ctx.companyId, currencyId, moveDate);
        }

        const lines: ComputedLine[] = inputLines.map((line) => {
          const origDebit = new Decimal(line.debit);
          const origCredit = new Decimal(line.credit);
          return {
            accountId: line.accountId, partnerId: line.partnerId, name: line.name,
            displayType: line.displayType,
            debit: origDebit.times(fxRate).toDecimalPlaces(4),
            credit: origCredit.times(fxRate).toDecimalPlaces(4),
            balance: origDebit.times(fxRate).minus(origCredit.times(fxRate)).toDecimalPlaces(4),
            amountCurrency: origDebit.minus(origCredit).abs(),
            quantity: new Decimal(line.quantity), priceUnit: new Decimal(line.priceUnit),
            discount: new Decimal(line.discount), taxIds: line.taxIds,
            dateMaturity: line.dateMaturity, sequence: line.sequence,
          };
        });
        const totals = computeMoveTotals(lines);

        return ctx.db.move.update({
          where: { id },
          data: {
            ...moveData,
            amountUntaxed: totals.amountUntaxed, amountTax: totals.amountTax,
            amountTotal: totals.amountTotal, amountResidual: totals.amountTotal,
            lineItems: {
              create: lines.map((line) => ({
                accountId: line.accountId, partnerId: line.partnerId, name: line.name,
                displayType: line.displayType as any, currencyId,
                debit: line.debit, credit: line.credit,
                balance: line.balance, amountCurrency: line.amountCurrency, quantity: line.quantity,
                priceUnit: line.priceUnit, discount: line.discount,
                dateMaturity: line.dateMaturity, sequence: line.sequence,
              })),
            },
          } as any,
          include: { lineItems: { include: { account: true }, orderBy: { sequence: "asc" } } },
        });
      }
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const move = await ctx.db.move.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (!move) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Move not found" });
      }

      if (move.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft moves can be deleted",
        });
      }

      return ctx.db.move.delete({ where: { id: input.id } });
    }),

  confirm: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const move = await ctx.db.move.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          lineItems: {
            include: { taxes: { select: { id: true } } },
          },
        },
      });

      if (!move) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Move not found" });
      }

      if (move.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft moves can be confirmed",
        });
      }

      // Check period lock
      await assertPeriodOpen(ctx.db as any, ctx.companyId, move.date);

      // Validate double-entry balance
      const lines: ComputedLine[] = move.lineItems.map((li: any) => ({
        accountId: li.accountId,
        displayType: li.displayType,
        debit: new Decimal(li.debit),
        credit: new Decimal(li.credit),
        balance: new Decimal(li.balance),
        amountCurrency: new Decimal(li.amountCurrency),
        quantity: new Decimal(li.quantity),
        priceUnit: new Decimal(li.priceUnit),
        discount: new Decimal(li.discount),
        taxIds: li.taxes.map((t: any) => t.id),
        sequence: li.sequence,
      }));

      validateBalance(lines);

      // Generate sequence number
      const seqCode = getSequenceCode(move.moveType);
      const name = await generateSequenceNumber(ctx.db, ctx.companyId, seqCode);

      return ctx.db.move.update({
        where: { id: input.id },
        data: {
          state: "POSTED",
          name,
          postedAt: new Date(),
        },
      });
    }),

  cancel: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const move = await ctx.db.move.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          lineItems: {
            include: { taxes: { select: { id: true } } },
          },
        },
      });

      if (!move) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Move not found" });
      }

      if (move.state !== "POSTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only posted moves can be cancelled",
        });
      }

      // Check period lock
      await assertPeriodOpen(ctx.db as any, ctx.companyId, move.date);

      // Create reversal move
      const reversalLines = buildReversalLines(
        move.lineItems.map((li: any) => ({
          accountId: li.accountId,
          partnerId: li.partnerId,
          name: li.name,
          displayType: li.displayType,
          debit: li.debit,
          credit: li.credit,
          quantity: li.quantity,
          priceUnit: li.priceUnit,
          discount: li.discount,
          taxLineId: li.taxLineId,
          taxIds: li.taxes.map((t: any) => t.id),
          dateMaturity: li.dateMaturity,
          sequence: li.sequence,
        })),
      );

      const seqCode = getSequenceCode(move.moveType);
      const reversalName = await generateSequenceNumber(ctx.db, ctx.companyId, seqCode);

      const [reversal] = await ctx.db.$transaction([
        ctx.db.move.create({
          data: {
            companyId: ctx.companyId,
            name: reversalName,
            moveType: move.moveType,
            state: "POSTED",
            date: new Date(),
            journalId: move.journalId,
            partnerId: move.partnerId,
            currencyId: move.currencyId,
            companyCurrencyId: move.companyCurrencyId,
            invoiceDate: move.invoiceDate,
            paymentTermId: move.paymentTermId,
            amountUntaxed: move.amountUntaxed,
            amountTax: move.amountTax,
            amountTotal: move.amountTotal,
            amountResidual: 0,
            ref: `Reversal of ${move.name ?? move.id}`,
            reversedEntryId: move.id,
            postedAt: new Date(),
            lineItems: {
              create: reversalLines.map((line) => ({
                accountId: line.accountId,
                partnerId: line.partnerId,
                name: line.name,
                displayType: line.displayType as any,
                debit: line.debit,
                credit: line.credit,
                balance: line.balance,
                amountCurrency: line.amountCurrency,
                quantity: line.quantity,
                priceUnit: line.priceUnit,
                discount: line.discount,
                taxLineId: line.taxLineId,
                dateMaturity: line.dateMaturity,
                sequence: line.sequence,
                taxes: line.taxIds.length > 0
                  ? { connect: line.taxIds.map((id) => ({ id })) }
                  : undefined,
              })),
            },
          },
        }),
        ctx.db.move.update({
          where: { id: input.id },
          data: {
            state: "CANCELLED",
            paymentState: "REVERSED",
            amountResidual: 0,
          },
        }),
      ]);

      return reversal;
    }),

  resetDraft: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const move = await ctx.db.move.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (!move) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Move not found" });
      }

      if (move.state !== "CANCELLED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only cancelled moves can be reset to draft",
        });
      }

      return ctx.db.move.update({
        where: { id: input.id },
        data: {
          state: "DRAFT",
          name: null,
          postedAt: null,
          paymentState: "NOT_PAID",
        },
      });
    }),

  createCreditNote: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const move = await ctx.db.move.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          lineItems: {
            include: { taxes: { select: { id: true } } },
          },
        },
      });

      if (!move) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Move not found" });
      }

      if (move.state !== "POSTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Credit notes can only be created from posted moves",
        });
      }

      // Determine the refund type
      let refundMoveType: string;
      if (move.moveType === "OUT_INVOICE") refundMoveType = "OUT_REFUND";
      else if (move.moveType === "IN_INVOICE") refundMoveType = "IN_REFUND";
      else {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Credit notes can only be created from invoices or bills",
        });
      }

      // Build reversed lines
      const reversalLines = buildReversalLines(
        move.lineItems.map((li: any) => ({
          accountId: li.accountId,
          partnerId: li.partnerId,
          name: li.name,
          displayType: li.displayType,
          debit: li.debit,
          credit: li.credit,
          quantity: li.quantity,
          priceUnit: li.priceUnit,
          discount: li.discount,
          taxLineId: li.taxLineId,
          taxIds: li.taxes.map((t: any) => t.id),
          dateMaturity: li.dateMaturity,
          sequence: li.sequence,
        })),
      );

      return ctx.db.move.create({
        data: {
          companyId: ctx.companyId,
          moveType: refundMoveType as any,
          state: "DRAFT",
          date: new Date(),
          journalId: move.journalId,
          partnerId: move.partnerId,
          currencyId: move.currencyId,
          companyCurrencyId: move.companyCurrencyId,
          invoiceDate: new Date(),
          paymentTermId: move.paymentTermId,
          amountUntaxed: move.amountUntaxed,
          amountTax: move.amountTax,
          amountTotal: move.amountTotal,
          amountResidual: move.amountTotal,
          ref: `Credit note for ${move.name ?? move.id}`,
          reversedEntryId: move.id,
          lineItems: {
            create: reversalLines.map((line) => ({
              accountId: line.accountId,
              partnerId: line.partnerId,
              name: line.name,
              displayType: line.displayType as any,
              debit: line.debit,
              credit: line.credit,
              balance: line.balance,
              amountCurrency: line.amountCurrency,
              quantity: line.quantity,
              priceUnit: line.priceUnit,
              discount: line.discount,
              taxLineId: line.taxLineId,
              dateMaturity: line.dateMaturity,
              sequence: line.sequence,
              taxes: line.taxIds.length > 0
                ? { connect: line.taxIds.map((id) => ({ id })) }
                : undefined,
            })),
          },
        },
        include: {
          lineItems: { include: { account: true, taxes: true }, orderBy: { sequence: "asc" } },
        },
      });
    }),
});
