// B2B Portal Constants

export const B2B_PARTNER_TYPE_LABELS: Record<string, string> = {
  tour_operator: "Tour Operator",
  travel_agent: "Travel Agent",
};

export const B2B_CREDIT_TX_TYPE_LABELS: Record<string, string> = {
  BOOKING_CHARGE: "Booking Charge",
  PAYMENT_RECEIVED: "Payment Received",
  CREDIT_NOTE: "Credit Note",
  ADJUSTMENT: "Adjustment",
};

export const B2B_CREDIT_TX_TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  BOOKING_CHARGE: "destructive",
  PAYMENT_RECEIVED: "default",
  CREDIT_NOTE: "secondary",
  ADJUSTMENT: "outline",
};
