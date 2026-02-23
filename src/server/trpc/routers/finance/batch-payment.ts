import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import { batchPaymentCreateSchema } from "@/lib/validations/finance";
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
  const accountType =
    paymentType === "INBOUND" ? "ASSET_RECEIVABLE" : "LIABILITY_PAYABLE";

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

export const batchPaymentRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z
        .object({
          state: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
          paymentType: z.enum(["INBOUND", "OUTBOUND"]).optional(),
          cursor: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const where: Record<string, unknown> = { companyId: ctx.companyId };

      if (input?.state) where.state = input.state;
      if (input?.paymentType) where.paymentType = input.paymentType;

      const items = await ctx.db.batchPayment.findMany({
        where: where as any,
        include: {
          journal: { select: { id: true, code: true, name: true } },
          _count: { select: { payments: true } },
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
      const batch = await ctx.db.batchPayment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          journal: { select: { id: true, code: true, name: true, type: true } },
          payments: {
            include: {
              partner: { select: { id: true, name: true } },
              currency: { select: { id: true, code: true, symbol: true } },
              invoices: {
                select: {
                  id: true,
                  name: true,
                  moveType: true,
                  amountTotal: true,
                  amountResidual: true,
                  paymentState: true,
                },
              },
            },
            orderBy: { date: "asc" },
          },
        },
      });

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Batch payment not found",
        });
      }

      return batch;
    }),

  create: financeProcedure
    .input(batchPaymentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch selected invoices to compute totals and create individual payments
      const invoices = await ctx.db.move.findMany({
        where: {
          id: { in: input.invoiceMoveIds },
          companyId: ctx.companyId,
          state: "POSTED",
          moveType: {
            in:
              input.paymentType === "INBOUND"
                ? ["OUT_INVOICE"]
                : ["IN_INVOICE"],
          },
        },
        select: {
          id: true,
          partnerId: true,
          currencyId: true,
          amountResidual: true,
          amountTotal: true,
        },
      });

      if (invoices.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No valid unpaid invoices selected",
        });
      }

      // Compute total
      let totalAmount = new Decimal(0);
      for (const inv of invoices) {
        const residual = new Decimal(inv.amountResidual.toString());
        totalAmount = totalAmount.plus(residual.greaterThan(0) ? residual : new Decimal(inv.amountTotal.toString()));
      }

      return ctx.db.$transaction(async (tx: any) => {
        // Create batch payment
        const batch = await tx.batchPayment.create({
          data: {
            companyId: ctx.companyId,
            journalId: input.journalId,
            date: input.date,
            paymentType: input.paymentType,
            state: "DRAFT",
            totalAmount: totalAmount.toDecimalPlaces(4),
            paymentCount: invoices.length,
          },
        });

        // Create individual draft payments for each invoice
        for (const inv of invoices) {
          const residual = new Decimal(inv.amountResidual.toString());
          const paymentAmount = residual.greaterThan(0)
            ? residual
            : new Decimal(inv.amountTotal.toString());

          await tx.payment.create({
            data: {
              companyId: ctx.companyId,
              paymentType: input.paymentType,
              partnerId: inv.partnerId,
              amount: paymentAmount.toDecimalPlaces(4),
              currencyId: inv.currencyId,
              date: input.date,
              journalId: input.journalId,
              state: "DRAFT",
              batchPaymentId: batch.id,
              invoices: { connect: [{ id: inv.id }] },
            },
          });
        }

        return tx.batchPayment.findUnique({
          where: { id: batch.id },
          include: {
            journal: { select: { id: true, code: true, name: true } },
            payments: {
              include: {
                partner: { select: { id: true, name: true } },
                currency: { select: { id: true, code: true, symbol: true } },
                invoices: {
                  select: { id: true, name: true, amountTotal: true },
                },
              },
            },
          },
        });
      });
    }),

  confirm: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await ctx.db.batchPayment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          payments: {
            where: { state: "DRAFT" },
            include: {
              invoices: {
                select: {
                  id: true,
                  moveType: true,
                  lineItems: {
                    where: { displayType: "PAYMENT_TERM" },
                    select: {
                      id: true,
                      debit: true,
                      credit: true,
                      accountId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Batch payment not found",
        });
      }

      if (batch.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft batch payments can be confirmed",
        });
      }

      if (batch.payments.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Batch has no draft payments to confirm",
        });
      }

      // Get journal bank account
      const journal = await ctx.db.journal.findUniqueOrThrow({
        where: { id: batch.journalId },
        select: { defaultAccountId: true },
      });

      if (!journal.defaultAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Payment journal must have a default account configured",
        });
      }

      const bankAccountId = journal.defaultAccountId;
      const receivableAccountId = await getCounterpartAccountId(
        ctx.db,
        ctx.companyId,
        batch.paymentType,
      );

      // Get company currency
      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { baseCurrencyId: true },
      });

      // Generate batch sequence
      const batchName = await generateSequenceNumber(
        ctx.db,
        ctx.companyId,
        "batch_payment",
      );

      return ctx.db.$transaction(async (tx: any) => {
        // Confirm each individual payment
        for (const payment of batch.payments) {
          const amount = new Decimal(payment.amount.toString());

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

          const paymentName = await generateSequenceNumber(
            tx,
            ctx.companyId,
            "payment",
          );

          const companyCurrencyId =
            company.baseCurrencyId ?? payment.currencyId;

          // Create journal entry Move
          const move = await tx.move.create({
            data: {
              companyId: ctx.companyId,
              name: `${paymentName} - Journal Entry`,
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
              ref: payment.ref ?? paymentName,
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
              lineItems: {
                select: {
                  id: true,
                  displayType: true,
                  debit: true,
                  credit: true,
                },
              },
            },
          });

          // Create PartialReconcile records
          const paymentCounterpartLine = move.lineItems.find(
            (li: any) => li.displayType === "PAYMENT_TERM",
          );

          if (paymentCounterpartLine && payment.invoices.length > 0) {
            let remainingAmount = amount;

            for (const invoice of payment.invoices) {
              if (remainingAmount.lessThanOrEqualTo(0)) break;

              for (const invoiceLine of invoice.lineItems) {
                if (remainingAmount.lessThanOrEqualTo(0)) break;

                const lineAmount = new Decimal(invoiceLine.debit.toString())
                  .plus(new Decimal(invoiceLine.credit.toString()));
                const reconcileAmount = Decimal.min(
                  remainingAmount,
                  lineAmount,
                ).toDecimalPlaces(4);

                if (reconcileAmount.greaterThan(0)) {
                  const isInbound = payment.paymentType === "INBOUND";
                  await tx.partialReconcile.create({
                    data: {
                      companyId: ctx.companyId,
                      debitMoveLineId: isInbound
                        ? invoiceLine.id
                        : paymentCounterpartLine.id,
                      creditMoveLineId: isInbound
                        ? paymentCounterpartLine.id
                        : invoiceLine.id,
                      amount: reconcileAmount,
                    },
                  });

                  remainingAmount = remainingAmount.minus(reconcileAmount);
                }
              }
            }
          }

          // Update payment record
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              state: "POSTED",
              name: paymentName,
              moveId: move.id,
            },
          });

          // Update invoice payment states
          for (const invoice of payment.invoices) {
            await updateMovePaymentState(tx, invoice.id);
          }
        }

        // Update batch payment
        return tx.batchPayment.update({
          where: { id: input.id },
          data: {
            state: "POSTED",
            name: batchName,
          },
          include: {
            journal: { select: { id: true, code: true, name: true } },
            payments: {
              include: {
                partner: { select: { id: true, name: true } },
                currency: { select: { id: true, code: true, symbol: true } },
                move: { select: { id: true, name: true } },
              },
            },
          },
        });
      });
    }),

  cancel: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await ctx.db.batchPayment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          payments: {
            include: {
              invoices: { select: { id: true } },
              move: {
                select: {
                  id: true,
                  lineItems: { select: { id: true } },
                },
              },
            },
          },
        },
      });

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Batch payment not found",
        });
      }

      if (batch.state !== "POSTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only confirmed batch payments can be cancelled",
        });
      }

      return ctx.db.$transaction(async (tx: any) => {
        for (const payment of batch.payments) {
          if (payment.state !== "POSTED") continue;

          // Delete reconciliation records
          if (payment.move) {
            const moveLineIds = payment.move.lineItems.map(
              (li: any) => li.id,
            );
            await tx.partialReconcile.deleteMany({
              where: {
                OR: [
                  { debitMoveLineId: { in: moveLineIds } },
                  { creditMoveLineId: { in: moveLineIds } },
                ],
              },
            });

            // Cancel journal entry
            await tx.move.update({
              where: { id: payment.move.id },
              data: { state: "CANCELLED" },
            });
          }

          // Update payment
          await tx.payment.update({
            where: { id: payment.id },
            data: { state: "CANCELLED", moveId: null },
          });

          // Revert invoice payment states
          for (const invoice of payment.invoices) {
            await updateMovePaymentState(tx, invoice.id);
          }
        }

        // Update batch
        return tx.batchPayment.update({
          where: { id: input.id },
          data: { state: "CANCELLED" },
          include: {
            journal: { select: { id: true, code: true, name: true } },
            _count: { select: { payments: true } },
          },
        });
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await ctx.db.batchPayment.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Batch payment not found",
        });
      }

      if (batch.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft batch payments can be deleted",
        });
      }

      // Delete child payments first, then batch
      await ctx.db.payment.deleteMany({
        where: { batchPaymentId: input.id },
      });

      return ctx.db.batchPayment.delete({ where: { id: input.id } });
    }),
});
