import { createTRPCRouter } from "@/server/trpc";
import { bookingRouter } from "./booking";
import { bookingPaymentRouter } from "./booking-payment";
import { guestRouter } from "./guest";
import { reportsRouter } from "./reports";
import { voucherRouter } from "./voucher";

export const reservationsRouter = createTRPCRouter({
  booking: bookingRouter,
  bookingPayment: bookingPaymentRouter,
  guest: guestRouter,
  reports: reportsRouter,
  voucher: voucherRouter,
});
