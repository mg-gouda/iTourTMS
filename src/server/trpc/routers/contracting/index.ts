import { createTRPCRouter } from "@/server/trpc";

import { childPolicyRouter } from "./child-policy";
import { contractRouter } from "./contract";
import { contractBaseRateRouter } from "./contract-base-rate";
import { contractMealBasisRouter } from "./contract-meal-basis";
import { contractRoomTypeRouter } from "./contract-room-type";
import { contractSeasonRouter } from "./contract-season";
import { contractSupplementRouter } from "./contract-supplement";
import { rateCalculatorRouter } from "./rate-calculator";
import { specialOfferRouter } from "./special-offer";
import { destinationRouter } from "./destination";
import { hotelRouter } from "./hotel";
import { mealBasisRouter } from "./meal-basis";
import { roomTypeRouter } from "./room-type";

export const contractingRouter = createTRPCRouter({
  childPolicy: childPolicyRouter,
  contract: contractRouter,
  contractBaseRate: contractBaseRateRouter,
  contractMealBasis: contractMealBasisRouter,
  contractRoomType: contractRoomTypeRouter,
  contractSeason: contractSeasonRouter,
  contractSupplement: contractSupplementRouter,
  rateCalculator: rateCalculatorRouter,
  specialOffer: specialOfferRouter,
  destination: destinationRouter,
  hotel: hotelRouter,
  mealBasis: mealBasisRouter,
  roomType: roomTypeRouter,
});
