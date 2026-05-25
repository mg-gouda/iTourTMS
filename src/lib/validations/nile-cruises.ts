import { z } from "zod";

// ── Boat ──

export const cruiseBoatCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  ownershipMode: z.enum(["OWN_FLEET", "CONTRACTED"]),
  boatClass: z.enum(["STEAMER", "DAHABIYA", "LAKE_CRUISER", "LONG_NILE_CRUISER"]),
  starRating: z.enum(["THREE", "FOUR", "FIVE", "FIVE_DELUXE"]),
  operatorPartnerId: z.string().optional(),
  yearBuilt: z.number().int().optional(),
  yearRenovated: z.number().int().optional(),
  totalCabins: z.number().int().min(1),
  totalDecks: z.number().int().min(1),
  maxPax: z.number().int().min(1),
  lengthMeters: z.number().optional(),
  beamMeters: z.number().optional(),
  cruisingSpeedKnots: z.number().optional(),
  hasPool: z.boolean().default(false),
  hasSpa: z.boolean().default(false),
  hasGym: z.boolean().default(false),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  homePortCode: z.enum(["LUXOR","ASWAN","ESNA","EDFU","KOM_OMBO","ABU_SIMBEL","CAIRO","EL_MINYA","ASYUT","SOHAG","QENA","DENDERA","ABYDOS","WADI_EL_SEBOUA","AMADA","KASR_IBRIM","OTHER"]).default("LUXOR"),
  active: z.boolean().default(true),
});

export const cruiseBoatUpdateSchema = cruiseBoatCreateSchema.partial();

export type CruiseBoatCreateInput = z.infer<typeof cruiseBoatCreateSchema>;
export type CruiseBoatUpdateInput = z.infer<typeof cruiseBoatUpdateSchema>;

// ── Deck ──

export const cruiseDeckCreateSchema = z.object({
  boatId: z.string().min(1),
  level: z.enum(["LOWER_DECK", "MAIN_DECK", "UPPER_DECK", "SUN_DECK"]),
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
  planLayout: z.any().optional(),
});

export const cruiseDeckUpdateSchema = cruiseDeckCreateSchema.omit({ boatId: true }).partial();

// ── Cabin Category ──

