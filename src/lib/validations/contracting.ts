import { z } from "zod";

// ── Destination Schemas ──

export const destinationCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  countryId: z.string().min(1, "Country is required"),
  active: z.boolean().default(true),
});

export const destinationUpdateSchema = destinationCreateSchema.partial();

// ── City Schemas ──

export const cityCreateSchema = z.object({
  destinationId: z.string().min(1, "Destination is required"),
  name: z.string().min(1, "City name is required"),
  code: z.string().min(1, "Code is required").max(3),
  active: z.boolean().default(true),
});

export const cityUpdateSchema = z.object({
  name: z.string().min(1, "City name is required"),
  code: z.string().min(1, "Code is required").max(3),
  active: z.boolean(),
});

// ── Zone Schemas ──

export const zoneCreateSchema = z.object({
  cityId: z.string().min(1, "City is required"),
  name: z.string().min(1, "Zone name is required"),
  code: z.string().min(1, "Code is required").max(1),
  active: z.boolean().default(true),
});

export const zoneUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(1).optional(),
  active: z.boolean().optional(),
});

// ── Hotel Schemas ──

export const hotelCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
  starRating: z.enum(["ONE", "TWO", "THREE", "FOUR", "FIVE", "FIVE_DELUXE"]).default("THREE"),
  chainName: z.string().nullish(),
  description: z.string().nullish(),
  shortDescription: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().optional().default(""),
  cityId: z.string().nullish(),
  zoneId: z.string().nullish(),
  stateId: z.string().nullish(),
  countryId: z.string().min(1, "Country is required"),
  zipCode: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  destinationId: z.string().nullish(),
  phone: z.string().nullish(),
  fax: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  website: z.string().nullish(),
  reservationEmail: z.string().email().nullish().or(z.literal("")),
  contactPerson: z.string().nullish(),
  contactPhone: z.string().nullish(),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("12:00"),
  totalRooms: z.number().int().positive().nullish(),
  yearBuilt: z.number().int().nullish(),
  yearRenovated: z.number().int().nullish(),
  giataId: z.string().nullish(),
  active: z.boolean().default(true),
  amenityIds: z.array(z.string()).default([]),
});

export const hotelUpdateSchema = hotelCreateSchema.partial();

// ── Room Type Schemas ──

export const roomTypeCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
  description: z.string().nullish(),
  sortOrder: z.number().int().default(0),
  minAdults: z.number().int().min(1).default(1),
  standardAdults: z.number().int().min(1).default(2),
  maxAdults: z.number().int().min(1).default(2),
  maxChildren: z.number().int().min(0).default(1),
  maxInfants: z.number().int().min(0).default(1),
  maxOccupancy: z.number().int().min(1).default(3),
  extraBedAvailable: z.boolean().default(false),
  maxExtraBeds: z.number().int().min(0).default(0),
  roomSize: z.number().positive().nullish(),
  bedConfiguration: z.string().nullish(),
  active: z.boolean().default(true),
});

export const roomTypeUpdateSchema = roomTypeCreateSchema.partial().omit({ hotelId: true });

// ── Occupancy Schemas ──

export const occupancyCreateSchema = z.object({
  roomTypeId: z.string().min(1, "Room type is required"),
  adults: z.number().int().min(1, "At least 1 adult required"),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  extraBeds: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  description: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

// ── Child Policy Schemas ──

export const childPolicyCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  category: z.enum(["INFANT", "CHILD", "TEEN"]),
  ageFrom: z.number().int().min(0),
  ageTo: z.number().int().min(0),
  label: z.string().min(1, "Label is required"),
  freeInSharing: z.boolean().default(false),
  maxFreePerRoom: z.number().int().min(0).default(0),
  extraBedAllowed: z.boolean().default(true),
  mealsIncluded: z.boolean().default(false),
  notes: z.string().nullish(),
}).refine((d) => d.ageTo >= d.ageFrom, {
  message: "Age To must be greater than or equal to Age From",
  path: ["ageTo"],
});

// ── Meal Basis Schemas ──

export const mealBasisCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  mealCode: z.enum(["RO", "BB", "HB", "FB", "AI", "UAI", "SC"]),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullish(),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const mealBasisUpdateSchema = mealBasisCreateSchema.partial().omit({ hotelId: true, mealCode: true });

// ── Hotel Image Schemas ──

export const hotelImageCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  url: z.string().url("Valid URL is required"),
  caption: z.string().nullish(),
  sortOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
});

// ── Contract Schemas ──

