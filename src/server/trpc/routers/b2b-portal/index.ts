import { createTRPCRouter } from "@/server/trpc";

import { tourOperatorRouter } from "./tour-operator";
import { travelAgentRouter } from "./travel-agent";
import { reservationRouter } from "./reservation";
import { voucherRouter } from "./voucher";
import { rateSheetRouter } from "./rate-sheet";
import { markupRouter } from "./markup";
import { creditRouter } from "./credit";
import { reportsRouter } from "./reports";
import { searchRouter } from "./search";
import { partnerUserRouter } from "./partner-user";

export const b2bPortalRouter = createTRPCRouter({
  tourOperator: tourOperatorRouter,
  travelAgent: travelAgentRouter,
  reservation: reservationRouter,
  voucher: voucherRouter,
  rateSheet: rateSheetRouter,
  markup: markupRouter,
  credit: creditRouter,
  reports: reportsRouter,
  search: searchRouter,
  partnerUser: partnerUserRouter,
});
