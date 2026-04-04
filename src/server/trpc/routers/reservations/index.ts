import { createTRPCRouter } from "@/server/trpc";
import { bookingRouter } from "./booking";
import { bookingPaymentRouter } from "./booking-payment";
import { communicationRouter } from "./communication";
import { deadlineRouter } from "./deadline";
import { guestRouter } from "./guest";
import { reportsRouter } from "./reports";
import { specialRequestRouter } from "./special-request";
import { voucherRouter } from "./voucher";

export const reservationsRouter = createTRPCRouter({
  booking: bookingRouter,
  bookingPayment: bookingPaymentRouter,
  communication: communicationRouter,
  deadline: deadlineRouter,
  guest: guestRouter,
  reports: reportsRouter,
  specialRequest: specialRequestRouter,
  voucher: voucherRouter,
});