export const contractCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(100),
  season: z.string().nullish(),
  hotelId: z.string().min(1, "Hotel is required"),
  marketIds: z.array(z.string()).default([]),
  validFrom: z.string().min(1, "Booking from is required"),
  validTo: z.string().min(1, "Booking to is required"),
  travelFrom: z.string().nullish(),
  travelTo: z.string().nullish(),
  rateBasis: z.enum(["PER_PERSON", "PER_ROOM"]),
  baseCurrencyId: z.string().min(1, "Currency is required"),
  baseRoomTypeId: z.string().min(1, "Base room type is required"),
  baseMealBasisId: z.string().min(1, "Base meal basis is required"),
  minimumStay: z.number().int().min(1).default(1),
  maximumStay: z.number().int().min(1).nullish(),
  terms: z.string().nullish(),
  internalNotes: z.string().nullish(),
  hotelNotes: z.string().nullish(),
}).refine((d) => d.validTo > d.validFrom, {
  message: "Booking To must be after Booking From",
  path: ["validTo"],
});

export const contractUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().min(1, "Code is required").max(100).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  travelFrom: z.string().nullish(),
  travelTo: z.string().nullish(),
  rateBasis: z.enum(["PER_PERSON", "PER_ROOM"]).optional(),
  baseCurrencyId: z.string().min(1).optional(),
  baseRoomTypeId: z.string().min(1).optional(),
  baseMealBasisId: z.string().min(1).optional(),
  minimumStay: z.number().int().min(1).optional(),
  maximumStay: z.number().int().min(1).nullish(),
  terms: z.string().nullish(),
  internalNotes: z.string().nullish(),
  hotelNotes: z.string().nullish(),
});

// ── Contract Season Schemas ──

export const contractSeasonCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  dateFrom: z.string().min(1, "Date from is required"),
  dateTo: z.string().min(1, "Date to is required"),
  sortOrder: z.number().int().default(0),
  releaseDays: z.number().int().min(0).default(21),
  minimumStay: z.number().int().min(1).nullish(),
}).refine((d) => d.dateTo >= d.dateFrom, {
  message: "Date To must be on or after Date From",
  path: ["dateTo"],
});

export const contractSeasonUpdateSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortOrder: z.number().int().optional(),
  releaseDays: z.number().int().min(0).optional(),
  minimumStay: z.number().int().min(1).nullish(),
});

// ── Contract Room Type Schemas ──

export const contractRoomTypeCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  roomTypeId: z.string().min(1, "Room type is required"),
  isBase: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

// ── Contract Meal Basis Schemas ──

export const contractMealBasisCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  mealBasisId: z.string().min(1, "Meal basis is required"),
  isBase: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

// ── Contract Base Rate Schemas ──

export const contractBaseRateSchema = z.object({
  seasonId: z.string().min(1, "Season is required"),
  rate: z.number().min(0, "Rate must be non-negative"),
  singleRate: z.number().min(0).nullish(),
  doubleRate: z.number().min(0).nullish(),
  tripleRate: z.number().min(0).nullish(),
});

export const contractBaseRateBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  rates: z.array(contractBaseRateSchema),
});

// ── Supplement Schemas ──

export const supplementRoomTypeBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    roomTypeId: z.string().min(1),
    value: z.number(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    perPerson: z.boolean().default(true),
    perNight: z.boolean().default(true),
  })),
});

export const supplementMealBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    mealBasisId: z.string().min(1),
    value: z.number(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    isReduction: z.boolean().default(false),
    perPerson: z.boolean().default(true),
    perNight: z.boolean().default(true),
  })),
});

export const supplementOccupancyBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    forAdults: z.number().int().min(1),
    value: z.number(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    isReduction: z.boolean().default(false),
    perNight: z.boolean().default(true),
  })),
});

export const supplementChildBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    childPosition: z.number().int().min(1),
    forChildCategory: z.enum(["INFANT", "CHILD", "TEEN"]).nullable(),
    value: z.number(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).default("PERCENTAGE"),
    perNight: z.boolean().default(true),
  })),
});

export const supplementExtraBedBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    value: z.number(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    perNight: z.boolean().default(true),
  })),
});

// ── Rate Calculator Schemas ──

export const rateCalculatorInputSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  seasonId: z.string().min(1, "Season is required"),
  roomTypeId: z.string().min(1, "Room type is required"),
  mealBasisId: z.string().min(1, "Meal basis is required"),
  adults: z.number().int().min(1).max(4).default(2),
  children: z.array(z.object({
    category: z.enum(["INFANT", "CHILD", "TEEN"]),
  })).default([]),
  extraBed: z.boolean().default(false),
  nights: z.number().int().min(1).default(1),
  bookingDate: z.string().nullish(),
  checkInDate: z.string().nullish(),
});

