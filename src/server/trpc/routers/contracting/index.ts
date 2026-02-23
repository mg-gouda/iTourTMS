import { createTRPCRouter } from "@/server/trpc";

import { childPolicyRouter } from "./child-policy";
import { destinationRouter } from "./destination";
import { hotelRouter } from "./hotel";
import { mealBasisRouter } from "./meal-basis";
import { roomTypeRouter } from "./room-type";

export const contractingRouter = createTRPCRouter({
  childPolicy: childPolicyRouter,
  destination: destinationRouter,
  hotel: hotelRouter,
  mealBasis: mealBasisRouter,
  roomType: roomTypeRouter,
});
