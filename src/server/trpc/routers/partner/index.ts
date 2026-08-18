import { createTRPCRouter } from "@/server/trpc";

import { partnerBookingRouter } from "./booking";
import { partnerCreditRouter } from "./credit";
import { partnerDashboardRouter } from "./dashboard";
import { partnerSearchRouter } from "./search";

/**
 * Everything the B2B portal calls. Separate from `b2bPortal`, which is the
 * staff side of the same relationship: these procedures run as the partner.
 */
export const partnerRouter = createTRPCRouter({
  dashboard: partnerDashboardRouter,
  search: partnerSearchRouter,
  booking: partnerBookingRouter,
  credit: partnerCreditRouter,
});