export const multiRoomRateCalculatorInputSchema = z.object({
  contractId: z.string().min(1),
  arrivalDate: z.string().min(1, "Arrival date is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  adults: z.number().int().min(1).max(6).default(2),
  childDobs: z.array(z.string()).max(4).default([]),
  mealBasisId: z.string().min(1, "Meal plan is required"),
  extraBed: z.boolean().default(false),
  bookingDate: z.string().nullish(),
}).refine(d => d.departureDate > d.arrivalDate, {
  message: "Departure must be after arrival", path: ["departureDate"],
});

export const rateSheetInputSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
});

// ── Special Offer Schemas ──

export const specialOfferCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  name: z.string().min(1, "Name is required"),
  offerType: z.enum(["EARLY_BIRD", "NORMAL_EBD", "LONG_STAY", "FREE_NIGHTS", "HONEYMOON", "GROUP_DISCOUNT"]),
  description: z.string().nullish(),
  validFrom: z.string().nullish(),
  validTo: z.string().nullish(),
  bookByDate: z.string().nullish(),
  minimumNights: z.number().int().min(1).nullish(),
  minimumRooms: z.number().int().min(1).nullish(),
  advanceBookDays: z.number().int().min(1).nullish(),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).default("PERCENTAGE"),
  discountValue: z.number().min(0, "Discount must be non-negative"),
  stayNights: z.number().int().min(2).nullish(),
  payNights: z.number().int().min(1).nullish(),
  bookFromDate: z.string().nullish(),
  stayDateType: z.enum(["COMPLETED", "ARRIVAL"]).nullish(),
  paymentPct: z.number().int().min(1).max(100).nullish(),
  paymentDeadline: z.string().nullish(),
  roomingListBy: z.string().nullish(),
  combinable: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).superRefine((data, ctx) => {
  if (data.offerType === "FREE_NIGHTS") {
    if (!data.stayNights) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stay nights is required for Free Nights offers", path: ["stayNights"] });
    }
    if (!data.payNights) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pay nights is required for Free Nights offers", path: ["payNights"] });
    }
    if (data.stayNights && data.payNights && data.payNights >= data.stayNights) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pay nights must be less than stay nights", path: ["payNights"] });
    }
  }
  if (data.offerType === "EARLY_BIRD" && !data.advanceBookDays) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Advance booking days is required for Early Bird offers", path: ["advanceBookDays"] });
  }
  if (data.offerType === "GROUP_DISCOUNT" && !data.minimumRooms) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum rooms is required for Group Discount offers", path: ["minimumRooms"] });
  }
  if (data.offerType === "LONG_STAY" && !data.minimumNights) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum nights is required for Long Stay offers", path: ["minimumNights"] });
  }
  if (data.offerType === "NORMAL_EBD") {
    if (!data.validFrom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stay From date is required for Normal EBD", path: ["validFrom"] });
    }
    if (!data.validTo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stay To date is required for Normal EBD", path: ["validTo"] });
    }
    if (!data.bookFromDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Booking From date is required for Normal EBD", path: ["bookFromDate"] });
    }
    if (!data.bookByDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Booking To date is required for Normal EBD", path: ["bookByDate"] });
    }
    if (!data.stayDateType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stay date type is required for Normal EBD", path: ["stayDateType"] });
    }
    if (!data.discountValue || data.discountValue <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Discount value must be greater than 0 for Normal EBD", path: ["discountValue"] });
    }
  }
});

export const specialOfferUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  offerType: z.enum(["EARLY_BIRD", "NORMAL_EBD", "LONG_STAY", "FREE_NIGHTS", "HONEYMOON", "GROUP_DISCOUNT"]).optional(),
  description: z.string().nullish(),
  validFrom: z.string().nullish(),
  validTo: z.string().nullish(),
  bookByDate: z.string().nullish(),
  minimumNights: z.number().int().min(1).nullish(),
  minimumRooms: z.number().int().min(1).nullish(),
  advanceBookDays: z.number().int().min(1).nullish(),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  discountValue: z.number().min(0).optional(),
  stayNights: z.number().int().min(2).nullish(),
  payNights: z.number().int().min(1).nullish(),
  bookFromDate: z.string().nullish(),
  stayDateType: z.enum(["COMPLETED", "ARRIVAL"]).nullish(),
  paymentPct: z.number().int().min(1).max(100).nullish(),
  paymentDeadline: z.string().nullish(),
  roomingListBy: z.string().nullish(),
  combinable: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ── Offer Tier Schemas ──

