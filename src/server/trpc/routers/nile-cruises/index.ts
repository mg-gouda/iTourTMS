import { createTRPCRouter } from "@/server/trpc";
import { cruiseBoatRouter } from "./boat";
import { cruiseDeckRouter } from "./deck";
import { cruiseCabinCategoryRouter } from "./cabin-category";
import { cruiseCabinRouter } from "./cabin";
import { cruiseTypeRouter } from "./cruise-type";
import { cruiseItineraryRouter } from "./itinerary";
import { cruiseCancellationPolicyRouter } from "./cancellation-policy";
import { cruiseContractRouter } from "./contract";
import { cruiseSeasonRouter } from "./season";
import { cruiseBaseRateRouter } from "./base-rate";
import { cruiseSupplementRouter } from "./supplement";
import { cruiseOfferRouter } from "./offer";
import { cruiseGalaMealRouter } from "./gala-meal";
import { cruiseStopSaleRouter } from "./stop-sale";
import { cruiseDepartureRouter, cruiseDeparturePatternRouter } from "./departure";
import { cruiseAllotmentRouter } from "./allotment";
import { cruiseBookingRouter } from "./booking";
import { cruisePassengerRouter } from "./passenger";
import { cruiseCabinAssignmentRouter } from "./cabin-assignment";
import { cruiseBookingPaymentRouter } from "./booking-payment";
import { cruiseSpecialRequestRouter } from "./special-request";
import { cruiseCommunicationRouter } from "./communication";
import { cruiseAmendmentRouter } from "./amendment";
import { cruiseVoucherRouter } from "./voucher";
import { cruiseManifestRouter } from "./manifest";
import { cruiseChildPolicyRouter } from "./child-policy";
import { cruiseEmbarkDayRouter } from "./embark-day";
import { cruiseMarkupRouter } from "./markup";
import { cruiseDashboardRouter } from "./dashboard";
import { cruiseReportsRouter } from "./reports";
import { cruiseSearchRouter } from "./search";
import { cruiseSettingsRouter } from "./settings";
import { cruiseTemplateRouter } from "./template";

export const nileCruisesRouter = createTRPCRouter({
  boat: cruiseBoatRouter,
  deck: cruiseDeckRouter,
  cabinCategory: cruiseCabinCategoryRouter,
  cabin: cruiseCabinRouter,
  cruiseType: cruiseTypeRouter,
  itinerary: cruiseItineraryRouter,
  cancellationPolicy: cruiseCancellationPolicyRouter,
  contract: cruiseContractRouter,
  season: cruiseSeasonRouter,
  baseRate: cruiseBaseRateRouter,
  supplement: cruiseSupplementRouter,
  offer: cruiseOfferRouter,
  galaMeal: cruiseGalaMealRouter,
  stopSale: cruiseStopSaleRouter,
  departure: cruiseDepartureRouter,
  departurePattern: cruiseDeparturePatternRouter,
  allotment: cruiseAllotmentRouter,
  booking: cruiseBookingRouter,
  passenger: cruisePassengerRouter,
  cabinAssignment: cruiseCabinAssignmentRouter,
  payment: cruiseBookingPaymentRouter,
  specialRequest: cruiseSpecialRequestRouter,
  communication: cruiseCommunicationRouter,
  amendment: cruiseAmendmentRouter,
  voucher: cruiseVoucherRouter,
  manifest: cruiseManifestRouter,
  childPolicy: cruiseChildPolicyRouter,
  embarkDay: cruiseEmbarkDayRouter,
  markup: cruiseMarkupRouter,
  dashboard: cruiseDashboardRouter,
  reports: cruiseReportsRouter,
  search: cruiseSearchRouter,
  settings: cruiseSettingsRouter,
  template: cruiseTemplateRouter,
});
