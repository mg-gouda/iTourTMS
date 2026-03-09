export const CRM_LEAD_SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
  PHONE: "Phone",
  EMAIL: "Email",
  SOCIAL_MEDIA: "Social Media",
  PARTNER: "Partner",
  EVENT: "Event",
  OTHER: "Other",
};

export const CRM_LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  DORMANT: "Dormant",
};

export const CRM_LEAD_STATUS_VARIANTS: Record<string, string> = {
  NEW: "default",
  CONTACTED: "info",
  QUALIFIED: "secondary",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "destructive",
  DORMANT: "outline",
};

export const CRM_OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  PROSPECTING: "Prospecting",
  QUALIFICATION: "Qualification",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export const CRM_OPPORTUNITY_STAGE_VARIANTS: Record<string, string> = {
  PROSPECTING: "default",
  QUALIFICATION: "info",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  CLOSED_WON: "success",
  CLOSED_LOST: "destructive",
};

export const CRM_PIPELINE_STAGE_ORDER = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

export const CRM_ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  TASK: "Task",
  FOLLOW_UP: "Follow-up",
};

export const CRM_PRODUCT_TYPE_LABELS: Record<string, string> = {
  ACTIVITY: "Activity",
  TOUR_PACKAGE: "Tour Package",
};

export const CRM_ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  WATER_SPORTS: "Water Sports",
  DESERT_SAFARI: "Desert Safari",
  CITY_TOUR: "City Tour",
  CULTURAL: "Cultural",
  ADVENTURE: "Adventure",
  DINING: "Dining",
  ENTERTAINMENT: "Entertainment",
  WELLNESS: "Wellness",
  SHOPPING: "Shopping",
  TRANSFER: "Transfer",
  OTHER: "Other",
};

export const CRM_TRIP_MODE_LABELS: Record<string, string> = {
  SHARED: "Shared",
  PRIVATE: "Private",
  VIP: "VIP",
};

export const CRM_NATIONALITY_TIER_LABELS: Record<string, string> = {
  DEFAULT: "Default",
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
};

export const CRM_AGE_GROUP_LABELS: Record<string, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
};

export const CRM_SEASON_TYPE_LABELS: Record<string, string> = {
  PEAK: "Peak",
  HIGH: "High",
  SHOULDER: "Shoulder",
  LOW: "Low",
  BLACKOUT: "Blackout",
};

export const CRM_COST_CALC_BASIS_LABELS: Record<string, string> = {
  PER_PERSON: "Per Person",
  PER_GROUP: "Per Group",
  FLAT: "Flat",
};

export const CRM_COST_COMPONENT_TYPE_LABELS: Record<string, string> = {
  TRANSPORT: "Transport",
  TICKETS: "Tickets",
  GUIDE_FEE: "Guide Fee",
  MEALS: "Meals",
  EQUIPMENT: "Equipment",
  INSURANCE: "Insurance",
  COMMISSION: "Commission",
  PERMIT: "Permit",
  MISCELLANEOUS: "Miscellaneous",
};

export const CRM_MARKUP_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: "Percentage (%)",
  FIXED: "Fixed Amount",
};

export const CRM_BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

export const CRM_BOOKING_STATUS_VARIANTS: Record<string, string> = {
  DRAFT: "secondary",
  CONFIRMED: "success",
  CANCELLED: "destructive",
  COMPLETED: "default",
  NO_SHOW: "warning",
};