export const offerTierSaveSchema = z.object({
  offerId: z.string().min(1),
  tiers: z.array(z.object({
    id: z.string().nullish(),
    thresholdValue: z.number().int().min(1, "Threshold must be at least 1"),
    discountType: z.enum(["FIXED", "PERCENTAGE"]).default("PERCENTAGE"),
    discountValue: z.number().min(0, "Discount must be non-negative"),
    sortOrder: z.number().int().default(0),
  })),
});

// ── Season SPO Schemas ──

export const seasonSpoBulkSaveSchema = z.object({
  contractId: z.string().min(1),
  spoType: z.enum(["RATE_OVERRIDE", "BOOKING_WINDOW", "PERCENTAGE"]),
  items: z.array(z.object({
    id: z.string().nullish(),
    dateFrom: z.string().min(1),
    dateTo: z.string().min(1),
    basePp: z.number().nullish(),
    sglSup: z.number().nullish(),
    thirdAdultRed: z.number().nullish(),
    firstChildPct: z.number().nullish(),
    secondChildPct: z.number().nullish(),
    bookFrom: z.string().nullish(),
    bookTo: z.string().nullish(),
    value: z.number().nullish(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).nullish(),
    active: z.boolean().default(true),
  })),
});

// ── Allotment Schemas ──

export const allotmentBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    roomTypeId: z.string().min(1),
    seasonId: z.string().nullish(),
    basis: z.enum(["FREESALE", "ON_REQUEST", "COMMITMENT", "ALLOCATION"]).default("ALLOCATION"),
    totalRooms: z.number().int().min(0),
    freeSale: z.boolean().default(false),
  })),
});

// ── Stop Sale Schemas ──

export const stopSaleCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  roomTypeId: z.string().nullish(),
  dateFrom: z.string().min(1, "Date from is required"),
  dateTo: z.string().min(1, "Date to is required"),
  reason: z.string().nullish(),
}).refine((d) => d.dateTo >= d.dateFrom, {
  message: "Date To must be on or after Date From",
  path: ["dateTo"],
});

// ── Marketing Contribution ──

export const marketingContributionCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  marketId: z.string().nullish(),
  seasonId: z.string().nullish(),
  valueType: z.enum(["FIXED", "PERCENTAGE"]).default("PERCENTAGE"),
  value: z.number().min(0, "Value must be >= 0"),
  notes: z.string().nullish(),
});

export const marketingContributionUpdateSchema = z.object({
  marketId: z.string().nullable().optional(),
  seasonId: z.string().nullable().optional(),
  valueType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  value: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
});

// ── Contract Cloning ──

export const contractCloneSchema = z.object({
  sourceContractId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(100),
  validFrom: z.string().min(1, "Valid From is required"),
  validTo: z.string().min(1, "Valid To is required"),
  // Enhanced copy options
  rateMode: z.enum(["FREEZE", "INCREASE", "DECREASE", "AVERAGE"]).default("FREEZE"),
  ratePercent: z.number().min(0).max(100).optional(),
  averageContractIds: z.array(z.string()).optional(),
  dateShift: z.boolean().default(false),
  selectiveEntities: z.object({
    seasons: z.boolean().default(true),
    roomTypes: z.boolean().default(true),
    mealBases: z.boolean().default(true),
    baseRates: z.boolean().default(true),
    supplements: z.boolean().default(true),
    specialOffers: z.boolean().default(true),
    allotments: z.boolean().default(true),
    stopSales: z.boolean().default(true),
    childPolicies: z.boolean().default(true),
    cancellationPolicies: z.boolean().default(true),
    specialMeals: z.boolean().default(true),
    markets: z.boolean().default(true),
    tourOperators: z.boolean().default(true),
    seasonSpos: z.boolean().default(true),
    marketingContributions: z.boolean().default(true),
  }).optional(),
}).refine((d) => d.validTo > d.validFrom, {
  message: "Valid To must be after Valid From",
  path: ["validTo"],
}).refine((d) => {
  if ((d.rateMode === "INCREASE" || d.rateMode === "DECREASE") && !d.ratePercent) {
    return false;
  }
  return true;
}, {
  message: "Rate percent is required for INCREASE/DECREASE modes",
  path: ["ratePercent"],
}).refine((d) => {
  if (d.rateMode === "AVERAGE" && (!d.averageContractIds || d.averageContractIds.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "At least one contract must be selected for AVERAGE mode",
  path: ["averageContractIds"],
});

// ── Market Schemas ──

export const marketCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  countryIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const marketUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(10).optional(),
  countryIds: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
});

