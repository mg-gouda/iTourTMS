import { createTRPCRouter } from "@/server/trpc";

import { accountRouter } from "./account";
import { bankStatementRouter } from "./bank-statement";
import { batchPaymentRouter } from "./batch-payment";
import { fiscalPositionRouter } from "./fiscal-position";
import { journalRouter } from "./journal";
import { moveRouter } from "./move";
import { paymentRouter } from "./payment";
import { paymentTermRouter } from "./payment-term";
import { reconciliationRouter } from "./reconciliation";
import { taxRouter } from "./tax";

export const financeRouter = createTRPCRouter({
  account: accountRouter,
  bankStatement: bankStatementRouter,
  batchPayment: batchPaymentRouter,
  fiscalPosition: fiscalPositionRouter,
  journal: journalRouter,
  move: moveRouter,
  payment: paymentRouter,
  tax: taxRouter,
  paymentTerm: paymentTermRouter,
  reconciliation: reconciliationRouter,
});
