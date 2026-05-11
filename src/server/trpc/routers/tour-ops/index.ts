import { createTRPCRouter } from "@/server/trpc";
import { opsFileRouter } from "./file";
import { opsPackageRouter } from "./package";
import { opsComponentRouter } from "./component";
import { opsQuotationRouter } from "./quotation";
import { opsPnlRouter } from "./pnl";
import { opsDispatchRouter } from "./dispatch";
import { opsReportsRouter } from "./reports";
import { tourOpsLookupRouter } from "./lookup";
import { opsTransportRouter } from "./transport";
import { opsSightseeingRouter } from "./sightseeing";
import { opsGuidanceRouter } from "./guidance";
import { opsMealsRouter } from "./meals";
import { opsCalculatorRouter } from "./calculator";

export const tourOpsRouter = createTRPCRouter({
  file: opsFileRouter,
  package: opsPackageRouter,
  component: opsComponentRouter,
  quotation: opsQuotationRouter,
  pnl: opsPnlRouter,
  dispatch: opsDispatchRouter,
  reports: opsReportsRouter,
  lookup: tourOpsLookupRouter,
  transport: opsTransportRouter,
  sightseeing: opsSightseeingRouter,
  guidance: opsGuidanceRouter,
  meals: opsMealsRouter,
  calculator: opsCalculatorRouter,
});
