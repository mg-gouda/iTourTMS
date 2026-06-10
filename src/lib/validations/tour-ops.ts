import { z } from "zod";

// ── File Schemas ──

export const opsFileCreateSchema = z.object({
  clientType: z.enum(["B2C", "TOUR_OPERATOR", "TRAVEL_AGENT"]).default("B2C"),
  customerId: z.string().optional().or(z.literal("")),
  tourOperatorId: z.string().optional().or(z.literal("")),
  guestName: z.string().optional().or(z.literal("")),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional().or(z.literal("")),
  travelFrom: z.string().min(1, "Travel start date is required"),
  travelTo: z.string().min(1, "Travel end date is required"),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  notes: z.string().optional().or(z.literal("")),
});

export const opsFileUpdateSchema = opsFileCreateSchema.partial();

// ── Package Schemas ──

export const opsPackageCreateSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  description: z.string().optional().or(z.literal("")),
  fileId: z.string().optional().or(z.literal("")),
  isTemplate: z.boolean().default(false),
  baseCurrency: z.string().default("USD"),
  notes: z.string().optional().or(z.literal("")),
});

export const opsPackageUpdateSchema = opsPackageCreateSchema.partial();

// ── Component Schemas ──

export const opsComponentSchema = z.object({
  type: z.enum([
    "ACCOMMODATION",
    "TRANSFER",
    "EXCURSION",
    "FLIGHT",
    "MEET_ASSIST",
    "NILE_CRUISE",
    "GUIDANCE",
    "MEAL",
    "PORTERAGE",
    "TIPPING",
    "FELUCCA",
    "CARRIAGE",
    "MISC",
  ]),
  description: z.string().min(1, "Description is required"),
  supplierId: z.string().optional().or(z.literal("")),
  serviceDate: z.string().optional().or(z.literal("")),
  pricingBasis: z.enum(["PER_PERSON", "BULK"]).default("PER_PERSON"),
  nights: z.number().int().min(1).default(1),
  qty: z.number().min(0).default(1),
  unitCost: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  exchangeRate: z.number().min(0).default(1),
  markupType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  markupValue: z.number().min(0).default(0),
  mgmtFeeType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  mgmtFeeValue: z.number().min(0).default(0),
  refModuleEntityId: z.string().optional().or(z.literal("")),
  refModuleEntityType: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
});

export const opsComponentBulkSaveSchema = z.object({
  packageId: z.string().min(1),
  components: z.array(opsComponentSchema),
});

// ── Quotation Schemas ──

export const opsQuotationCreateSchema = z.object({
  fileId: z.string().min(1, "File is required"),
  packageId: z.string().min(1, "Package is required"),
  clientType: z.enum(["B2C", "TOUR_OPERATOR", "TRAVEL_AGENT"]).default("B2C"),
  validUntil: z.string().optional().or(z.literal("")),
  packageMarkupType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  packageMarkupValue: z.number().min(0).optional(),
  notes: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
});

export const opsQuotationUpdateSchema = opsQuotationCreateSchema.partial();

// ── Master Data Schemas ──

export const opsTransportDestinationCreateSchema = z.object({
  code: z.string().min(1, "Code is required").max(6),
  nameEn: z.string().min(1, "Name is required"),
  nameAr: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
});
export const opsTransportDestinationUpdateSchema = opsTransportDestinationCreateSchema.partial();

export const opsTransportRouteCreateSchema = z.object({
  destinationId: z.string().min(1, "Destination is required"),
  nameEn: z.string().min(1, "Route name is required"),
  nameAr: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
});
export const opsTransportRouteUpdateSchema = opsTransportRouteCreateSchema.partial();

export const opsTransportRateSchema = z.object({
  vehicleType: z.enum(["SEDAN", "VAN_11", "VAN_16", "BUS_25", "BUS_45"]),
  rentEGP: z.number().min(0).default(0),
  tipEGP: z.number().min(0).default(0),
  repAllowEGP: z.number().min(0).default(0),
});

export const opsTransportSeasonCreateSchema = z.object({
  routeId: z.string().min(1),
  name: z.string().min(1, "Season name is required"),
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(true),
  rates: z.array(opsTransportRateSchema),
});
export const opsTransportSeasonUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isActive: z.boolean().optional(),
  rates: z.array(opsTransportRateSchema).optional(),
});

export const opsSightseeingEntryCreateSchema = z.object({
  destinationCode: z.string().min(1, "Destination is required"),
  nameEn: z.string().min(1, "Name is required"),
  nameAr: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
});
export const opsSightseeingEntryUpdateSchema = opsSightseeingEntryCreateSchema.partial();

export const opsSightseeingSeasonCreateSchema = z.object({
  entryId: z.string().min(1),
  name: z.string().min(1, "Season name is required"),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  isActive: z.boolean().default(true),
  priceEGP: z.number().min(0).default(0),
});
export const opsSightseeingSeasonUpdateSchema = opsSightseeingSeasonCreateSchema.partial().omit({ entryId: true });

export const opsGuidanceRateCreateSchema = z.object({
  destinationCode: z.string().min(1, "Destination is required"),
  guideType: z.enum(["LOCAL_GUIDE", "TOUR_MANAGER", "EGYPTOLOGIST", "REP"]),
  currency: z.string().default("EGP"),
});
export const opsGuidanceRateUpdateSchema = opsGuidanceRateCreateSchema.partial();

export const opsGuidanceSeasonCreateSchema = z.object({
  guidanceId: z.string().min(1),
  name: z.string().min(1),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  isActive: z.boolean().default(true),
  pricePerDay: z.number().min(0).default(0),
});
export const opsGuidanceSeasonUpdateSchema = opsGuidanceSeasonCreateSchema.partial().omit({ guidanceId: true });

export const opsMealRateCreateSchema = z.object({
  supplierId: z.string().optional().or(z.literal("")),
  nameEn: z.string().min(1, "Name is required"),
  destinationCode: z.string().optional().or(z.literal("")),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "HALF_BOARD", "FULL_BOARD"]),
  currency: z.string().default("EGP"),
});
export const opsMealRateUpdateSchema = opsMealRateCreateSchema.partial();

export const opsMealSeasonCreateSchema = z.object({
  mealRateId: z.string().min(1),
  name: z.string().min(1),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  isActive: z.boolean().default(true),
  pricePerPax: z.number().min(0).default(0),
});
export const opsMealSeasonUpdateSchema = opsMealSeasonCreateSchema.partial().omit({ mealRateId: true });
