// ── Service Type Labels ──

export const TT_SERVICE_TYPE_LABELS: Record<string, string> = {
  ARR: "Arrival",
  DEP: "Departure",
  ARR_DEP: "Arrival & Departure",
  EXCURSION: "Excursion",
  INTER_HOTEL: "Inter-Hotel",
  CITY_TOUR: "City Tour",
  PRIVATE_HIRE: "Private Hire",
  AIRPORT_MEET: "Airport Meet & Assist",
  VIP: "VIP Transfer",
  SHUTTLE: "Shuttle",
  CHARTER: "Charter",
  OTHER: "Other",
};

// ── Job Status Labels & Variants ──

export const TT_JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  DISPATCHED: "Dispatched",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const TT_JOB_STATUS_VARIANTS: Record<string, string> = {
  PENDING: "secondary",
  CONFIRMED: "info",
  ASSIGNED: "default",
  DISPATCHED: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

/** Valid transitions: from → to[] */
export const TT_JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

// ── Vehicle Ownership Labels ──

export const TT_VEHICLE_OWNERSHIP_LABELS: Record<string, string> = {
  OWNED: "Owned",
  RENTED: "Rented",
  CONTRACTED: "Contracted",
};

// ── Vehicle Status Labels & Variants ──

export const TT_VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  IN_MAINTENANCE: "In Maintenance",
  OUT_OF_SERVICE: "Out of Service",
  RETIRED: "Retired",
};

export const TT_VEHICLE_STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: "success",
  IN_MAINTENANCE: "warning",
  OUT_OF_SERVICE: "destructive",
  RETIRED: "secondary",
};

// ── Driver Status Labels & Variants ──

export const TT_DRIVER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

export const TT_DRIVER_STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  SUSPENDED: "destructive",
  TERMINATED: "secondary",
};

// ── Booking Status Labels & Variants ──

export const TT_BOOKING_STATUS_LABELS: Record<string, string> = {
  QUOTE: "Quote",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const TT_BOOKING_STATUS_VARIANTS: Record<string, string> = {
  QUOTE: "secondary",
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

// ── Assignment Status Labels ──

export const TT_ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// ── Price Type Labels ──

export const TT_PRICE_TYPE_LABELS: Record<string, string> = {
  PER_VEHICLE: "Per Vehicle",
  PER_PERSON: "Per Person",
  PER_ZONE: "Per Zone",
  FLAT_RATE: "Flat Rate",
};

// ── Compliance Type Labels ──

export const TT_COMPLIANCE_TYPE_LABELS: Record<string, string> = {
  INSURANCE: "Insurance",
  REGISTRATION: "Registration",
  INSPECTION: "Inspection",
  PERMIT: "Permit",
  OTHER: "Other",
};

// ── Operational Cost Type Labels ──

export const TT_COST_TYPE_LABELS: Record<string, string> = {
  DRIVER_FEE: "Driver Fee",
  REP_FEE: "Rep Fee",
  SUPPLIER_COST: "Supplier Cost",
  FUEL: "Fuel",
  TOLL: "Toll",
  OTHER: "Other",
};
