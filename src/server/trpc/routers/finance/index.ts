import { createTRPCRouter } from "@/server/trpc";

import { accountRouter } from "./account";
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

export const financeRouter = createTRPCRouter({
  account: accountRouter,
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
});
