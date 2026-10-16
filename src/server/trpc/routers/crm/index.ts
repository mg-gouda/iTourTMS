import { createTRPCRouter } from "@/server/trpc";

import { activityRouter } from "./activity";
import { addonRouter } from "./addon";
import { bookingRouter } from "./booking";
import { ageGroupRouter } from "./age-group";
import { costSheetRouter } from "./cost-sheet";
import { excursionTicketRouter } from "./excursion-ticket";
import { excursionBreakdownRouter } from "./excursion-breakdown";
import { excursionDispatchRouter } from "./excursion-dispatch";
import { pickupLocationRouter } from "./pickup-location";
import { pickupTimeSheetRouter } from "./pickup-time-sheet";
import { programPlanRouter } from "./program-plan";
import { customerRouter } from "./customer";
import { excursionRouter } from "./excursion";
import { leadRouter } from "./lead";
import { opportunityRouter } from "./opportunity";
import { programRouter } from "./program";
import { sellingPriceRouter } from "./selling-price";
import { supplierRouter } from "./supplier";
import { salesTeamRouter } from "./sales-team";
import { mailingRouter } from "./mailing";

export const crmRouter = createTRPCRouter({
  lead: leadRouter,
  salesTeam: salesTeamRouter,
  mailing: mailingRouter,
  opportunity: opportunityRouter,
  activity: activityRouter,
  customer: customerRouter,
  supplier: supplierRouter,
  excursion: excursionRouter,
  program: programRouter,
  costSheet: costSheetRouter,
  pickupLocation: pickupLocationRouter,
  pickupTimeSheet: pickupTimeSheetRouter,
  programPlan: programPlanRouter,
  addon: addonRouter,
  ageGroup: ageGroupRouter,
  sellingPrice: sellingPriceRouter,
  booking: bookingRouter,
  excursionTicket: excursionTicketRouter,
  excursionBreakdown: excursionBreakdownRouter,
  excursionDispatch: excursionDispatchRouter,
});
