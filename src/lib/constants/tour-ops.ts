import type {
  OpsFileStatus,
  OpsComponentType,
  OpsQuotationStatus,
  OpsClientType,
  OpsMarkupType,
  OpsVehicleType,
  OpsGuideType,
  OpsMealType,
} from "@prisma/client";

export const OPS_FILE_STATUS_LABELS: Record<OpsFileStatus, string> = {
  DRAFT: "Draft",
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const OPS_FILE_STATUS_VARIANTS: Record<OpsFileStatus, string> = {
  DRAFT: "secondary",
  QUOTED: "outline",
  CONFIRMED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export const OPS_QUOTATION_STATUS_LABELS: Record<OpsQuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export const OPS_QUOTATION_STATUS_VARIANTS: Record<OpsQuotationStatus, string> = {
  DRAFT: "secondary",
  SENT: "outline",
  ACCEPTED: "success",
  REJECTED: "destructive",
  EXPIRED: "secondary",
};

export const OPS_CLIENT_TYPE_LABELS: Record<OpsClientType, string> = {
  B2C: "Direct Guest",
  TOUR_OPERATOR: "Tour Operator",
  TRAVEL_AGENT: "Travel Agent",
};

export const OPS_COMPONENT_TYPE_LABELS: Record<OpsComponentType, string> = {
  ACCOMMODATION: "Accommodation",
  TRANSFER: "Transfer",
  EXCURSION: "Excursion",
  FLIGHT: "Flight Ticket",
  MEET_ASSIST: "Meet & Assist",
  NILE_CRUISE: "Nile Cruise",
  GUIDANCE: "Tour Guidance",
  MEAL: "Meal",
  PORTERAGE: "Porterage",
  TIPPING: "Tipping",
  FELUCCA: "Felucca",
  CARRIAGE: "Carriage",
  MISC: "Miscellaneous",
};

export const OPS_COMPONENT_TYPE_ICONS: Record<OpsComponentType, string> = {
  ACCOMMODATION: "Hotel",
  TRANSFER: "Car",
  EXCURSION: "Map",
  FLIGHT: "Plane",
  MEET_ASSIST: "HandshakeIcon",
  NILE_CRUISE: "Ship",
  GUIDANCE: "UserCheck",
  MEAL: "UtensilsCrossed",
  PORTERAGE: "Package",
  TIPPING: "Coins",
  FELUCCA: "Sailboat",
  CARRIAGE: "CarFront",
  MISC: "MoreHorizontal",
};

export const OPS_MARKUP_TYPE_LABELS: Record<OpsMarkupType, string> = {
  PERCENTAGE: "Percentage (%)",
  FIXED: "Fixed Amount",
};

export const OPS_FILE_STATUS_TRANSITIONS: Record<OpsFileStatus, OpsFileStatus[]> = {
  DRAFT: ["QUOTED", "CANCELLED"],
  QUOTED: ["CONFIRMED", "DRAFT", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["DRAFT"],
};

// ── Master Data Labels ──

export const OPS_VEHICLE_TYPE_LABELS: Record<OpsVehicleType, string> = {
  SEDAN: "Sedan",
  VAN_11: "Van (1×11)",
  VAN_16: "Van (1×16)",
  BUS_25: "Bus (1×25)",
  BUS_45: "Coach (1×45)",
};

export const OPS_VEHICLE_TYPE_CAPACITY: Record<OpsVehicleType, number> = {
  SEDAN: 3,
  VAN_11: 11,
  VAN_16: 16,
  BUS_25: 25,
  BUS_45: 45,
};

export const OPS_GUIDE_TYPE_LABELS: Record<OpsGuideType, string> = {
  LOCAL_GUIDE: "Local Guide",
  TOUR_MANAGER: "Tour Manager",
  EGYPTOLOGIST: "Egyptologist",
  REP: "Rep / Escort",
};

export const OPS_MEAL_TYPE_LABELS: Record<OpsMealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  HALF_BOARD: "Half Board",
  FULL_BOARD: "Full Board",
};

export const OPS_DESTINATION_CODES = [
  { code: "CAI", label: "Cairo (CAI)" },
  { code: "HRG", label: "Hurghada (HRG)" },
  { code: "LXR", label: "Luxor (LXR)" },
  { code: "ASW", label: "Aswan (ASW)" },
  { code: "RMF", label: "Marsa Alam (RMF)" },
  { code: "SSH", label: "Sharm El Sheikh (SSH)" },
] as const;
