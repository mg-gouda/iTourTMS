import type {
  CruiseOwnershipMode,
  CruiseBoatClass,
  CruiseStarRating,
  CruiseDeckLevel,
  CabinView,
  CabinBedType,
  CruiseTypeCode,
  CruisePortOfCall,
  CruiseContractStatus,
  CruiseRateBasis,
  CruiseAllocationBasis,
  CruiseSupplementType,
  CruiseOfferType,
  CruiseGalaMealType,
  CruiseDepartureStatus,
  CruiseBookingStatus,
  CruiseBookingSource,
  CruiseBillingType,
  CabinAssignmentStatus,
  CruisePaxType,
  ManifestStatus,
  CruiseStopSaleScope,
  CruiseCancellationChargeType,
  CruiseSpecialRequestType,
  CruiseSpecialRequestStatus,
} from "@prisma/client";

// ── Ownership Mode ──

export const CRUISE_OWNERSHIP_MODE_LABELS: Record<CruiseOwnershipMode, string> = {
  OWN_FLEET: "Own Fleet",
  CONTRACTED: "Contracted",
};

export const CRUISE_OWNERSHIP_MODE_VARIANTS: Record<CruiseOwnershipMode, "default" | "secondary" | "outline"> = {
  OWN_FLEET: "default",
  CONTRACTED: "secondary",
};

// ── Boat Class ──

export const CRUISE_BOAT_CLASS_LABELS: Record<CruiseBoatClass, string> = {
  STEAMER: "Cruise Ship",
  DAHABIYA: "Dahabiya",
  LAKE_CRUISER: "Lake Cruiser",
  LONG_NILE_CRUISER: "Long Nile Cruiser",
};

// ── Star Rating ──

export const CRUISE_STAR_RATING_LABELS: Record<CruiseStarRating, string> = {
  THREE: "3 Stars",
  FOUR: "4 Stars",
  FIVE: "5 Stars",
  FIVE_DELUXE: "5 Stars Deluxe",
};

// ── Deck Level ──

export const CRUISE_DECK_LEVEL_LABELS: Record<CruiseDeckLevel, string> = {
  LOWER_DECK: "Lower Deck",
  MAIN_DECK: "Main Deck",
  UPPER_DECK: "Upper Deck",
  SUN_DECK: "Sun Deck",
};

// ── Cabin View ──

export const CABIN_VIEW_LABELS: Record<CabinView, string> = {
  NILE_VIEW: "Nile View",
  CITY_VIEW: "City View",
  INSIDE: "Inside",
  PANORAMIC: "Panoramic",
};

// ── Bed Type ──

export const CABIN_BED_TYPE_LABELS: Record<CabinBedType, string> = {
  TWIN: "Twin",
  DOUBLE: "Double",
  TWIN_OR_DOUBLE: "Twin or Double",
  KING: "King",
  SUITE_CONFIG: "Suite Configuration",
};

// ── Cruise Type Code ──

export const CRUISE_TYPE_CODE_LABELS: Record<CruiseTypeCode, string> = {
  NILE_3N_LUX_ASW: "3 Nights Luxor → Aswan",
  NILE_4N_ASW_LUX: "4 Nights Aswan → Luxor",
  NILE_7N_ROUNDTRIP: "7 Nights Round Trip",
  LONG_NILE_CAIRO_ASW: "Long Nile Cairo → Aswan",
  LAKE_NASSER: "Lake Nasser",
  DAHABIYA_CUSTOM: "Dahabiya Custom",
  OTHER: "Other",
};

// ── Port of Call ──

export const CRUISE_PORT_LABELS: Record<CruisePortOfCall, string> = {
  LUXOR: "Luxor",
  ASWAN: "Aswan",
  ESNA: "Esna",
  EDFU: "Edfu",
  KOM_OMBO: "Kom Ombo",
  ABU_SIMBEL: "Abu Simbel",
  CAIRO: "Cairo",
  EL_MINYA: "El Minya",
  ASYUT: "Asyut",
  SOHAG: "Sohag",
  QENA: "Qena",
  DENDERA: "Dendera",
  ABYDOS: "Abydos",
  WADI_EL_SEBOUA: "Wadi El-Seboua",
  AMADA: "Amada",
  KASR_IBRIM: "Kasr Ibrim",
  OTHER: "Other",
};

