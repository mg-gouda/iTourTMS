import { createTRPCRouter } from "@/server/trpc";

import { accountRouter } from "./account";
import { partnerRouter } from "./partner";
import { bankStatementRouter } from "./bank-statement";
import { budgetRouter } from "./budget";
import { batchPaymentRouter } from "./batch-payment";
import { currencyRouter } from "./currency";
import { fiscalPositionRouter } from "./fiscal-position";
import { journalRouter } from "./journal";
import { moveRouter } from "./move";
import { paymentRouter } from "./payment";
import { periodRouter } from "./period";
import { paymentTermRouter } from "./payment-term";
import { reconciliationRouter } from "./reconciliation";
import { recurringEntryRouter } from "./recurring-entry";
import { reportRouter } from "./report";
import { taxRouter } from "./tax";
import { analyticRouter } from "./analytic";
import { assetRouter } from "./asset";
import { loanRouter } from "./loan";
import { taxReturnRouter } from "./tax-return";
import { lockDateRouter } from "./lock-date";
import { auditTrailRouter } from "./audit-trail";
import { workingFileRouter } from "./working-file";
import { deferredRevenueRouter } from "./deferred-revenue";
import { deferredExpenseRouter } from "./deferred-expense";
import { unrealizedCurrencyRouter } from "./unrealized-currency";
import { reviewRouter } from "./review";

export const financeRouter = createTRPCRouter({
  account: accountRouter,
  partner: partnerRouter,
  bankStatement: bankStatementRouter,
  batchPayment: batchPaymentRouter,
  budget: budgetRouter,
  currency: currencyRouter,
  fiscalPosition: fiscalPositionRouter,
  journal: journalRouter,
  move: moveRouter,
  payment: paymentRouter,
  period: periodRouter,
  tax: taxRouter,
  paymentTerm: paymentTermRouter,
  reconciliation: reconciliationRouter,
  recurringEntry: recurringEntryRouter,
  report: reportRouter,
  analytic: analyticRouter,
  asset: assetRouter,
  loan: loanRouter,
  taxReturn: taxReturnRouter,
  lockDate: lockDateRouter,
  auditTrail: auditTrailRouter,
  workingFile: workingFileRouter,
  deferredRevenue: deferredRevenueRouter,
  deferredExpense: deferredExpenseRouter,
  unrealizedCurrency: unrealizedCurrencyRouter,
  review: reviewRouter,
});
