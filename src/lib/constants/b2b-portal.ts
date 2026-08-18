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

/**
 * What a partner user may do inside the portal. Three roles, because the three
 * jobs at a travel agency rarely sit with the same person: the manager who
 * hires and fires, the consultant who sells, and whoever pays the invoices.
 */
export const PARTNER_ROLE_LABELS: Record<string, string> = {
  PARTNER_ADMIN: "Admin",
  PARTNER_AGENT: "Agent",
  PARTNER_ACCOUNTANT: "Accountant",
};

export const PARTNER_ROLE_DESCRIPTIONS: Record<string, string> = {
  PARTNER_ADMIN: "Books, sees money, and manages their own colleagues' logins.",
  PARTNER_AGENT: "Searches, books and amends. No credit or statements.",
  PARTNER_ACCOUNTANT: "Statements, invoices and credit. Cannot book.",
};

/** Actions written to the partner audit trail, in words a person can read. */
export const PARTNER_AUDIT_LABELS: Record<string, string> = {
  LOGIN_OK: "Signed in",
  LOGIN_FAILED: "Failed sign-in",
  LOCKED_OUT: "Locked out",
  ACCESS_DENIED: "Access denied",
  LOGOUT: "Signed out",
  INVITE_SENT: "Invitation sent",
  INVITE_ACCEPTED: "Invitation accepted",
  PASSWORD_SET: "Password set",
  PASSWORD_CHANGED: "Password changed",
  TWO_FACTOR_ENROLLED: "Two-factor set up",
  TWO_FACTOR_RESET: "Two-factor reset",
  BACKUP_CODES_VIEWED: "Backup codes viewed",
  TERMS_ACCEPTED: "Terms accepted",
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  USER_DEACTIVATED: "User deactivated",
  PORTAL_ENABLED: "Portal enabled",
  PORTAL_DISABLED: "Portal disabled",
  SEARCH_RUN: "Search",
  BOOKING_CREATED: "Booking created",
  BOOKING_AMENDED: "Booking amended",
  BOOKING_CANCELLED: "Booking cancelled",
  DOCUMENT_DOWNLOADED: "Document downloaded",
  MARKUP_CHANGED: "Markup changed",
};

/**
 * Booking states in the partner's words. The staff labels describe our
 * workflow; these describe what the partner is waiting for.
 */
export const PARTNER_BOOKING_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  ON_REQUEST: "On request",
  PENDING_APPROVAL: "Awaiting our approval",
  CANCELLED: "Cancelled",
  CHECKED_IN: "In house",
  CHECKED_OUT: "Completed",
  NO_SHOW: "No show",
  DRAFT: "Draft",
  NEW_BOOKING: "New",
};

export const PARTNER_BOOKING_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
> = {
  CONFIRMED: "success",
  ON_REQUEST: "warning",
  PENDING_APPROVAL: "warning",
  CANCELLED: "destructive",
  CHECKED_IN: "info",
  CHECKED_OUT: "secondary",
  NO_SHOW: "destructive",
  DRAFT: "secondary",
  NEW_BOOKING: "default",
};

/** What the partner sees on their own booking timeline. */
export const PARTNER_TIMELINE_LABELS: Record<string, string> = {
  PARTNER_AMENDED: "Booking changed",
  PARTNER_AMENDMENT_REQUESTED: "Change requested — awaiting our approval",
  PARTNER_AMENDMENT_ON_REQUEST: "Change requested — awaiting the hotel",
  PARTNER_DETAILS_UPDATED: "Guest or flight details updated",
  PARTNER_CANCELLATION_REQUESTED: "Cancellation requested",
  PARTNER_CANCELLED: "Cancelled",
};