// ── Contract Status ──

export const CRUISE_CONTRACT_STATUS_LABELS: Record<CruiseContractStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  PUBLISHED: "Published",
};

export const CRUISE_CONTRACT_STATUS_VARIANTS: Record<
  CruiseContractStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  POSTED: "secondary",
  PUBLISHED: "default",
};

// ── Rate Basis ──

export const CRUISE_RATE_BASIS_LABELS: Record<CruiseRateBasis, string> = {
  PER_PERSON: "Per Person",
  PER_CABIN: "Per Cabin",
};

// ── Allocation Basis ──

export const CRUISE_ALLOCATION_BASIS_LABELS: Record<CruiseAllocationBasis, string> = {
  FREESALE: "Free Sale",
  ON_REQUEST: "On Request",
  COMMITMENT: "Commitment",
  ALLOCATION: "Allocation",
};

// ── Supplement Type ──

export const CRUISE_SUPPLEMENT_TYPE_LABELS: Record<CruiseSupplementType, string> = {
  CABIN_CATEGORY: "Cabin Category",
  OCCUPANCY: "Occupancy",
  DECK: "Deck",
  VIEW: "View",
  GALA_MEAL: "Gala Meal",
};

// ── Offer Type ──

export const CRUISE_OFFER_TYPE_LABELS: Record<CruiseOfferType, string> = {
  EARLY_BIRD: "Early Bird",
  LONG_STAY: "Long Stay",
  FREE_NIGHTS: "Free Nights",
  HONEYMOON: "Honeymoon",
  GROUP_DISCOUNT: "Group Discount",
  SINGLE_SUPPLEMENT_WAIVER: "SGL Supplement Waiver",
  FREE_DOMESTIC_FLIGHT: "Free Domestic Flight",
  MARKETING_CONTRIBUTION: "Marketing Contribution",
  COMBINABLE_DISCOUNT: "Combinable Discount",
};

// ── Gala Meal Type ──

export const CRUISE_GALA_MEAL_TYPE_LABELS: Record<CruiseGalaMealType, string> = {
  NEW_YEARS_EVE: "New Year's Eve",
  CHRISTMAS_EVE: "Christmas Eve",
  CHRISTMAS_DAY: "Christmas Day",
  EASTER_SUNDAY: "Easter Sunday",
  RAMADAN_IFTAR: "Ramadan Iftar",
  OTHER: "Other",
};

// ── Departure Status ──

export const CRUISE_DEPARTURE_STATUS_LABELS: Record<CruiseDepartureStatus, string> = {
  SCHEDULED: "Scheduled",
  OPEN_FOR_SALE: "Open for Sale",
  CLOSED_FOR_SALE: "Closed for Sale",
  EMBARKING: "Embarking",
  SAILING: "Sailing",
  DISEMBARKED: "Disembarked",
  CANCELLED: "Cancelled",
};

export const CRUISE_DEPARTURE_STATUS_VARIANTS: Record<
  CruiseDepartureStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SCHEDULED: "outline",
  OPEN_FOR_SALE: "default",
  CLOSED_FOR_SALE: "secondary",
  EMBARKING: "default",
  SAILING: "default",
  DISEMBARKED: "secondary",
  CANCELLED: "destructive",
};

// ── Booking Status ──

