import { createTRPCRouter } from "@/server/trpc";

import { activityRouter } from "./activity";
import { addonRouter } from "./addon";
import { bookingRouter } from "./booking";
import { ageGroupRouter } from "./age-group";
import { costSheetRouter } from "./cost-sheet";
import { customerRouter } from "./customer";
import { excursionRouter } from "./excursion";
import { leadRouter } from "./lead";
import { opportunityRouter } from "./opportunity";
import { programRouter } from "./program";
import { sellingPriceRouter } from "./selling-price";
import { supplierRouter } from "./supplier";

export const crmRouter = createTRPCRouter({
  lead: leadRouter,
  opportunity: opportunityRouter,
  activity: activityRouter,
  customer: customerRouter,
  supplier: supplierRouter,
  excursion: excursionRouter,
  program: programRouter,
  costSheet: costSheetRouter,
  addon: addonRouter,
  ageGroup: ageGroupRouter,
  sellingPrice: sellingPriceRouter,
  booking: bookingRouter,
});
