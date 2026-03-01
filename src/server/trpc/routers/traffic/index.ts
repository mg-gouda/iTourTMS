import { createTRPCRouter } from "@/server/trpc";

import { airportRouter } from "./airport";
import { dispatchRouter } from "./dispatch";
import { driverRouter } from "./driver";
import { guestBookingRouter } from "./guest-booking";
import { partnerPriceOverrideRouter } from "./partner-price-override";
import { priceItemRouter } from "./price-item";
import { repRouter } from "./rep";
import { reportsRouter } from "./reports";
import { settingsRouter } from "./settings";
import { supplierTripPriceRouter } from "./supplier-trip-price";
import { trafficAssignmentRouter } from "./traffic-assignment";
import { trafficFlightRouter } from "./traffic-flight";
import { trafficJobRouter } from "./traffic-job";
import { vehicleRouter } from "./vehicle";
import { vehicleTypeRouter } from "./vehicle-type";
import { zoneRouter } from "./zone";

export const trafficRouter = createTRPCRouter({
  airport: airportRouter,
  zone: zoneRouter,
  vehicleType: vehicleTypeRouter,
  vehicle: vehicleRouter,
  driver: driverRouter,
  rep: repRouter,
  priceItem: priceItemRouter,
  partnerPriceOverride: partnerPriceOverrideRouter,
  supplierTripPrice: supplierTripPriceRouter,
  trafficJob: trafficJobRouter,
  trafficFlight: trafficFlightRouter,
  trafficAssignment: trafficAssignmentRouter,
  dispatch: dispatchRouter,
  guestBooking: guestBookingRouter,
  settings: settingsRouter,
  reports: reportsRouter,
});
