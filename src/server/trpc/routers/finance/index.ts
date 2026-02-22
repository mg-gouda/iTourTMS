import { createTRPCRouter } from "@/server/trpc";

import { accountRouter } from "./account";
import { fiscalPositionRouter } from "./fiscal-position";
import { journalRouter } from "./journal";
import { moveRouter } from "./move";
import { paymentRouter } from "./payment";
import { paymentTermRouter } from "./payment-term";
import { taxRouter } from "./tax";

export const financeRouter = createTRPCRouter({
  account: accountRouter,
  fiscalPosition: fiscalPositionRouter,
  journal: journalRouter,
  move: moveRouter,
  payment: paymentRouter,
  tax: taxRouter,
  paymentTerm: paymentTermRouter,
});