// ── Tour Operator Schemas ──

export const tourOperatorCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  countryId: z.string().optional(),
  marketId: z.string().optional(),
  active: z.boolean().default(true),
});

export const tourOperatorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(20).optional(),
  contactPerson: z.string().nullable().optional(),
  email: z.string().email().optional().or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  countryId: z.string().nullable().optional(),
  marketId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

// ── Markup Rules ──

export const markupRuleCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  markupType: z.enum(["PERCENTAGE", "FIXED_PER_NIGHT", "FIXED_PER_BOOKING"]),
  value: z.number().min(0, "Value must be >= 0"),
  contractId: z.string().optional(),
  hotelId: z.string().optional(),
  destinationId: z.string().optional(),
  marketId: z.string().optional(),
  tourOperatorId: z.string().optional(),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

export const markupRuleUpdateSchema = markupRuleCreateSchema.partial();

// ── Tariff ──

export const tariffGenerateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contractId: z.string().min(1, "Contract is required"),
  tourOperatorId: z.string().min(1, "Tour Operator is required"),
  markupRuleId: z.string().optional(),
  currencyCode: z.string().min(1, "Currency is required"),
});

// ── Special Meals ──

export const specialMealCreateSchema = z.object({
  contractId: z.string().min(1),
  occasion: z.enum(["NYE", "CHRISTMAS", "EASTER", "CUSTOM"]),
  customName: z.string().optional(),
  dateFrom: z.string().min(1, "Date from is required"),
  dateTo: z.string().min(1, "Date to is required"),
  mandatory: z.boolean().default(true),
  adultPrice: z.number().min(0, "Price must be >= 0"),
  childPrice: z.number().min(0).optional(),
  teenPrice: z.number().min(0).optional(),
  infantPrice: z.number().min(0).optional(),
  excludedMealBases: z.string().optional(),
  notes: z.string().optional(),
}).refine((d) => d.dateTo >= d.dateFrom, {
  message: "Date To must be on or after Date From",
  path: ["dateTo"],
});

export const specialMealUpdateSchema = z.object({
  occasion: z.enum(["NYE", "CHRISTMAS", "EASTER", "CUSTOM"]).optional(),
  customName: z.string().nullable().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  mandatory: z.boolean().optional(),
  adultPrice: z.number().min(0).optional(),
  childPrice: z.number().min(0).nullable().optional(),
  teenPrice: z.number().min(0).nullable().optional(),
  infantPrice: z.number().min(0).nullable().optional(),
  excludedMealBases: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Contract Child Policies ──

export const contractChildPolicyCreateSchema = z.object({
  contractId: z.string().min(1),
  category: z.enum(["INFANT", "CHILD", "TEEN"]),
  ageFrom: z.number().int().min(0),
  ageTo: z.number().int().min(0),
  label: z.string().min(1, "Label is required"),
  freeInSharing: z.boolean().default(false),
  maxFreePerRoom: z.number().int().min(0).default(0),
  extraBedAllowed: z.boolean().default(true),
  mealsIncluded: z.boolean().default(false),
  notes: z.string().nullish(),
}).refine((d) => d.ageTo >= d.ageFrom, {
  message: "Age To must be >= Age From",
  path: ["ageTo"],
});

export const contractChildPolicyUpdateSchema = z.object({
  id: z.string().min(1),
  contractId: z.string().min(1),
  ageFrom: z.number().int().min(0).optional(),
  ageTo: z.number().int().min(0).optional(),
  label: z.string().min(1).optional(),
  freeInSharing: z.boolean().optional(),
  maxFreePerRoom: z.number().int().min(0).optional(),
  extraBedAllowed: z.boolean().optional(),
  mealsIncluded: z.boolean().optional(),
  notes: z.string().nullish(),
});

// ── Cancellation Policies ──

export const cancellationPolicyCreateSchema = z.object({
  contractId: z.string().min(1),
  daysBefore: z.number().int().min(0, "Days must be 0 or more"),
  chargeType: z.enum(["PERCENTAGE", "FIXED", "FIRST_NIGHT"]),
  chargeValue: z.number().min(0),
  description: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export const cancellationPolicyUpdateSchema = z.object({
  id: z.string().min(1),
  daysBefore: z.number().int().min(0).optional(),
  chargeType: z.enum(["PERCENTAGE", "FIXED", "FIRST_NIGHT"]).optional(),
  chargeValue: z.number().min(0).optional(),
  description: z.string().nullish(),
  sortOrder: z.number().int().optional(),
});