export const CRUISE_BOOKING_STATUS_LABELS: Record<CruiseBookingStatus, string> = {
  DRAFT: "Draft",
  OPTION: "Option",
  ON_REQUEST: "On Request",
  CONFIRMED: "Confirmed",
  EMBARKED: "Embarked",
  DISEMBARKED: "Disembarked",
  FINALIZED: "Finalized",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const CRUISE_BOOKING_STATUS_VARIANTS: Record<
  CruiseBookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  OPTION: "secondary",
  ON_REQUEST: "secondary",
  CONFIRMED: "default",
  EMBARKED: "default",
  DISEMBARKED: "secondary",
  FINALIZED: "default",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

// ── Booking Source ──

export const CRUISE_BOOKING_SOURCE_LABELS: Record<CruiseBookingSource, string> = {
  DIRECT: "Direct",
  CRM: "CRM",
  TOUR_OPS: "Tour Operations",
  B2C_WEBSITE: "B2C Website",
  B2B_PORTAL: "B2B Portal",
  TOUR_OPERATOR: "Tour Operator",
};

// ── Billing Type ──

export const CRUISE_BILLING_TYPE_LABELS: Record<CruiseBillingType, string> = {
  GUEST_DIRECT: "Guest Direct",
  TOUR_OPERATOR: "Tour Operator",
  TRAVEL_AGENT: "Travel Agent",
};

// ── Cabin Assignment Status ──

export const CABIN_ASSIGNMENT_STATUS_LABELS: Record<CabinAssignmentStatus, string> = {
  UNASSIGNED: "Unassigned",
  PROVISIONAL: "Provisional",
  CONFIRMED: "Confirmed",
  LOCKED: "Locked",
};

export const CABIN_ASSIGNMENT_STATUS_VARIANTS: Record<
  CabinAssignmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  UNASSIGNED: "outline",
  PROVISIONAL: "secondary",
  CONFIRMED: "default",
  LOCKED: "secondary",
};

// ── Pax Type ──

export const CRUISE_PAX_TYPE_LABELS: Record<CruisePaxType, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
  TEEN: "Teen",
};

// ── Manifest Status ──

export const MANIFEST_STATUS_LABELS: Record<ManifestStatus, string> = {
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  AMENDED: "Amended",
};

export const MANIFEST_STATUS_VARIANTS: Record<ManifestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  SUBMITTED: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
  AMENDED: "secondary",
};

// ── Stop Sale Scope ──

export const CRUISE_STOP_SALE_SCOPE_LABELS: Record<CruiseStopSaleScope, string> = {
  ALL: "All",
  CABIN_CATEGORY: "Cabin Category",
  DEPARTURE: "Departure",
  MARKET: "Market",
};

// ── Cancellation Charge Type ──

export const CRUISE_CANCELLATION_CHARGE_TYPE_LABELS: Record<CruiseCancellationChargeType, string> = {
  PERCENTAGE: "Percentage",
  FIXED: "Fixed Amount",
  FIRST_NIGHT: "First Night",
  FULL_AMOUNT: "Full Amount",
};

// ── Special Request Type ──

export const CRUISE_SPECIAL_REQUEST_TYPE_LABELS: Record<CruiseSpecialRequestType, string> = {
  DIETARY: "Dietary",
  ACCESSIBILITY: "Accessibility",
  BED_CONFIG: "Bed Configuration",
  CELEBRATION: "Celebration",
  ADJACENT_CABINS: "Adjacent Cabins",
  CONNECTING_CABINS: "Connecting Cabins",
  HIGH_DECK: "High Deck",
  LOW_DECK: "Low Deck",
  EARLY_CHECK_IN: "Early Check-In",
  LATE_CHECK_OUT: "Late Check-Out",
  PORTERAGE: "Porterage",
  TRANSPORT: "Transport",
  GUIDE_LANGUAGE: "Guide Language",
  OTHER: "Other",
};

// ── Special Request Status ──

export const CRUISE_SPECIAL_REQUEST_STATUS_LABELS: Record<CruiseSpecialRequestStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  FULFILLED: "Fulfilled",
};

export const CRUISE_SPECIAL_REQUEST_STATUS_VARIANTS: Record<
  CruiseSpecialRequestStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  CONFIRMED: "default",
  DECLINED: "destructive",
  FULFILLED: "secondary",
};
