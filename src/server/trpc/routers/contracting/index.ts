import { createTRPCRouter } from "@/server/trpc";

import { auditLogRouter } from "./audit-log";
import { cancellationPolicyRouter } from "./cancellation-policy";
import { childPolicyRouter } from "./child-policy";
import { contractAllotmentRouter } from "./contract-allotment";
import { contractChildPolicyRouter } from "./contract-child-policy";
import { contractRouter } from "./contract";
import { contractBaseRateRouter } from "./contract-base-rate";
import { contractMealBasisRouter } from "./contract-meal-basis";
import { contractRoomTypeRouter } from "./contract-room-type";
import { contractSeasonRouter } from "./contract-season";
import { contractSupplementRouter } from "./contract-supplement";
import { rateCalculatorRouter } from "./rate-calculator";
import { reportsRouter } from "./reports";
import { seasonSpoRouter } from "./season-spo";
import { specialOfferRouter } from "./special-offer";
import { destinationRouter } from "./destination";
import { hotelRouter } from "./hotel";
import { marketRouter } from "./market";
import { mealBasisRouter } from "./meal-basis";
import { roomTypeRouter } from "./room-type";
import { marketingContributionRouter } from "./marketing-contribution";
import { markupRuleRouter } from "./markup-rule";
import { rateVerificationRouter } from "./rate-verification";
import { specialMealRouter } from "./special-meal";
import { tariffRouter } from "./tariff";
import { tourOperatorRouter } from "./tour-operator";

export const contractingRouter = createTRPCRouter({
  auditLog: auditLogRouter,
  cancellationPolicy: cancellationPolicyRouter,
  childPolicy: childPolicyRouter,
  contract: contractRouter,
  contractAllotment: contractAllotmentRouter,
  contractChildPolicy: contractChildPolicyRouter,
  contractBaseRate: contractBaseRateRouter,
  contractMealBasis: contractMealBasisRouter,
  contractRoomType: contractRoomTypeRouter,
  contractSeason: contractSeasonRouter,
  contractSupplement: contractSupplementRouter,
  rateCalculator: rateCalculatorRouter,
  reports: reportsRouter,
  seasonSpo: seasonSpoRouter,
  specialOffer: specialOfferRouter,
  destination: destinationRouter,
  hotel: hotelRouter,
  market: marketRouter,
  mealBasis: mealBasisRouter,
  roomType: roomTypeRouter,
  tourOperator: tourOperatorRouter,
  marketingContribution: marketingContributionRouter,
  markupRule: markupRuleRouter,
  rateVerification: rateVerificationRouter,
  specialMeal: specialMealRouter,
  tariff: tariffRouter,
});
