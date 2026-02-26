export const BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const BOOKING_STATUS_VARIANTS: Record<string, string> = {
  DRAFT: "secondary",
  CONFIRMED: "info",
  CHECKED_IN: "success",
  CHECKED_OUT: "default",
  CANCELLED: "destructive",
  NO_SHOW: "warning",
};

export const BOOKING_SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  TOUR_OPERATOR: "Tour Operator",
  API: "API",
};

export const BOOKING_SOURCE_VARIANTS: Record<string, string> = {
  DIRECT: "default",
  TOUR_OPERATOR: "info",
  API: "outline",
};

export const VOUCHER_STATUS_LABELS: Record<string, string> = {
  ISSUED: "Issued",
  USED: "Used",
  CANCELLED: "Cancelled",
};

export const VOUCHER_STATUS_VARIANTS: Record<string, string> = {
  ISSUED: "info",
  USED: "success",
  CANCELLED: "destructive",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially Paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_VARIANTS: Record<string, string> = {
  UNPAID: "destructive",
  PARTIAL: "warning",
  PAID: "success",
  REFUNDED: "secondary",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  CHEQUE: "Cheque",
};

export const GUEST_TYPE_LABELS: Record<string, string> = {
  LEAD: "Lead Guest",
  ADDITIONAL: "Additional Guest",
  CHILD: "Child",
};

export const TIMELINE_ACTION_LABELS: Record<string, string> = {
  CREATED: "Booking Created",
  CONFIRMED: "Booking Confirmed",
  CANCELLED: "Booking Cancelled",
  PAYMENT_RECEIVED: "Payment Received",
  CHECKED_IN: "Guest Checked In",
  CHECKED_OUT: "Guest Checked Out",
  NOTE: "Note Added",
  ROOM_ADDED: "Room Added",
  ROOM_REMOVED: "Room Removed",
  VOUCHER_ISSUED: "Voucher Issued",
  STATUS_CHANGED: "Status Changed",
};
