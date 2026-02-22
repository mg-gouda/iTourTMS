import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import { paymentCreateSchema, registerPaymentSchema } from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  buildPaymentMoveLines,
  updateMovePaymentState,
} from "@/server/services/finance/payment-engine";
import { validateBalance } from "@/server/services/finance/move-engine";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

const financeProcedure = moduleProcedure("finance");

/** Get the default receivable/payable account based on payment type */
async function getCounterpartAccountId(
  db: any,
  companyId: string,
  paymentType: string,
): Promise<string> {
  const accountType = paymentType === "INBOUND"
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

/** Get bank/cash journal's default account */
async function getBankAccountId(
  db: any,
  journalId: string,
): Promise<string> {
  const journal = await db.journal.findUniqueOrThrow({
    where: { id: journalId },
    select: { defaultAccountId: true, type: true },
  });

  if (!journal.defaultAccountId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Payment journal must have a default account configured.",
    });
  }

  return journal.defaultAccountId;
}

export const paymentRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z.object({
        paymentType: z.enum(["INBOUND", "OUTBOUND"]).optional(),
        state: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
        partnerId: z.string().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const where: Record<string, unknown> = { companyId: ctx.companyId };

      if (input?.paymentType) where.paymentType = input.paymentType;
      if (input?.state) where.state = input.state;
      if (input?.partnerId) where.partnerId = input.partnerId;
      if (input?.dateFrom || input?.dateTo) {
        where.date = {
          ...(input.dateFrom && { gte: input.dateFrom }),
          ...(input.dateTo && { lte: input.dateTo }),
        };
      }

      const items = await ctx.db.payment.findMany({
        where: where as any,
        include: {
          partner: { select: { id: true, name: true } },
          journal: { select: { id: true, code: true, name: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          move: { select: { id: true, name: true } },
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
      const payment = await ctx.db.payment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          partner: { select: { id: true, name: true } },
          journal: { select: { id: true, code: true, name: true, type: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          move: {
            select: {
              id: true,
              name: true,
              state: true,
              lineItems: {
                include: {
                  account: { select: { id: true, code: true, name: true } },
                },
                orderBy: { sequence: "asc" },
              },
            },
          },
          invoices: {
            select: {
              id: true,
              name: true,
              moveType: true,
              amountTotal: true,
              amountResidual: true,
              paymentState: true,
              partner: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      return payment;
    }),

  create: financeProcedure
    .input(paymentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { invoiceMoveIds, ...data } = input;

      return ctx.db.payment.create({
        data: {
          ...data,
          companyId: ctx.companyId,
          state: "DRAFT",
          ...(invoiceMoveIds.length > 0 && {
            invoices: { connect: invoiceMoveIds.map((id) => ({ id })) },
          }),
        },
        include: {
          partner: { select: { id: true, name: true } },
          journal: { select: { id: true, code: true, name: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          invoices: { select: { id: true, name: true, amountTotal: true } },
        },
      });
    }),

  confirm: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          invoices: {
            select: {
              id: true,
              moveType: true,
              lineItems: {
                where: { displayType: "PAYMENT_TERM" },
                select: { id: true, debit: true, credit: true, accountId: true },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      if (payment.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft payments can be confirmed",
        });
      }

      const amount = new Decimal(payment.amount.toString());
      const bankAccountId = await getBankAccountId(ctx.db, payment.journalId);
      const receivableAccountId = await getCounterpartAccountId(
        ctx.db, ctx.companyId, payment.paymentType,
      );

      // Build payment journal entry lines
      const paymentLines = buildPaymentMoveLines(
        {
          paymentType: payment.paymentType as "INBOUND" | "OUTBOUND",
          amount,
          partnerId: payment.partnerId,
          currencyId: payment.currencyId,
        },
        receivableAccountId,
        bankAccountId,
      );

      validateBalance(paymentLines);

      // Get company currency
      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });
      const companyCurrencyId = company.baseCurrencyId ?? payment.currencyId;

      // Generate sequence number
      const name = await generateSequenceNumber(ctx.db, ctx.companyId, "payment");

      // Execute in transaction
      return ctx.db.$transaction(async (tx: any) => {
        // 1. Create the journal entry Move
        const move = await tx.move.create({
          data: {
            companyId: ctx.companyId,
            name: `${name} - Journal Entry`,
            moveType: "ENTRY",
            state: "POSTED",
            date: payment.date,
            journalId: payment.journalId,
            partnerId: payment.partnerId,
            currencyId: payment.currencyId,
            companyCurrencyId,
            amountUntaxed: amount,
            amountTax: 0,
            amountTotal: amount,
            amountResidual: 0,
            ref: payment.ref ?? name,
            postedAt: new Date(),
            lineItems: {
              create: paymentLines.map((line) => ({
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
                sequence: line.sequence,
              })),
            },
          },
          include: {
            lineItems: { select: { id: true, displayType: true, debit: true, credit: true, accountId: true } },
          },
        });

        // 2. Create PartialReconcile records
        // Find the payment's counterpart line (PAYMENT_TERM = receivable/payable side)
        const paymentCounterpartLine = move.lineItems.find(
          (li: any) => li.displayType === "PAYMENT_TERM",
        );

        if (paymentCounterpartLine && payment.invoices.length > 0) {
          let remainingAmount = amount;

          for (const invoice of payment.invoices) {
            if (remainingAmount.lessThanOrEqualTo(0)) break;

            for (const invoiceLine of invoice.lineItems) {
              if (remainingAmount.lessThanOrEqualTo(0)) break;

              // Determine the reconcile amount (min of remaining and line amount)
              const lineAmount = new Decimal(invoiceLine.debit.toString())
                .plus(new Decimal(invoiceLine.credit.toString()));
              const reconcileAmount = Decimal.min(remainingAmount, lineAmount).toDecimalPlaces(4);

              if (reconcileAmount.greaterThan(0)) {
                // Determine debit/credit line based on payment type
                const isInbound = payment.paymentType === "INBOUND";
                await tx.partialReconcile.create({
                  data: {
                    companyId: ctx.companyId,
                    // For INBOUND: invoice receivable line is debit, payment counterpart is credit
                    // For OUTBOUND: payment counterpart is debit, invoice payable line is credit
                    debitMoveLineId: isInbound ? invoiceLine.id : paymentCounterpartLine.id,
                    creditMoveLineId: isInbound ? paymentCounterpartLine.id : invoiceLine.id,
                    amount: reconcileAmount,
                  },
                });

                remainingAmount = remainingAmount.minus(reconcileAmount);
              }
            }
          }
        }

        // 3. Update payment record
        const updatedPayment = await tx.payment.update({
          where: { id: input.id },
          data: {
            state: "POSTED",
            name,
            moveId: move.id,
          },
          include: {
            partner: { select: { id: true, name: true } },
            journal: { select: { id: true, code: true, name: true } },
            currency: { select: { id: true, code: true, symbol: true } },
            move: { select: { id: true, name: true } },
          },
        });

        // 4. Update payment state on each linked invoice
        for (const invoice of payment.invoices) {
          await updateMovePaymentState(tx as any, invoice.id);
        }

        return updatedPayment;
      });
    }),

  cancel: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          invoices: { select: { id: true } },
          move: {
            select: {
              id: true,
              lineItems: { select: { id: true } },
            },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      if (payment.state !== "POSTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only posted payments can be cancelled",
        });
      }

      return ctx.db.$transaction(async (tx: any) => {
        // 1. Delete reconciliation records for this payment's move lines
        if (payment.move) {
          const moveLineIds = payment.move.lineItems.map((li: any) => li.id);
          await tx.partialReconcile.deleteMany({
            where: {
              OR: [
                { debitMoveLineId: { in: moveLineIds } },
                { creditMoveLineId: { in: moveLineIds } },
              ],
            },
          });

          // 2. Cancel the journal entry
          await tx.move.update({
            where: { id: payment.move.id },
            data: { state: "CANCELLED" },
          });
        }

        // 3. Update payment state
        const updatedPayment = await tx.payment.update({
          where: { id: input.id },
          data: {
            state: "CANCELLED",
            moveId: null,
          },
          include: {
            partner: { select: { id: true, name: true } },
            journal: { select: { id: true, code: true, name: true } },
            currency: { select: { id: true, code: true, symbol: true } },
          },
        });

        // 4. Recalculate payment state on each linked invoice
        for (const invoice of payment.invoices) {
          await updateMovePaymentState(tx, invoice.id);
        }

        return updatedPayment;
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      if (payment.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft payments can be deleted",
        });
      }

      return ctx.db.payment.delete({ where: { id: input.id } });
    }),

  registerPayment: financeProcedure
    .input(registerPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch the invoice to determine payment type and currency
      const invoice = await ctx.db.move.findFirst({
        where: { id: input.invoiceMoveId, companyId: ctx.companyId },
        select: {
          id: true,
          moveType: true,
          partnerId: true,
          currencyId: true,
          state: true,
          amountResidual: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.state !== "POSTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Can only register payment for posted invoices",
        });
      }

      // Determine payment type from invoice type
      const paymentType = invoice.moveType === "OUT_INVOICE" || invoice.moveType === "OUT_REFUND"
        ? "INBOUND"
        : "OUTBOUND";

      // Create payment in draft
      const payment = await ctx.db.payment.create({
        data: {
          companyId: ctx.companyId,
          paymentType,
          partnerId: invoice.partnerId,
          amount: input.amount,
          currencyId: invoice.currencyId,
          date: input.date,
          journalId: input.journalId,
          ref: input.ref,
          state: "DRAFT",
          invoices: { connect: [{ id: invoice.id }] },
        },
      });

      // Now confirm it using the confirm logic
      // Re-fetch with needed relations
      const fullPayment = await ctx.db.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: {
          invoices: {
            select: {
              id: true,
              moveType: true,
              lineItems: {
                where: { displayType: "PAYMENT_TERM" },
                select: { id: true, debit: true, credit: true, accountId: true },
              },
            },
          },
        },
      });

      const amount = new Decimal(fullPayment.amount.toString());
      const bankAccountId = await getBankAccountId(ctx.db, fullPayment.journalId);
      const receivableAccountId = await getCounterpartAccountId(
        ctx.db, ctx.companyId, fullPayment.paymentType,
      );

      const paymentLines = buildPaymentMoveLines(
        {
          paymentType: fullPayment.paymentType as "INBOUND" | "OUTBOUND",
          amount,
          partnerId: fullPayment.partnerId,
          currencyId: fullPayment.currencyId,
        },
        receivableAccountId,
        bankAccountId,
      );

      validateBalance(paymentLines);

      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });
      const companyCurrencyId = company.baseCurrencyId ?? fullPayment.currencyId;

      const name = await generateSequenceNumber(ctx.db, ctx.companyId, "payment");

      return ctx.db.$transaction(async (tx: any) => {
        const move = await tx.move.create({
          data: {
            companyId: ctx.companyId,
            name: `${name} - Journal Entry`,
            moveType: "ENTRY",
            state: "POSTED",
            date: fullPayment.date,
            journalId: fullPayment.journalId,
            partnerId: fullPayment.partnerId,
            currencyId: fullPayment.currencyId,
            companyCurrencyId,
            amountUntaxed: amount,
            amountTax: 0,
            amountTotal: amount,
            amountResidual: 0,
            ref: fullPayment.ref ?? name,
            postedAt: new Date(),
            lineItems: {
              create: paymentLines.map((line) => ({
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
                sequence: line.sequence,
              })),
            },
          },
          include: {
            lineItems: { select: { id: true, displayType: true, debit: true, credit: true } },
          },
        });

        // Create reconciliation records
        const paymentCounterpartLine = move.lineItems.find(
          (li: any) => li.displayType === "PAYMENT_TERM",
        );

        if (paymentCounterpartLine) {
          let remainingAmount = amount;

          for (const inv of fullPayment.invoices) {
            if (remainingAmount.lessThanOrEqualTo(0)) break;

            for (const invLine of inv.lineItems) {
              if (remainingAmount.lessThanOrEqualTo(0)) break;

              const lineAmount = new Decimal(invLine.debit.toString())
                .plus(new Decimal(invLine.credit.toString()));
              const reconcileAmount = Decimal.min(remainingAmount, lineAmount).toDecimalPlaces(4);

              if (reconcileAmount.greaterThan(0)) {
                const isInbound = fullPayment.paymentType === "INBOUND";
                await tx.partialReconcile.create({
                  data: {
                    companyId: ctx.companyId,
                    debitMoveLineId: isInbound ? invLine.id : paymentCounterpartLine.id,
                    creditMoveLineId: isInbound ? paymentCounterpartLine.id : invLine.id,
                    amount: reconcileAmount,
                  },
                });

                remainingAmount = remainingAmount.minus(reconcileAmount);
              }
            }
          }
        }

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            state: "POSTED",
            name,
            moveId: move.id,
          },
          include: {
            partner: { select: { id: true, name: true } },
            journal: { select: { id: true, code: true, name: true } },
            currency: { select: { id: true, code: true, symbol: true } },
            move: { select: { id: true, name: true } },
            invoices: { select: { id: true, name: true, amountTotal: true, amountResidual: true } },
          },
        });

        // Update invoice payment states
        for (const inv of fullPayment.invoices) {
          await updateMovePaymentState(tx, inv.id);
        }

        return updatedPayment;
      });
    }),
});
