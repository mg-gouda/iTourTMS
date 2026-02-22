import { createTRPCRouter } from "@/server/trpc";

import { accountRouter } from "./account";
import { journalRouter } from "./journal";
import { paymentTermRouter } from "./payment-term";
import { taxRouter } from "./tax";

export const financeRouter = createTRPCRouter({
  account: accountRouter,
  journal: journalRouter,
  tax: taxRouter,
  paymentTerm: paymentTermRouter,
});