export const cruiseCabinCategoryCreateSchema = z.object({
  boatId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  bedConfiguration: z.string().optional(),
  minOccupancy: z.number().int().min(1).default(1),
  baseOccupancy: z.number().int().min(1).default(2),
  maxAdults: z.number().int().min(1).default(2),
  maxChildren: z.number().int().min(0).default(1),
  maxInfants: z.number().int().min(0).default(1),
  maxOccupancy: z.number().int().min(1).default(2),
  extraBedAvailable: z.boolean().default(false),
  maxExtraBeds: z.number().int().min(0).default(0),
  sizeM2: z.number().optional(),
  hasBalcony: z.boolean().default(false),
  hasBathtub: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const cruiseCabinCategoryUpdateSchema = cruiseCabinCategoryCreateSchema.omit({ boatId: true }).partial();

// ── Cabin ──

const portOfCallEnum = z.enum(["LUXOR","ASWAN","ESNA","EDFU","KOM_OMBO","ABU_SIMBEL","CAIRO","EL_MINYA","ASYUT","SOHAG","QENA","DENDERA","ABYDOS","WADI_EL_SEBOUA","AMADA","KASR_IBRIM","OTHER"]);

export const cruiseCabinCreateSchema = z.object({
  boatId: z.string().min(1),
  deckId: z.string().min(1),
  categoryId: z.string().min(1),
  cabinNumber: z.string().min(1),
  view: z.enum(["NILE_VIEW", "CITY_VIEW", "INSIDE", "PANORAMIC"]),
  bedType: z.enum(["TWIN", "DOUBLE", "TWIN_OR_DOUBLE", "KING", "SUITE_CONFIG"]),
  isAccessible: z.boolean().default(false),
  isConnecting: z.boolean().default(false),
  connectingTo: z.string().optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

export const cruiseCabinUpdateSchema = cruiseCabinCreateSchema.omit({ boatId: true }).partial();

// ── Cruise Type ──

export const cruiseTypeCreateSchema = z.object({
  code: z.enum(["NILE_3N_LUX_ASW","NILE_4N_ASW_LUX","NILE_7N_ROUNDTRIP","LONG_NILE_CAIRO_ASW","LAKE_NASSER","DAHABIYA_CUSTOM","OTHER"]),
  name: z.string().min(1),
  durationNights: z.number().int().min(1),
  itineraryMode: z.enum(["FIXED", "VARIABLE"]),
  embarkPort: portOfCallEnum,
  disembarkPort: portOfCallEnum,
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const cruiseTypeUpdateSchema = cruiseTypeCreateSchema.partial();

// ── Itinerary ──

export const cruiseItineraryCreateSchema = z.object({
  boatId: z.string().optional(),
  cruiseTypeId: z.string().min(1),
  departureId: z.string().optional(),
  mode: z.enum(["FIXED", "VARIABLE"]),
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const cruiseItineraryUpdateSchema = cruiseItineraryCreateSchema.partial();

export const cruiseItineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  portOfCall: portOfCallEnum,
  arrivalTime: z.string().optional(),
  departureTime: z.string().optional(),
  sailingTime: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  meals: z.string().optional(),
  includesBreakfast: z.boolean().default(true),
  includesLunch: z.boolean().default(true),
  includesDinner: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const cruiseSaveDaysSchema = z.object({
  itineraryId: z.string().min(1),
  days: z.array(cruiseItineraryDaySchema),
});

// ── Cancellation Policy ──

export const cruiseCancellationPolicyCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  freeCancellationDays: z.number().int().optional(),
});

export const cruiseCancellationPolicyUpdateSchema = cruiseCancellationPolicyCreateSchema.partial();

export const cruiseCancellationPolicyTierSchema = z.object({
  daysBefore: z.number().int().min(0),
  chargeType: z.enum(["PERCENTAGE", "FIXED", "FIRST_NIGHT", "FULL_AMOUNT"]),
  chargeValue: z.number().min(0),
  sortOrder: z.number().int().default(0),
});

export const cruiseSaveTiersSchema = z.object({
  policyId: z.string().min(1),
  tiers: z.array(cruiseCancellationPolicyTierSchema),
});

// ── Contract ──

export const cruiseContractCreateSchema = z.object({
  name: z.string().min(1),
  boatId: z.string().min(1),
  ownershipMode: z.enum(["OWN_FLEET", "CONTRACTED"]),
  validFrom: z.string().or(z.date()),
  validTo: z.string().or(z.date()),
  rateBasis: z.enum(["PER_PERSON", "PER_CABIN"]).default("PER_PERSON"),
  allocationBasis: z.enum(["FREESALE","ON_REQUEST","COMMITMENT","ALLOCATION"]).default("ALLOCATION"),
  defaultReleaseDays: z.number().int().default(7),
  includesFullBoard: z.boolean().default(true),
  includesSightseeing: z.boolean().default(true),
  includesSoftDrinks: z.boolean().default(false),
  includesVisitFees: z.boolean().default(false),
  includesTransfers: z.boolean().default(false),
  includesDomesticFlight: z.boolean().default(false),
  flightRouting: z.string().optional(),
  baseCurrency: z.string().default("USD"),
  cancellationPolicyId: z.string().optional(),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
  isTemplate: z.boolean().default(false),
  parentContractId: z.string().optional(),
});

export const cruiseContractUpdateSchema = cruiseContractCreateSchema.partial();

export type CruiseContractCreateInput = z.infer<typeof cruiseContractCreateSchema>;

// ── Season ──

export const cruiseSeasonCreateSchema = z.object({
  contractId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  dateFrom: z.string().or(z.date()),
  dateTo: z.string().or(z.date()),
  releaseDays: z.number().int().optional(),
  sortOrder: z.number().int().default(0),
});

export const cruiseSeasonUpdateSchema = cruiseSeasonCreateSchema.omit({ contractId: true }).partial();

// ── Base Rate ──

export const cruiseBaseRateItemSchema = z.object({
  seasonId: z.string().min(1),
  cabinCategoryId: z.string().min(1),
  ratePerPaxPerNight: z.number().min(0),
  currency: z.string().default("USD"),
  marketId: z.string().optional(),
  notes: z.string().optional(),
});

export const cruiseBulkSaveBaseRatesSchema = z.object({
  contractId: z.string().min(1),
  rates: z.array(cruiseBaseRateItemSchema),
});

// ── Supplement ──

export const cruiseSupplementItemSchema = z.object({
  seasonId: z.string().min(1),
  type: z.enum(["CABIN_CATEGORY","OCCUPANCY","DECK","VIEW","GALA_MEAL"]),
  cabinCategoryId: z.string().optional(),
  deckLevel: z.enum(["LOWER_DECK","MAIN_DECK","UPPER_DECK","SUN_DECK"]).optional(),
  view: z.enum(["NILE_VIEW","CITY_VIEW","INSIDE","PANORAMIC"]).optional(),
  childAgeCategory: z.enum(["INFANT","CHILD","TEEN"]).optional(),
  occupancyKey: z.string().optional(),
  valueType: z.enum(["FIXED","PERCENTAGE"]),
  value: z.number(),
  perPaxPerNight: z.boolean().default(true),
  marketId: z.string().optional(),
});

export const cruiseBulkSaveSupplementsSchema = z.object({
  contractId: z.string().min(1),
  type: z.enum(["CABIN_CATEGORY","OCCUPANCY","DECK","VIEW","GALA_MEAL"]),
  supplements: z.array(cruiseSupplementItemSchema),
});

// ── Child Policy ──

export const cruiseChildPolicySchema = z.object({
  category: z.enum(["INFANT","CHILD","TEEN"]),
  ageFrom: z.number().int().min(0),
  ageTo: z.number().int().max(17),
  bedding: z.enum(["SHARING_WITH_PARENTS","EXTRA_BED","OWN_BED"]),
  isFree: z.boolean().default(false),
  discountPercent: z.number().min(0).max(100).optional(),
  fixedRate: z.number().min(0).optional(),
  maxFreeChildren: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
});

export const cruiseSaveChildPoliciesSchema = z.object({
  contractId: z.string().min(1),
  policies: z.array(cruiseChildPolicySchema),
});

// ── Special Offer ──

export const cruiseOfferCreateSchema = z.object({
  contractId: z.string().min(1),
  type: z.enum(["EARLY_BIRD","LONG_STAY","FREE_NIGHTS","HONEYMOON","GROUP_DISCOUNT","SINGLE_SUPPLEMENT_WAIVER","FREE_DOMESTIC_FLIGHT","MARKETING_CONTRIBUTION","COMBINABLE_DISCOUNT"]),
  name: z.string().min(1),
  description: z.string().optional(),
  valueType: z.enum(["PERCENTAGE","FIXED_AMOUNT","FREE_NIGHTS","UPGRADE","COMPLIMENTARY"]),
  value: z.number().optional(),
  freeNightsPay: z.number().int().optional(),
  freeNightsGet: z.number().int().optional(),
  bookingFromDate: z.string().optional(),
  bookingToDate: z.string().optional(),
  travelFromDate: z.string().optional(),
  travelToDate: z.string().optional(),
  daysBeforeDeparture: z.number().int().optional(),
  minNights: z.number().int().optional(),
  minPax: z.number().int().optional(),
  applicableCabinCategoryIds: z.array(z.string()).default([]),
  applicableMarketIds: z.array(z.string()).default([]),
  isCombinable: z.boolean().default(false),
  notCombinableWith: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const cruiseOfferUpdateSchema = cruiseOfferCreateSchema.omit({ contractId: true }).partial();

// ── Gala Meal ──

export const cruiseGalaMealCreateSchema = z.object({
  contractId: z.string().min(1),
  type: z.enum(["NEW_YEARS_EVE","CHRISTMAS_EVE","CHRISTMAS_DAY","EASTER_SUNDAY","RAMADAN_IFTAR","OTHER"]),
  applicableDate: z.string().or(z.date()),
  pricePerPax: z.number().min(0),
  childPricePerPax: z.number().min(0).optional(),
  isMandatory: z.boolean().default(true),
  currency: z.string(),
  notes: z.string().optional(),
});

export const cruiseGalaMealUpdateSchema = cruiseGalaMealCreateSchema.omit({ contractId: true }).partial();

// ── Stop Sale ──

export const cruiseStopSaleCreateSchema = z.object({
  contractId: z.string().optional(),
  boatId: z.string().optional(),
  departureId: z.string().optional(),
  scope: z.enum(["ALL","CABIN_CATEGORY","DEPARTURE","MARKET"]),
  cabinCategoryId: z.string().optional(),
  marketId: z.string().optional(),
  fromDate: z.string().or(z.date()),
  toDate: z.string().or(z.date()),
  reason: z.string().min(1),
});

// ── Departure ──

export const cruiseDepartureCreateSchema = z.object({
  boatId: z.string().min(1),
  cruiseTypeId: z.string().min(1),
  contractId: z.string().optional(),
  embarkDate: z.string().or(z.date()),
  disembarkDate: z.string().or(z.date()),
  embarkPort: portOfCallEnum,
  disembarkPort: portOfCallEnum,
  cutoffDate: z.string().optional(),
  notes: z.string().optional(),
  totalCabins: z.number().int().min(1),
  totalPaxCapacity: z.number().int().min(1),
});

export const cruiseDepartureUpdateSchema = cruiseDepartureCreateSchema.partial();

export const cruiseDeparturePatternCreateSchema = z.object({
  boatId: z.string().min(1),
  cruiseTypeId: z.string().min(1),
  pattern: z.enum(["NONE","WEEKLY","BI_WEEKLY","CUSTOM_DAYS_OF_WEEK"]),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).default([]),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  embarkPort: portOfCallEnum,
  disembarkPort: portOfCallEnum,
  contractId: z.string().optional(),
});

// ── Allotment ──

export const cruiseAllotmentItemSchema = z.object({
  contractId: z.string().min(1),
  departureId: z.string().optional(),
  seasonId: z.string().optional(),
  cabinCategoryId: z.string().min(1),
  allocationBasis: z.enum(["FREESALE","ON_REQUEST","COMMITMENT","ALLOCATION"]),
  totalCabins: z.number().int().min(0),
  releaseDate: z.string().optional(),
  isFreesale: z.boolean().default(false),
  notes: z.string().optional(),
});

export const cruiseBulkSaveAllotmentsSchema = z.object({
  items: z.array(cruiseAllotmentItemSchema),
});

// ── Booking ──

export const cruiseBookingCreateSchema = z.object({
  departureId: z.string().min(1),
  contractId: z.string().min(1),
  marketId: z.string().optional(),
  source: z.enum(["DIRECT","CRM","TOUR_OPS","B2C_WEBSITE","B2B_PORTAL","TOUR_OPERATOR"]).default("DIRECT"),
  billingType: z.enum(["GUEST_DIRECT","TOUR_OPERATOR","TRAVEL_AGENT"]).default("GUEST_DIRECT"),
  adults: z.number().int().min(1).default(2),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  cabinCount: z.number().int().min(1).default(1),
  customerId: z.string().optional(),
  leadGuestName: z.string().min(1),
  leadGuestEmail: z.string().email().optional(),
  leadGuestPhone: z.string().optional(),
  leadGuestNationalityId: z.string().optional(),
  tourOperatorId: z.string().optional(),
  baseCurrency: z.string().default("USD"),
  netTotal: z.number().min(0),
  markup: z.number().min(0).default(0),
  discounts: z.number().min(0).default(0),
  galaSupplement: z.number().min(0).default(0),
  grossTotal: z.number().min(0),
  balanceDue: z.number().min(0),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  opsFileId: z.string().optional(),
});

export const cruiseBookingUpdateSchema = cruiseBookingCreateSchema.partial();

export type CruiseBookingCreateInput = z.infer<typeof cruiseBookingCreateSchema>;

// ── Booking Cabin Line ──

export const cruiseBookingCabinLineSchema = z.object({
  cabinCategoryId: z.string().min(1),
  occupancy: z.number().int().min(1).max(3),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  childAges: z.array(z.number().int()).default([]),
  ratePerPaxPerNight: z.number().min(0),
  nights: z.number().int().min(1),
  sglSupplement: z.number().min(0).optional(),
  childDiscounts: z.number().min(0).optional(),
  deckPreference: z.enum(["LOWER_DECK","MAIN_DECK","UPPER_DECK","SUN_DECK"]).optional(),
  viewPreference: z.enum(["NILE_VIEW","CITY_VIEW","INSIDE","PANORAMIC"]).optional(),
  lineTotal: z.number().min(0),
  sortOrder: z.number().int().default(0),
});

// ── Passenger ──

export const cruisePassengerSchema = z.object({
  bookingId: z.string().min(1),
  cabinLineId: z.string().optional(),
  paxType: z.enum(["ADULT","CHILD","INFANT","TEEN"]),
  paxRole: z.enum(["LEAD","COMPANION","CHILD","INFANT"]).default("COMPANION"),
  titleId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  age: z.number().int().optional(),
  gender: z.string().optional(),
  nationalityId: z.string().optional(),
  passportNumber: z.string().optional(),
  passportIssueDate: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  passportIssueCountryId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dietary: z.string().optional(),
  medicalNotes: z.string().optional(),
  isLead: z.boolean().default(false),
});

export const cruiseBulkSavePassengersSchema = z.object({
  bookingId: z.string().min(1),
  passengers: z.array(cruisePassengerSchema.omit({ bookingId: true })),
});

// ── Special Request ──

export const cruiseSpecialRequestCreateSchema = z.object({
  bookingId: z.string().min(1),
  type: z.enum(["DIETARY","ACCESSIBILITY","BED_CONFIG","CELEBRATION","ADJACENT_CABINS","CONNECTING_CABINS","HIGH_DECK","LOW_DECK","EARLY_CHECK_IN","LATE_CHECK_OUT","PORTERAGE","TRANSPORT","GUIDE_LANGUAGE","OTHER"]),
  description: z.string().min(1),
});

export const cruiseSpecialRequestUpdateSchema = z.object({
  status: z.enum(["PENDING","CONFIRMED","DECLINED","FULFILLED"]).optional(),
  response: z.string().optional(),
});

// ── Payment ──

export const cruiseBookingPaymentCreateSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().min(0.01),
  currency: z.string(),
  paidAt: z.string().or(z.date()),
  method: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// ── Manifest ──

export const cruiseManifestUpdateSchema = z.object({
  status: z.enum(["PENDING","SUBMITTED","ACCEPTED","REJECTED","AMENDED"]).optional(),
  submissionMethod: z.enum(["ONLINE_PORTAL","EMAIL","PHYSICAL_DELIVERY","FAX"]).optional(),
  submissionRef: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// ── Child Policy ──

export const cruiseChildPolicyUpsertSchema = z.object({
  category: z.enum(["INFANT","CHILD","TEEN"]),
  ageFrom: z.number().int().min(0),
  ageTo: z.number().int().min(0),
  bedding: z.enum(["SHARING_WITH_PARENTS","EXTRA_BED","OWN_BED"]),
  isFree: z.boolean().default(false),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  fixedRate: z.number().min(0).optional().nullable(),
  maxFreeChildren: z.number().int().min(0).default(0),
  sortOrder: z.number().int().min(0).default(0),
});

export const cruiseChildPolicyBulkSaveSchema = z.object({
  contractId: z.string().min(1),
  policies: z.array(cruiseChildPolicyUpsertSchema),
});

// ── Embarkation Days ──

export const cruiseEmbarkDaySaveSchema = z.object({
  contractId: z.string().min(1),
  durationNights: z.number().int().min(1),
  days: z.array(z.number().int().min(1).max(7)),
});
