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
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
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
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().min(1, "Code is required").max(20).optional(),
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
});

export const contractBaseRateBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  rates: z.array(contractBaseRateSchema),
});

// ── Supplement Schemas ──

export const supplementRoomTypeBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    seasonId: z.string().min(1),
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
    seasonId: z.string().min(1),
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
    seasonId: z.string().min(1),
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
    seasonId: z.string().min(1),
    forChildCategory: z.enum(["INFANT", "CHILD", "TEEN"]),
    forChildBedding: z.enum(["SHARING_WITH_PARENTS", "EXTRA_BED", "OWN_BED"]),
    value: z.number(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    perNight: z.boolean().default(true),
  })),
});

export const supplementExtraBedBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    seasonId: z.string().min(1),
    value: z.number(),
    valueType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    perNight: z.boolean().default(true),
  })),
});

export const supplementViewCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  seasonId: z.string().min(1, "Season is required"),
  label: z.string().min(1, "Label is required"),
  value: z.number(),
  valueType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
  perPerson: z.boolean().default(true),
  perNight: z.boolean().default(true),
  notes: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export const supplementViewUpdateSchema = z.object({
  label: z.string().min(1, "Label is required").optional(),
  seasonId: z.string().min(1).optional(),
  value: z.number().optional(),
  valueType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  perPerson: z.boolean().optional(),
  perNight: z.boolean().optional(),
  notes: z.string().nullish(),
  sortOrder: z.number().int().optional(),
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
    bedding: z.enum(["SHARING_WITH_PARENTS", "EXTRA_BED", "OWN_BED"]),
  })).default([]),
  extraBed: z.boolean().default(false),
  viewLabel: z.string().nullish(),
  nights: z.number().int().min(1).default(1),
  bookingDate: z.string().nullish(),
  checkInDate: z.string().nullish(),
});

export const rateSheetInputSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
});

// ── Special Offer Schemas ──

export const specialOfferCreateSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  name: z.string().min(1, "Name is required"),
  offerType: z.enum(["EARLY_BIRD", "LONG_STAY", "FREE_NIGHTS", "HONEYMOON", "GROUP_DISCOUNT"]),
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
});

export const specialOfferUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  offerType: z.enum(["EARLY_BIRD", "LONG_STAY", "FREE_NIGHTS", "HONEYMOON", "GROUP_DISCOUNT"]).optional(),
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
  combinable: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ── Allotment Schemas ──

export const allotmentBulkSaveSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  items: z.array(z.object({
    seasonId: z.string().min(1),
    roomTypeId: z.string().min(1),
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

// ── Contract Cloning ──

export const contractCloneSchema = z.object({
  sourceContractId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(100),
  validFrom: z.string().min(1, "Valid From is required"),
  validTo: z.string().min(1, "Valid To is required"),
}).refine((d) => d.validTo > d.validFrom, {
  message: "Valid To must be after Valid From",
  path: ["validTo"],
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

// Keep the old name as alias for backwards compatibility during transition
export const contractChildPolicyUpsertSchema = contractChildPolicyCreateSchema;

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
